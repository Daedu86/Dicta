import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleBrowserTtsPlaybackLoopChunkEnd } from '../src/app/browserTtsPlaybackLoopCompletionHandler';
import {
  BROWSER_TTS_MIN_MENTAL_REST_MS,
  DEFAULT_BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS,
} from '../src/app/browserTtsNextChunkScheduler';
import type { LiveTelemetryFrame, PacingDecision } from '../src/core/adaptive/types';

type ChunkEndParams = Parameters<typeof handleBrowserTtsPlaybackLoopChunkEnd>[0];

function installWindowTimers(): void {
  vi.stubGlobal('window', {
    setTimeout: (callback: () => void, delayMs?: number) => setTimeout(callback, delayMs),
  });
}

function createTelemetry(overrides: Partial<LiveTelemetryFrame> = {}): LiveTelemetryFrame {
  return {
    inputMode: 'browser-tts',
    phraseId: 'phrase-0',
    spokenProgressRatio: 0.5,
    typedProgressRatio: 0.25,
    lagSec: 0.4,
    lagWords: 1,
    lagChars: 4,
    rawLagSec: 0.4,
    stableLagSec: 0.4,
    lagFallbackUsed: false,
    lagOutlierCount: 0,
    accuracy: 0.94,
    chunkAccuracy: 0.94,
    rollingAccuracyLast3: 0.94,
    rollingAccuracyLast5: 0.94,
    errorRate: 0.06,
    wpm: 52,
    charsPerMinute: 260,
    pauseMs: 1400,
    longestPauseMs: 1400,
    backspaceRate: 0.02,
    correctionRate: 0.03,
    phraseDifficulty: 0.32,
    phraseLengthWords: 2,
    phraseLengthChars: 11,
    language: 'es',
    phraseBoundaryType: 'sentence',
    canPauseAfter: true,
    canReplayIndependently: true,
    semanticCompleteness: 1,
    punctuationLoad: 0,
    rareWordLoad: 0,
    syntaxComplexity: 0.1,
    currentPlaybackRate: 1,
    currentPauseAfterPhraseMs: 1400,
    trend: 'stable',
    ...overrides,
  };
}

function createDecision(overrides: Partial<PacingDecision> = {}): PacingDecision {
  return {
    mode: 'balanced',
    playbackRate: 1,
    pauseAfterPhraseMs: 1400,
    shouldPauseNow: true,
    shouldReplayPhrase: false,
    boundaryStrictness: 'sentence',
    allowMidPhrasePause: false,
    deferPauseUntilSafeBoundary: false,
    replayRate: 0.92,
    nextPhraseSize: 'medium',
    reason: 'test',
    reasonCodes: [],
    lagScore: 0.9,
    accuracyScore: 0.94,
    hesitationScore: 0.8,
    confidenceScore: 0.8,
    ...overrides,
  };
}

function createChunkEndParams(overrides: Partial<ChunkEndParams> = {}): ChunkEndParams {
  const ttsPracticeLiveTextRef = { current: '' };

  return {
    perfDiagnostics: { recordTtsEnd: vi.fn() } as unknown as ChunkEndParams['perfDiagnostics'],
    perfUtteranceId: 1,
    cancelled: false,
    chunkIndex: 0,
    macroPhraseIndex: 0,
    macroWordOffset: 0,
    macroWordsLength: 4,
    chunk: {
      text: 'hello world',
      startWordIndex: 0,
      wordCount: 2,
      phraseBoundaryType: 'sentence',
      canPauseAfter: true,
      canReplayIndependently: true,
      semanticCompleteness: 1,
      punctuationLoad: 0,
      rareWordLoad: 0,
      syntaxComplexity: 0.1,
      phraseDifficulty: 0.2,
    },
    effectivePauseNow: true,
    effectiveReplay: false,
    pauseBeforeNextChunkMs: 1400,
    runtimeDecision: createDecision(),
    ttsCompletedSourceWordsRef: { current: 0 },
    ttsText: 'hello world again today',
    ttsPracticeLiveTextRef,
    ttsPracticeLastInputAtMsRef: { current: 0 },
    setTtsPracticeText: vi.fn() as ChunkEndParams['setTtsPracticeText'],
    ttsTranscript: {
      words: [
        { word: 'hello', start: 0, end: 0.3 },
        { word: 'world', start: 0.3, end: 0.7 },
        { word: 'again', start: 0.7, end: 1 },
        { word: 'today', start: 1, end: 1.3 },
      ],
    },
    browserTtsSafePauseGateSettings: DEFAULT_BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS,
    recordPhrasePlaybackEvent: vi.fn() as ChunkEndParams['recordPhrasePlaybackEvent'],
    ttsLanguage: 'es',
    semanticPhrase: {
      id: 'semantic-0',
      text: 'hello world again today',
      language: 'es',
      boundaryType: 'sentence',
      canPauseAfter: true,
      canReplayIndependently: true,
      semanticCompleteness: 1,
      difficulty: 0.2,
      wordCount: 4,
      charCount: 23,
      punctuationLoad: 0,
      rareWordLoad: 0,
      syntaxComplexity: 0.1,
    },
    applyTtsPerformanceSample: vi.fn() as ChunkEndParams['applyTtsPerformanceSample'],
    ttsLiveSignalRef: {
      current: {
        accuracy: 94,
        lagSec: 0.4,
        rawLagSec: 0.4,
        stableLagSec: 0.4,
        lagFallbackUsed: false,
        lagOutlierCount: 0,
        wpm: 52,
        trend: 'stable',
        controllerState: 'play',
      },
    },
    chunkTelemetry: createTelemetry(),
    ttsUnsafeChunkCountRef: { current: 0 },
    recordAdaptiveBenchmark: vi.fn() as ChunkEndParams['recordAdaptiveBenchmark'],
    rate: 1,
    browserTtsEnvironment: null,
    semanticPhrases: [],
    ttsSemanticPhraseAdvanceCountRef: { current: 0 },
    ttsSemanticPhraseReplayCountRef: { current: 0 },
    setAdaptiveSemanticDebug: vi.fn() as ChunkEndParams['setAdaptiveSemanticDebug'],
    speakNext: vi.fn(),
    updatePlaybackCursor: vi.fn(),
    ...overrides,
  };
}

