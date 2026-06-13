import { describe, expect, it } from 'vitest';
import {
  buildBrowserTtsPlaybackPlan,
  type BrowserTtsChunkPlanner,
  type BrowserTtsPlaybackPlanInput,
} from '../src/app/browserTtsPlaybackPlan';
import { AdaptiveDictationController } from '../src/core/adaptive/AdaptiveDictationController';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type {
  HistoricalPerformanceProfile,
  InputLanguageBenchmarkMetrics,
  PacingDecision,
} from '../src/core/adaptive/types';
import type { AttemptEvaluation } from '../src/core/evaluation';
import type { TtsLiveSignal } from '../src/app/ttsPlaybackProfile';
import { resolveBrowserTtsAdaptiveProfile } from '../src/inputs/browserTts/browserTtsAdaptiveProfiles';
import type { BrowserTtsDeRecoveryState } from '../src/inputs/browserTts/browserTtsRecoveryPolicy';
import type {
  PlanBrowserTtsChunkInput,
  PlannedBrowserTtsChunk,
  SupportedLanguage,
} from '../src/inputs/browserTts/ttsDynamicChunkPlanner';

const desktopNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0 Safari/537.36',
  platform: 'Win32',
  maxTouchPoints: 0,
};

const androidNavigator = {
  userAgent: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S901B) AppleWebKit/537.36 Chrome/123.0 Mobile Safari/537.36',
  platform: 'Linux armv8l',
  maxTouchPoints: 5,
};

function decision(overrides: Partial<PacingDecision> = {}): PacingDecision {
  return {
    mode: 'balanced',
    playbackRate: 0.95,
    pauseAfterPhraseMs: 750,
    shouldPauseNow: false,
    shouldReplayPhrase: false,
    boundaryStrictness: 'sentence',
    allowMidPhrasePause: false,
    deferPauseUntilSafeBoundary: false,
    replayRate: 0.9,
    nextPhraseSize: 'medium',
    reason: 'mode=balanced',
    lagScore: 0.7,
    accuracyScore: 0.9,
    hesitationScore: 0.8,
    confidenceScore: 0.7,
    ...overrides,
  };
}

function historyProfile(overrides: Partial<HistoricalPerformanceProfile> = {}): HistoricalPerformanceProfile {
  return {
    language: 'en',
    inputMode: 'browser-tts',
    comfortablePlaybackRate: 0.95,
    averageWpm: 50,
    averageAccuracy: 0.9,
    averageLagSec: 0.5,
    averagePauseMs: 750,
    preferredPhraseSize: 'medium',
    preferredPauseAfterPhraseMs: 750,
    typicalBackspaceRate: 0,
    typicalCorrectionRate: 0,
    strugglesWithLongPhrases: false,
    strugglesWithNumbers: false,
    strugglesWithNames: false,
    strugglesWithPunctuation: false,
    improvementTrend: 'stable',
    sessionsCount: 4,
    profileConfidence: 0.7,
    ...overrides,
  };
}

function liveSignal(overrides: Partial<TtsLiveSignal> = {}): TtsLiveSignal {
  return {
    accuracy: 96,
    lagSec: 0.4,
    rawLagSec: 0.4,
    stableLagSec: 0.4,
    lagOutlierCount: 0,
    wpm: 52,
    trend: 'stable',
    controllerState: 'hold',
    ...overrides,
  };
}

function attempt(overrides: Partial<AttemptEvaluation> = {}): AttemptEvaluation {
  return {
    typedWords: ['we', 'listen'],
    targetWords: ['we', 'listen'],
    alignedPairs: [
      { typedIndex: 0, targetIndex: 0, exact: true },
      { typedIndex: 1, targetIndex: 1, exact: true },
    ],
    matchedWords: 2,
    missedWords: 0,
    extraWords: 0,
    accuracy: 100,
    points: 2,
    lastMatchedTargetIndex: 1,
    ...overrides,
  };
}

