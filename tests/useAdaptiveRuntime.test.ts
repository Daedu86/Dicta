// @vitest-environment jsdom
import { act, createElement, useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAdaptiveBrowserTtsInput } from '../src/inputs/browserTts/browserTtsTelemetryAdapter';
import { buildAdaptiveKokoroInput } from '../src/inputs/kokoro/kokoroTelemetryAdapter';
import {
  useAdaptiveRuntime,
  type AdaptiveRuntime,
  type AdaptiveRuntimeSessionInput,
} from '../src/app/useAdaptiveRuntime';
import type {
  AdaptiveSessionFeedback,
  InputLanguageBenchmarkMetrics,
  LiveTelemetryFrame,
  PacingDecision,
} from '../src/core/adaptive/types';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
  BenchmarkLanguageButton,
} from '../src/components/openrouter/types';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

type HarnessSnapshot = {
  runtime: AdaptiveRuntime;
  benchmarks: AdaptiveBenchmarksByInputLanguage;
  feedback: AdaptiveSessionFeedbackByInputLanguage;
  persistedFeedback: AdaptiveSessionFeedbackByInputLanguage[];
  setSelectedLanguage: (language: BenchmarkLanguageButton) => void;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-04T12:00:00.000Z'));
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
  vi.useRealTimers();
});