describe('handleBrowserTtsPlaybackLoopChunkEnd', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('flushes live text and publishes a forced metric sample when a chunk ends', () => {
    const params = createChunkEndParams({
      effectivePauseNow: false,
      ttsPracticeLiveTextRef: { current: 'hello wor' },
    });

    handleBrowserTtsPlaybackLoopChunkEnd(params);

    expect(params.setTtsPracticeText).toHaveBeenCalledWith('hello wor');
    expect(params.applyTtsPerformanceSample).toHaveBeenCalledWith({
      forcePublishUi: true,
      practiceTextOverride: 'hello wor',
    });
  });

  it('records benchmark pause with the minimum mental rest when the gate completes early', () => {
    vi.useFakeTimers();
    installWindowTimers();
    const params = createChunkEndParams();

    handleBrowserTtsPlaybackLoopChunkEnd(params);

    expect(params.recordAdaptiveBenchmark).not.toHaveBeenCalled();

    params.ttsPracticeLiveTextRef.current = 'hello world';
    vi.advanceTimersByTime(100);

    expect(params.recordAdaptiveBenchmark).not.toHaveBeenCalled();
    expect(params.speakNext).not.toHaveBeenCalled();

    vi.advanceTimersByTime(BROWSER_TTS_MIN_MENTAL_REST_MS - 100);

    expect(params.setTtsPracticeText).toHaveBeenLastCalledWith('hello world');
    expect(params.applyTtsPerformanceSample).toHaveBeenLastCalledWith({
      forcePublishUi: true,
      practiceTextOverride: 'hello world',
    });
    expect(params.recordAdaptiveBenchmark).toHaveBeenCalledTimes(1);
    expect(params.recordAdaptiveBenchmark).toHaveBeenCalledWith(
      expect.any(Object),
      params.runtimeDecision,
      expect.objectContaining({
        actualPauseMs: BROWSER_TTS_MIN_MENTAL_REST_MS,
        pauseGateResolutionReason: 'completed',
        event: 'pause',
      }),
    );
    expect(params.speakNext).toHaveBeenCalledTimes(1);
  });

  it('auto-inserts target punctuation when the safe pause gate completes a chunk', () => {
    vi.useFakeTimers();
    installWindowTimers();
    const activeTextarea = {
      tagName: 'TEXTAREA',
      selectionStart: 11,
      selectionEnd: 11,
      value: 'hello world',
      setSelectionRange: vi.fn((start: number, end: number) => {
        activeTextarea.selectionStart = start;
        activeTextarea.selectionEnd = end;
      }),
    };
    vi.stubGlobal('document', {
      activeElement: activeTextarea,
    });
    const params = createChunkEndParams({
      ttsText: 'hello, world! again today',
    });

    handleBrowserTtsPlaybackLoopChunkEnd(params);

    params.ttsPracticeLiveTextRef.current = 'hello world';
    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(BROWSER_TTS_MIN_MENTAL_REST_MS - 100);

    expect(params.ttsPracticeLiveTextRef.current).toBe('hello, world!');
    expect(activeTextarea.value).toBe('hello, world!');
    expect(activeTextarea.setSelectionRange).toHaveBeenCalledWith(13, 13);
    expect(params.setTtsPracticeText).toHaveBeenLastCalledWith('hello, world!');
    expect(params.applyTtsPerformanceSample).toHaveBeenLastCalledWith({
      forcePublishUi: true,
      practiceTextOverride: 'hello, world!',
    });
  });

  it('does not auto-insert punctuation while the user is editing inside the textarea', () => {
    vi.useFakeTimers();
    installWindowTimers();
    vi.stubGlobal('document', {
      activeElement: {
        tagName: 'TEXTAREA',
        selectionStart: 3,
        selectionEnd: 3,
        value: 'hello world',
      },
    });
    const params = createChunkEndParams({
      ttsText: 'hello, world! again today',
    });

    handleBrowserTtsPlaybackLoopChunkEnd(params);

    params.ttsPracticeLiveTextRef.current = 'hello world';
    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(BROWSER_TTS_MIN_MENTAL_REST_MS - 100);

    expect(params.ttsPracticeLiveTextRef.current).toBe('hello world');
    expect(params.setTtsPracticeText).toHaveBeenLastCalledWith('hello world');
  });

  it('does not auto-insert punctuation when the user typed too recently', () => {
    vi.useFakeTimers();
    installWindowTimers();
    const params = createChunkEndParams({
      ttsText: 'hello, world! again today',
    });

    handleBrowserTtsPlaybackLoopChunkEnd(params);

    params.ttsPracticeLiveTextRef.current = 'hello world';
    vi.advanceTimersByTime(650);
    params.ttsPracticeLastInputAtMsRef.current = performance.now();
    vi.advanceTimersByTime(BROWSER_TTS_MIN_MENTAL_REST_MS - 650);

    expect(params.ttsPracticeLiveTextRef.current).toBe('hello world');
    expect(params.setTtsPracticeText).toHaveBeenLastCalledWith('hello world');
  });

  it('records benchmark pause with a configured minimum mental rest when the gate completes early', () => {
    vi.useFakeTimers();
    installWindowTimers();
    const params = createChunkEndParams({
      browserTtsSafePauseGateSettings: {
        minimumMentalRestMs: 900,
        completionGateMaxWaitMs: 4000,
      },
    });

    handleBrowserTtsPlaybackLoopChunkEnd(params);

    params.ttsPracticeLiveTextRef.current = 'hello world';
    vi.advanceTimersByTime(100);

    expect(params.recordAdaptiveBenchmark).not.toHaveBeenCalled();
    expect(params.speakNext).not.toHaveBeenCalled();

    vi.advanceTimersByTime(800);

    expect(params.recordAdaptiveBenchmark).toHaveBeenCalledTimes(1);
    expect(params.recordAdaptiveBenchmark).toHaveBeenCalledWith(
      expect.any(Object),
      params.runtimeDecision,
      expect.objectContaining({
        actualPauseMs: 900,
        pauseGateResolutionReason: 'completed',
        event: 'pause',
      }),
    );
    expect(params.speakNext).toHaveBeenCalledTimes(1);
  });

  it('records benchmark pause with the anti-blocking timeout when the gate never completes', () => {
    vi.useFakeTimers();
    installWindowTimers();
    const params = createChunkEndParams();

    handleBrowserTtsPlaybackLoopChunkEnd(params);
    vi.advanceTimersByTime(4000);

    expect(params.recordAdaptiveBenchmark).toHaveBeenCalledTimes(1);
    expect(params.recordAdaptiveBenchmark).toHaveBeenCalledWith(
      expect.any(Object),
      params.runtimeDecision,
      expect.objectContaining({
        actualPauseMs: 4000,
        pauseGateResolutionReason: 'timeout',
        event: 'pause',
      }),
    );
    expect(params.speakNext).toHaveBeenCalledTimes(1);
  });

  it('records benchmark pause with a configured anti-blocking timeout', () => {
    vi.useFakeTimers();
    installWindowTimers();
    const params = createChunkEndParams({
      browserTtsSafePauseGateSettings: {
        minimumMentalRestMs: 700,
        completionGateMaxWaitMs: 3000,
      },
    });

    handleBrowserTtsPlaybackLoopChunkEnd(params);
    vi.advanceTimersByTime(3000);

    expect(params.recordAdaptiveBenchmark).toHaveBeenCalledTimes(1);
    expect(params.recordAdaptiveBenchmark).toHaveBeenCalledWith(
      expect.any(Object),
      params.runtimeDecision,
      expect.objectContaining({
        actualPauseMs: 3000,
        pauseGateResolutionReason: 'timeout',
        event: 'pause',
      }),
    );
    expect(params.speakNext).toHaveBeenCalledTimes(1);
  });
});