function recovery(overrides: Partial<BrowserTtsDeRecoveryState> = {}): BrowserTtsDeRecoveryState {
  return {
    active: false,
    level: 'none',
    validCompletedSampleCount: 0,
    pressureSampleCount: 0,
    highLagSampleCount: 0,
    lowAccuracySampleCount: 0,
    recentOutlierDiagnosticCount: 0,
    ...overrides,
  };
}

function benchmark(language: SupportedLanguage): InputLanguageBenchmarkMetrics {
  return createEmptyInputLanguageBenchmark('browser-tts', language);
}

function chunk(overrides: Partial<PlannedBrowserTtsChunk> = {}): PlannedBrowserTtsChunk {
  const text = overrides.text ?? 'We listen carefully.';
  const wordCount = overrides.wordCount ?? text.split(/\s+/).length;
  return {
    text,
    startWordIndex: overrides.startWordIndex ?? 0,
    wordCount,
    phraseBoundaryType: overrides.phraseBoundaryType ?? 'sentence',
    canPauseAfter: overrides.canPauseAfter ?? true,
    canReplayIndependently: false,
    semanticCompleteness: overrides.semanticCompleteness ?? 1,
    punctuationLoad: overrides.punctuationLoad ?? 0.1,
    rareWordLoad: overrides.rareWordLoad ?? 0,
    syntaxComplexity: overrides.syntaxComplexity ?? 0.1,
    phraseDifficulty: overrides.phraseDifficulty ?? 0.2,
  };
}

function input(overrides: Partial<BrowserTtsPlaybackPlanInput> = {}): BrowserTtsPlaybackPlanInput {
  const language = overrides.language ?? 'en';
  const macroWords = overrides.macroWords ?? 'We listen carefully, then we type the sentence.'.split(' ');
  const base: BrowserTtsPlaybackPlanInput = {
    macroWords,
    macroWordOffset: 0,
    macroStartWordIndex: 0,
    language,
    lastPhraseSize: 'medium',
    lastBoundaryStrictness: 'sentence',
    liveSignal: liveSignal(),
    livePracticeEvaluation: attempt(),
    browserTtsProfile: resolveBrowserTtsAdaptiveProfile(language),
    browserTtsBenchmark: benchmark(language),
    browserTtsRecovery: recovery(),
    ttsSpeechRate: 1,
    ttsPlaybackPauseMs: 260,
    adaptiveController: {
      decide: () => decision(),
    },
    historyProfile: historyProfile({ language }),
    sourceWordCount: macroWords.length,
    estimatedSpokenWordIndex: 0,
    chunkIndex: 0,
    unsafeChunkCount: 0,
    accuracyWindow: [],
    lastAccuracySnapshot: { typedWords: 0, matchedWords: 0 },
    navigatorInfo: desktopNavigator,
  };

  return {
    ...base,
    ...overrides,
  };
}