async function flushReactWork(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

function renderHarness(options: {
  activeSession?: AdaptiveRuntimeSessionInput | null;
  sessions?: AdaptiveRuntimeSessionInput[];
  initialBenchmarks?: AdaptiveBenchmarksByInputLanguage;
  initialFeedback?: AdaptiveSessionFeedbackByInputLanguage;
} = {}): { read: () => HarnessSnapshot } {
  let snapshot: HarnessSnapshot | null = null;
  const persistedFeedback: AdaptiveSessionFeedbackByInputLanguage[] = [];

  function Harness() {
    const [benchmarks, setBenchmarks] = useState<AdaptiveBenchmarksByInputLanguage>(options.initialBenchmarks ?? {});
    const [feedback, setFeedback] = useState<AdaptiveSessionFeedbackByInputLanguage>(options.initialFeedback ?? {});
    const [selectedLanguage, setSelectedLanguage] = useState<BenchmarkLanguageButton>('de');
    const benchmarksRef = useRef(benchmarks);
    const feedbackRef = useRef(feedback);

    useEffect(() => {
      benchmarksRef.current = benchmarks;
    }, [benchmarks]);

    useEffect(() => {
      feedbackRef.current = feedback;
    }, [feedback]);

    const runtime = useAdaptiveRuntime({
      activeSession: options.activeSession ?? null,
      activeSessionId: options.activeSession?.id ?? '',
      sessions: options.sessions ?? (options.activeSession ? [options.activeSession] : []),
      adaptiveBenchmarks: benchmarks,
      setAdaptiveBenchmarks: setBenchmarks,
      adaptiveBenchmarksRef: benchmarksRef,
      adaptiveSessionFeedback: feedback,
      setAdaptiveSessionFeedback: setFeedback,
      adaptiveSessionFeedbackRef: feedbackRef,
      persistAdaptiveSessionFeedbackNow: (nextFeedback) => {
        persistedFeedback.push(nextFeedback);
      },
      selectedBenchmarkLanguage: selectedLanguage,
      setSelectedBenchmarkLanguage: setSelectedLanguage,
    });

    snapshot = {
      runtime,
      benchmarks,
      feedback,
      persistedFeedback,
      setSelectedLanguage,
    };
    return null;
  }

  act(() => {
    root.render(createElement(Harness));
  });

  return {
    read: () => {
      if (!snapshot) throw new Error('Harness did not render.');
      return snapshot;
    },
  };
}

describe('useAdaptiveRuntime', () => {
  it('keeps controller and history refs stable while selected profile state changes', async () => {
    const harness = renderHarness({ activeSession: sessionFixture({ id: 'stable-session' }) });
    const initial = harness.read();
    const controllerRef = initial.runtime.adaptiveControllerRef;
    const historyRef = initial.runtime.historyServiceRef;

    await act(async () => {
      initial.runtime.setSelectedBenchmarkInputMode('browser-tts');
      initial.setSelectedLanguage('en');
    });
    await flushReactWork();

    const next = harness.read();
    expect(next.runtime.adaptiveControllerRef).toBe(controllerRef);
    expect(next.runtime.historyServiceRef).toBe(historyRef);
    expect(next.runtime.selectedBenchmarkInputMode).toBe('browser-tts');
    expect(next.runtime.selectedBenchmarkLanguage).toBe('en');
    expect(next.runtime.getHistoricalPerformanceProfile('browser-tts', 'de')).toMatchObject({
      inputMode: 'browser-tts',
      language: 'de',
      preferredPhraseSize: 'medium',
      profileConfidence: 0.2,
    });
  });

  it('applies live telemetry to the benchmark without changing the controller decision fields', async () => {
    const activeSession = sessionFixture({ id: 'high-accuracy-low-lag', inputMode: 'input2', ttsLanguage: 'de' });
    const harness = renderHarness({ activeSession, sessions: [activeSession] });
    const runtime = harness.read().runtime;
    const live = liveFrame({
      language: 'de',
      accuracy: 0.98,
      lagSec: 0.15,
      rawLagSec: 0.15,
      stableLagSec: 0.15,
      wpm: 72,
    });
    const history = runtime.getHistoricalPerformanceProfile('browser-tts', 'de');
    const decision = runtime.adaptiveControllerRef.current.decide(buildAdaptiveBrowserTtsInput(live, history));

    await act(async () => {
      runtime.recordAdaptiveBenchmark(live, decision, {
        actualPlaybackRate: decision.playbackRate,
        actualPauseMs: 0,
        event: 'phrase_advance',
        phraseIndex: 0,
        totalSemanticPhrases: 3,
      });
    });
    await flushReactWork();

    const point = latestTimelinePoint(harness.read().benchmarks, 'browser-tts', 'de');
    expect(point).toMatchObject({
      inputMode: 'browser-tts',
      language: 'de',
      mode: decision.mode,
      playbackRate: decision.playbackRate,
      pauseMs: decision.pauseAfterPhraseMs,
      decisionReason: decision.reason,
      event: 'phrase_advance',
      phraseIndex: 0,
      totalSemanticPhrases: 3,
      sessionId: activeSession.id,
    });
  });

  it('keeps benchmark replay fixtures isolated by inputMode and language', async () => {
    const activeSession = sessionFixture({ id: 'profile-switch-session', inputMode: 'input2', ttsLanguage: 'de' });
    const kokoroSession = sessionFixture({ id: 'kokoro-en-session', inputMode: 'input3', kokoroLanguage: 'en' });
    const harness = renderHarness({ activeSession, sessions: [activeSession, kokoroSession] });
    const runtime = harness.read().runtime;

    const browserDePressure = liveFrame({
      language: 'de',
      accuracy: 0.62,
      lagSec: 3.4,
      rawLagSec: 3.4,
      stableLagSec: 3.4,
      correctionRate: 0.22,
      phraseBoundaryType: 'unsafe',
      semanticCompleteness: 0.58,
    });
    const browserEnStable = liveFrame({
      language: 'en',
      accuracy: 0.97,
      lagSec: 0.2,
      rawLagSec: 0.2,
      stableLagSec: 0.2,
    });
    const kokoroEn = liveFrame({
      inputMode: 'kokoro',
      language: 'en',
      phraseId: 'kokoro-1',
      accuracy: 0.91,
      lagSec: 0.8,
      rawLagSec: 0.8,
      stableLagSec: 0.8,
      correctionRate: 0.04,
    });

    const pressureDecision = decisionFixture({
      mode: 'support',
      playbackRate: 0.85,
      pauseAfterPhraseMs: 1400,
      shouldPauseNow: true,
      shouldReplayPhrase: true,
      nextPhraseSize: 'short',
      reason: 'fixture recovery pressure',
    });
    const stableDecision = decisionFixture({ mode: 'flow', playbackRate: 1.08, nextPhraseSize: 'long', reason: 'fixture flow' });
    const kokoroDecision = runtime.adaptiveControllerRef.current.decide(
      buildAdaptiveKokoroInput(kokoroEn, runtime.getHistoricalPerformanceProfile('kokoro', 'en')),
    );

    await act(async () => {
      runtime.recordAdaptiveBenchmark(browserDePressure, pressureDecision, {
        actualPlaybackRate: 0.82,
        actualPauseMs: 1400,
        replayExecuted: false,
        event: 'replay',
        phraseIndex: 1,
        totalSemanticPhrases: 4,
      });
      vi.advanceTimersByTime(1);
      runtime.recordAdaptiveBenchmark(browserEnStable, stableDecision, {
        actualPlaybackRate: 1.08,
        actualPauseMs: 0,
        event: 'phrase_advance',
        phraseIndex: 0,
        totalSemanticPhrases: 2,
      });
      vi.advanceTimersByTime(1);
      runtime.recordAdaptiveBenchmark(kokoroEn, kokoroDecision, {
        actualPlaybackRate: kokoroDecision.playbackRate,
        actualPauseMs: kokoroDecision.pauseAfterPhraseMs,
        event: 'pause',
        phraseIndex: 0,
        totalSemanticPhrases: 1,
      });
    });
    await flushReactWork();

    const benchmarks = harness.read().benchmarks;
    expect(benchmarks['browser-tts']?.de?.timeline).toHaveLength(1);
    expect(benchmarks['browser-tts']?.en?.timeline).toHaveLength(1);
    expect(benchmarks.kokoro?.en?.timeline).toHaveLength(1);
    expect(benchmarks.kokoro?.de).toBeUndefined();
    expect(benchmarks['browser-tts']?.de?.timeline[0]).toMatchObject({
      event: 'replay',
      phraseIndex: 1,
    });
    expect(benchmarks['browser-tts']?.de?.timeline[0]?.decisionReason).toContain('fixture recovery pressure');
    expect(benchmarks['browser-tts']?.de?.timeline[0]?.decisionReason).toContain('rejected-benchmark-sample');
    expect(benchmarks['browser-tts']?.en?.timeline[0]?.decisionReason).toBe('fixture flow');
    expect(benchmarks.kokoro?.en?.timeline[0]?.inputMode).toBe('kokoro');
  });

  it('preserves session feedback orchestration and persisted payload bucket', async () => {
    const activeSession = sessionFixture({
      id: 'feedback-browser-tts-de',
      inputMode: 'input2',
      status: 'finished',
      ttsLanguage: 'de',
      sessionSource: 'dictationScript',
    });
    const harness = renderHarness({ activeSession, sessions: [activeSession] });
    const runtime = harness.read().runtime;
    const live = liveFrame({
      language: 'de',
      accuracy: 0.74,
      lagSec: 2.8,
      rawLagSec: 2.8,
      stableLagSec: 2.8,
      correctionRate: 0.18,
    });

    await act(async () => {
      runtime.beginAdaptiveSessionFeedback('browser-tts', 'de', 2);
      runtime.recordPhrasePlaybackEvent(
        'phrase_started',
        'browser-tts',
        'de',
        { id: 'phrase-1', text: 'Dies ist ein Test.', wordCount: 4, startWordIndex: 0, phraseDifficulty: 0.4 },
        0,
      );
      runtime.recordPhrasePlaybackEvent(
        'phrase_replayed',
        'browser-tts',
        'de',
        { id: 'phrase-1', text: 'Dies ist ein Test.', wordCount: 4, startWordIndex: 0, phraseDifficulty: 0.4 },
        0,
      );
      runtime.recordPhrasePlaybackEvent(
        'phrase_completed',
        'browser-tts',
        'de',
        { id: 'phrase-1', text: 'Dies ist ein Test.', wordCount: 4, startWordIndex: 0, phraseDifficulty: 0.4 },
        0,
      );
      runtime.recordAdaptiveBenchmark(live, decisionFixture({ mode: 'support', shouldReplayPhrase: true }), {
        replayExecuted: false,
        event: 'phrase_completed',
        phraseIndex: 0,
        totalSemanticPhrases: 2,
      });
    });
    await flushReactWork();

    await act(async () => {
      harness.read().runtime.completeAdaptiveSessionFeedback(activeSession);
    });
    await flushReactWork();

    const feedback = harness.read().feedback['browser-tts']?.de?.[0] as AdaptiveSessionFeedback | undefined;
    expect(feedback).toMatchObject({
      sessionId: activeSession.id,
      inputMode: 'browser-tts',
      language: 'de',
      sourceType: 'dictation_script',
      scriptTitle: 'Fixture Dictation Script',
      phraseStats: {
        totalPhrases: 2,
        completedPhrases: 1,
        replayCount: 1,
      },
    });
    expect(feedback?.benchmarkBefore?.inputMode).toBe('browser-tts');
    expect(feedback?.benchmarkAfter?.sampleCount).toBeGreaterThan(0);
    expect(harness.read().feedback['browser-tts']?.en).toBeUndefined();
    expect(harness.read().feedback.kokoro?.en).toBeUndefined();
    expect(harness.read().persistedFeedback.at(-1)?.['browser-tts']?.de?.[0]?.sessionId).toBe(activeSession.id);
  });
});

function liveFrame(overrides: Partial<LiveTelemetryFrame> = {}): LiveTelemetryFrame {
  return {
    inputMode: 'browser-tts',
    phraseId: 'tts-1',
    spokenProgressRatio: 0.5,
    typedProgressRatio: 0.48,
    lagSec: 0.4,
    lagWords: 1,
    lagChars: 5,
    rawLagSec: 0.4,
    stableLagSec: 0.4,
    lagOutlierCount: 0,
    accuracy: 0.94,
    errorRate: 0.06,
    wpm: 58,
    charsPerMinute: 280,
    pauseMs: 700,
    longestPauseMs: 900,
    backspaceRate: 0.02,
    correctionRate: 0.03,
    phraseDifficulty: 0.4,
    phraseLengthWords: 8,
    phraseLengthChars: 44,
    currentPlaybackRate: 1,
    currentPauseAfterPhraseMs: 700,
    language: 'de',
    trend: 'stable',
    phraseBoundaryType: 'clause',
    canPauseAfter: true,
    canReplayIndependently: false,
    semanticCompleteness: 0.9,
    punctuationLoad: 0.1,
    rareWordLoad: 0.1,
    syntaxComplexity: 0.3,
    ...overrides,
  };
}

function decisionFixture(overrides: Partial<PacingDecision> = {}): PacingDecision {
  return {
    mode: 'balanced',
    playbackRate: 1,
    pauseAfterPhraseMs: 700,
    shouldPauseNow: false,
    shouldReplayPhrase: false,
    boundaryStrictness: 'clause',
    allowMidPhrasePause: false,
    deferPauseUntilSafeBoundary: false,
    replayRate: 0.95,
    nextPhraseSize: 'medium',
    reason: 'fixture decision',
    lagScore: 0.5,
    accuracyScore: 0.9,
    hesitationScore: 0.2,
    confidenceScore: 0.8,
    ...overrides,
  };
}

function sessionFixture(overrides: Partial<AdaptiveRuntimeSessionInput> = {}): AdaptiveRuntimeSessionInput {
  return {
    id: 'session-fixture',
    createdAt: '2026-06-04T11:00:00.000Z',
    updatedAt: '2026-06-04T11:10:00.000Z',
    inputMode: 'input2',
    status: 'running',
    ttsText: 'Dies ist ein Test fuer die adaptive Laufzeit.',
    kokoroText: 'This is a Kokoro fixture.',
    kokoroChunks: [],
    ttsLanguage: 'de',
    kokoroLanguage: 'en',
    metrics: {
      rate: 1,
      wpm: 60,
      accuracy: 94,
      lagSec: 0.4,
      trend: 'stable',
      score: 91,
      points: 100,
    },
    telemetry: {
      finishedAt: '2026-06-04T11:10:00.000Z',
    },
    sessionSource: 'plainText',
    dictationScript: {
      title: 'Fixture Dictation Script',
      phrases: [{ id: 'phrase-1', text: 'Dies ist ein Test.' }, { id: 'phrase-2', text: 'Noch ein Satz.' }],
    },
    ttsEnvironment: null,
    ...overrides,
  };
}

function latestTimelinePoint(
  benchmarks: AdaptiveBenchmarksByInputLanguage,
  inputMode: string,
  language: string,
): InputLanguageBenchmarkMetrics['timeline'][number] {
  const timeline = benchmarks[inputMode]?.[language]?.timeline ?? [];
  const point = timeline[timeline.length - 1];
  if (!point) throw new Error(`Missing timeline point for ${inputMode}/${language}.`);
  return point;
}