describe('buildBrowserTtsPlaybackPlan', () => {
  it('builds a normal chunk plan from word 0', () => {
    const plan = buildBrowserTtsPlaybackPlan(input());

    expect(plan).not.toBeNull();
    expect(plan?.chunk.startWordIndex).toBe(0);
    expect(plan?.chunk.wordCount).toBeGreaterThan(0);
    expect(plan?.runtimeDecision.playbackRate).toBe(0.95);
    expect(plan?.pacingMode).toBe('balanced');
    expect(plan?.browserTelemetry.phraseId).toBe('tts-0');
    expect(plan?.chunkTelemetry.phraseId).toBe('tts-0-chunk');
  });

  it('falls back to a short phrase candidate when the primary candidate is null', () => {
    const calls: PlanBrowserTtsChunkInput[] = [];
    const fallbackChunk = chunk({ text: 'Short fallback.', wordCount: 2 });
    const planner: BrowserTtsChunkPlanner = (plannerInput) => {
      calls.push(plannerInput);
      if (calls.length === 1) return null;
      if (calls.length === 2) return fallbackChunk;
      return null;
    };

    const plan = buildBrowserTtsPlaybackPlan(input({ chunkPlanner: planner }));

    expect(plan?.candidateChunk).toBe(fallbackChunk);
    expect(plan?.chunk).toBe(fallbackChunk);
    expect(calls[0].nextPhraseSize).toBe('medium');
    expect(calls[1].nextPhraseSize).toBe('short');
    expect(calls[1].boundaryStrictness).toBe('phrase');
  });

  it('uses German recovery-safe chunks when strong DE recovery is active', () => {
    const plan = buildBrowserTtsPlaybackPlan(input({
      language: 'de',
      macroWords: 'Wir hoeren den ersten Satz. Danach schreiben wir langsam weiter.'.split(' '),
      liveSignal: liveSignal({ accuracy: 78, lagSec: 3.2, rawLagSec: 3.2, stableLagSec: 3.2 }),
      browserTtsProfile: resolveBrowserTtsAdaptiveProfile('de'),
      browserTtsBenchmark: benchmark('de'),
      browserTtsRecovery: recovery({ active: true, level: 'strong', shortChunkWordCap: 4 }),
      adaptiveController: {
        decide: () => decision({ mode: 'support', reason: 'mode=support, support-needed', nextPhraseSize: 'short' }),
      },
    }));

    expect(plan?.recoverySafeBoundary).toBe(true);
    expect(plan?.chunk.wordCount).toBe(5);
    expect(plan?.chunk.phraseBoundaryType).toBe('sentence');
    expect(plan?.runtimeDecision.reason).toContain('browser-tts-de-recovery-strong');
    expect(plan?.runtimeDecision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(2600);
  });

  it('applies the runtime rate floor', () => {
    const plan = buildBrowserTtsPlaybackPlan(input({
      adaptiveController: {
        decide: () => decision({ mode: 'balanced', playbackRate: 0.5, replayRate: 0.5 }),
      },
    }));

    expect(plan?.runtimeDecision.playbackRate).toBe(0.8);
  });

  it('applies the unsafe-boundary conservative policy', () => {
    const unsafeChunk = chunk({
      text: 'we go to',
      wordCount: 3,
      phraseBoundaryType: 'unsafe',
      canPauseAfter: false,
      semanticCompleteness: 0.35,
    });
    const planner: BrowserTtsChunkPlanner = () => unsafeChunk;

    const plan = buildBrowserTtsPlaybackPlan(input({
      ttsSpeechRate: 0.84,
      chunkPlanner: planner,
      adaptiveController: {
        decide: () => decision({ playbackRate: 1, replayRate: 0.95, pauseAfterPhraseMs: 500 }),
      },
    }));

    expect(plan?.unsafeBoundaryApplied).toBe(true);
    expect(plan?.runtimeDecision.playbackRate).toBe(0.84);
    expect(plan?.runtimeDecision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(1200);
    expect(plan?.runtimeDecision.reason).toContain('unsafe-boundary-conservative');
    expect(plan?.chunkTelemetry.unsafeChunkCount).toBe(1);
  });

  it('applies the Android mobile pacing fallback path', () => {
    const plan = buildBrowserTtsPlaybackPlan(input({
      liveSignal: liveSignal({ accuracy: 86, lagSec: 2.1, rawLagSec: 2.1, stableLagSec: 2.1 }),
      navigatorInfo: androidNavigator,
      adaptiveController: {
        decide: () => decision({ playbackRate: 1, replayRate: 0.95, pauseAfterPhraseMs: 750 }),
      },
    }));

    expect(plan?.mobileFallbackApplied).toBe(true);
    expect(plan?.runtimeDecision.nextPhraseSize).toBe('short');
    expect(plan?.runtimeDecision.shouldPauseNow).toBe(true);
    expect(plan?.runtimeDecision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(1600);
    expect(plan?.runtimeDecision.reason).toContain('android-speech-rate-fallback');
  });

  it('clamps decisions through the DE benchmark recommendation', () => {
    const deBenchmark = {
      ...benchmark('de'),
      recommendation: {
        ...benchmark('de').recommendation,
        targetRateRange: [0.8, 0.84] as [number, number],
      },
    };

    const plan = buildBrowserTtsPlaybackPlan(input({
      language: 'de',
      browserTtsProfile: resolveBrowserTtsAdaptiveProfile('de'),
      browserTtsBenchmark: deBenchmark,
      adaptiveController: {
        decide: () => decision({
          mode: 'flow',
          playbackRate: 1.1,
          replayRate: 1.05,
          nextPhraseSize: 'long',
          boundaryStrictness: 'phrase',
          reason: 'mode=flow',
        }),
      },
    }));

    expect(plan?.runtimeDecision.playbackRate).toBe(0.85);
    expect(plan?.runtimeDecision.replayRate).toBe(0.85);
    expect(plan?.runtimeDecision.reason).toContain('de-target-rate-clamp');
  });

  it('computes listening precision for Browser TTS chunk telemetry', () => {
    const targetChunk = chunk({
      text: 'We listen carefully.',
      wordCount: 3,
    });
    const planner: BrowserTtsChunkPlanner = () => targetChunk;

    const plan = buildBrowserTtsPlaybackPlan(input({
      chunkPlanner: planner,
      livePracticeEvaluation: attempt({
        typedWords: ['we', 'carefully'],
        targetWords: ['we', 'listen', 'carefully'],
        alignedPairs: [
          { typedIndex: 0, targetIndex: 0, exact: true },
          { typedIndex: 1, targetIndex: 2, exact: true },
        ],
        matchedWords: 2,
        missedWords: 1,
        extraWords: 0,
        accuracy: 100,
        points: 2,
        lastMatchedTargetIndex: 2,
      }),
    }));

    expect(plan?.browserTelemetry.listeningPrecision?.omissionRate).toBeCloseTo(0.3333, 4);
    expect(plan?.browserTelemetry.listeningPrecision?.contentWordRecall).toBeLessThan(1);
    expect(plan?.chunkTelemetry.listeningPrecision?.omissionRate).toBeCloseTo(0.3333, 4);
  });

  it('feeds Browser TTS listening precision into the adaptive controller', () => {
    const targetChunk = chunk({
      text: 'We listen carefully.',
      wordCount: 3,
    });
    const planner: BrowserTtsChunkPlanner = () => targetChunk;
    const controller = new AdaptiveDictationController();

    const plan = buildBrowserTtsPlaybackPlan(input({
      chunkIndex: 8,
      chunkPlanner: planner,
      browserTtsBenchmark: undefined,
      liveSignal: liveSignal({ accuracy: 99, lagSec: 0.2, rawLagSec: 0.2, stableLagSec: 0.2, wpm: 64 }),
      livePracticeEvaluation: attempt({
        typedWords: ['we', 'carefully'],
        targetWords: ['we', 'listen', 'carefully'],
        alignedPairs: [
          { typedIndex: 0, targetIndex: 0, exact: true },
          { typedIndex: 1, targetIndex: 2, exact: true },
        ],
        matchedWords: 2,
        missedWords: 1,
        extraWords: 0,
        accuracy: 100,
        points: 2,
        lastMatchedTargetIndex: 2,
      }),
      adaptiveController: controller,
      historyProfile: historyProfile({
        comfortablePlaybackRate: 1.1,
        averageAccuracy: 0.9,
        averageLagSec: 0.2,
        averageWpm: 50,
        sessionsCount: 8,
        profileConfidence: 0.9,
      }),
    }));

    expect(plan?.runtimeDecision.reason).toContain('listening-precision-rate-ceiling');
    expect(plan?.runtimeDecision.playbackRate).toBeLessThanOrEqual(0.92);
  });

  it('returns null when no candidate chunk can be planned', () => {
    const plan = buildBrowserTtsPlaybackPlan(input({
      macroWords: [],
      sourceWordCount: 0,
    }));

    expect(plan).toBeNull();
  });
});
