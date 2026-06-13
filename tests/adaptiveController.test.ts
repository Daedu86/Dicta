import { describe, expect, it } from 'vitest';
import { AdaptiveDictationController } from '../src/core/adaptive/AdaptiveDictationController';
import { buildBrowserTtsTelemetryFrame } from '../src/inputs/browserTts/browserTtsTelemetryAdapter';
import { createDefaultListeningPrecisionMetrics } from '../src/core/adaptive/listeningPrecisionMetrics';
import type { AdaptivePacingInput, HistoricalPerformanceProfile, InputCapabilities, LiveTelemetryFrame } from '../src/core/adaptive/types';

const baseHistory: HistoricalPerformanceProfile = {
  language: 'en',
  inputMode: 'browser-tts',
  comfortablePlaybackRate: 1,
  averageWpm: 50,
  averageAccuracy: 0.9,
  averageLagSec: 0,
  averagePauseMs: 700,
  preferredPhraseSize: 'medium',
  preferredPauseAfterPhraseMs: 700,
  typicalBackspaceRate: 0.03,
  typicalCorrectionRate: 0.04,
  strugglesWithLongPhrases: false,
  strugglesWithNumbers: false,
  strugglesWithNames: false,
  strugglesWithPunctuation: false,
  improvementTrend: 'stable',
  sessionsCount: 6,
  profileConfidence: 0.8,
};

const browserTtsCapabilities: InputCapabilities = {
  supportsClausePause: true,
  supportsSentencePause: true,
  supportsPhraseReplay: false,
  supportsMidPhraseReplay: false,
  supportsDynamicRateChange: true,
  requiresPreChunking: true,
};

function live(overrides: Partial<LiveTelemetryFrame> = {}): LiveTelemetryFrame {
  return {
    inputMode: 'browser-tts',
    phraseId: 'phrase-1',
    spokenProgressRatio: 0.5,
    typedProgressRatio: 0.5,
    lagSec: 0.2,
    lagWords: 0,
    lagChars: 0,
    accuracy: 0.94,
    errorRate: 0.06,
    wpm: 52,
    charsPerMinute: 260,
    pauseMs: 500,
    longestPauseMs: 800,
    backspaceRate: 0.03,
    correctionRate: 0.03,
    phraseDifficulty: 0.35,
    phraseLengthWords: 7,
    phraseLengthChars: 42,
    language: 'en',
    phraseBoundaryType: 'sentence',
    canPauseAfter: true,
    canReplayIndependently: true,
    semanticCompleteness: 1,
    currentPlaybackRate: 1,
    currentPauseAfterPhraseMs: 700,
    trend: 'stable',
    ...overrides,
  };
}

function input(overrides: Partial<LiveTelemetryFrame> = {}, historyOverrides: Partial<HistoricalPerformanceProfile> = {}): AdaptivePacingInput {
  return {
    live: live(overrides),
    history: { ...baseHistory, ...historyOverrides },
    capabilities: browserTtsCapabilities,
  };
}

describe('AdaptiveDictationController profile guardrails', () => {
  it('starts Browser TTS English in conservative session warmup before adapting upward', () => {
    const controller = new AdaptiveDictationController();
    const warmupDecision = controller.decide(
      input({
        phraseId: 'tts-0',
        sessionChunkIndex: 0,
        language: 'en',
        lagSec: 0,
        accuracy: 1,
        chunkAccuracy: 1,
        rollingAccuracyLast3: 1,
        rollingAccuracyLast5: 1,
        correctionRate: 0,
        wpm: 60,
      }),
    );

    expect(warmupDecision.mode).toBe('support');
    expect(warmupDecision.playbackRate).toBe(0.78);
    expect(warmupDecision.pauseAfterPhraseMs).toBe(1800);
    expect(warmupDecision.nextPhraseSize).toBe('short');
    expect(warmupDecision.reason).toContain('session-warmup-calibration');

    const postWarmupDecision = controller.decide(
      input({
        phraseId: 'tts-3',
        sessionChunkIndex: 3,
        language: 'en',
        lagSec: 0.1,
        accuracy: 0.98,
        chunkAccuracy: 0.98,
        rollingAccuracyLast3: 0.98,
        rollingAccuracyLast5: 0.98,
        correctionRate: 0.01,
        phraseDifficulty: 0.2,
        wpm: 60,
      }),
    );

    expect(postWarmupDecision.reason).not.toContain('session-warmup-calibration');
    expect(postWarmupDecision.playbackRate).toBeGreaterThan(warmupDecision.playbackRate);
  });

  it('extends Browser TTS English pause when current chunk accuracy is low', () => {
    const controller = new AdaptiveDictationController();
    const decision = controller.decide(
      input({
        phraseId: 'tts-4',
        sessionChunkIndex: 4,
        language: 'en',
        accuracy: 0.72,
        chunkAccuracy: 0.72,
        rollingAccuracyLast3: 0.72,
        rollingAccuracyLast5: 0.76,
        lagSec: 0.4,
        spokenProgressRatio: 0.45,
        typedProgressRatio: 0.43,
      }),
    );

    expect(decision.mode).toBe('support');
    expect(decision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(2600);
    expect(decision.reason).toContain('adaptive-pause-very-low-accuracy');
  });

  it('extends Browser TTS English pause when typed progress falls behind spoken progress', () => {
    const controller = new AdaptiveDictationController();
    const decision = controller.decide(
      input({
        phraseId: 'tts-5',
        sessionChunkIndex: 5,
        language: 'en',
        accuracy: 0.9,
        chunkAccuracy: 0.9,
        rollingAccuracyLast3: 0.9,
        rollingAccuracyLast5: 0.9,
        lagSec: 0.5,
        spokenProgressRatio: 0.75,
        typedProgressRatio: 0.6,
      }),
    );

    expect(decision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(2400);
    expect(decision.reason).toContain('adaptive-pause-progress-gap');
  });

  it('uses previous session pressure to avoid short pauses in Browser TTS English', () => {
    const controller = new AdaptiveDictationController();
    const decision = controller.decide(
      input(
        {
          phraseId: 'tts-6',
          sessionChunkIndex: 6,
          language: 'en',
          accuracy: 0.9,
          chunkAccuracy: 0.9,
          rollingAccuracyLast3: 0.9,
          rollingAccuracyLast5: 0.9,
          lagSec: 0.4,
        },
        {
          averageAccuracy: 0.79,
          averageLagSec: 2.1,
          profileConfidence: 0.9,
        },
      ),
    );

    expect(decision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(2200);
    expect(decision.reason).toContain('adaptive-pause-history-pressure');
  });

  it('caps playback rate when listening precision has not stabilized', () => {
    const controller = new AdaptiveDictationController();
    controller.decide(input({ language: 'es', accuracy: 0.98, rollingAccuracyLast3: 0.98, lagSec: 0.1, wpm: 60 }));
    controller.decide(input({ language: 'es', accuracy: 0.98, rollingAccuracyLast3: 0.98, lagSec: 0.1, wpm: 60 }));

    const decision = controller.decide(
      input({
        language: 'es',
        accuracy: 0.98,
        chunkAccuracy: 0.98,
        rollingAccuracyLast3: 0.98,
        rollingAccuracyLast5: 0.98,
        lagSec: 0.1,
        correctionRate: 0.01,
        phraseDifficulty: 0.2,
        wpm: 60,
        listeningPrecision: {
          ...createDefaultListeningPrecisionMetrics(),
          listeningRecallScore: 0.82,
          contentWordRecall: 0.8,
          detailPrecisionScore: 0.7,
          functionWordAccuracy: 0.75,
          wordOrderAccuracy: 0.76,
          lateCompletionRate: 0.4,
        },
      }),
    );

    expect(decision.playbackRate).toBeLessThanOrEqual(0.98);
    expect(decision.reason).toContain('listening-precision-rate-ceiling');
  });

  it('does not cap playback rate when listening precision is strong', () => {
    const controller = new AdaptiveDictationController();
    controller.decide(input({ language: 'es', accuracy: 0.99, rollingAccuracyLast3: 0.99, lagSec: 0.1, wpm: 65 }));
    controller.decide(input({ language: 'es', accuracy: 0.99, rollingAccuracyLast3: 0.99, lagSec: 0.1, wpm: 65 }));

    const decision = controller.decide(
      input({
        language: 'es',
        accuracy: 0.99,
        chunkAccuracy: 0.99,
        rollingAccuracyLast3: 0.99,
        rollingAccuracyLast5: 0.99,
        lagSec: 0.1,
        correctionRate: 0.01,
        phraseDifficulty: 0.2,
        wpm: 65,
        listeningPrecision: createDefaultListeningPrecisionMetrics(),
      }),
    );

    expect(decision.reason).not.toContain('listening-precision-rate-ceiling');
  });

  it('derives Browser TTS session chunk index from runtime phrase ids', () => {
    const telemetry = buildBrowserTtsTelemetryFrame({
      inputMode: 'browser-tts',
      phraseId: 'tts-2-chunk',
      estimatedSpokenRatio: 0,
      typedProgressRatio: 0,
      lagSec: 0,
      lagWords: 0,
      lagChars: 0,
      accuracy: 1,
      errorRate: 0,
      wpm: 0,
      charsPerMinute: 0,
      pauseMs: 700,
      longestPauseMs: 0,
      backspaceRate: 0,
      correctionRate: 0,
      phraseDifficulty: 0.3,
      phraseLengthWords: 4,
      phraseLengthChars: 20,
      currentPlaybackRate: 1,
      currentPauseAfterPhraseMs: 700,
      language: 'en',
      trend: 'stable',
    });

    expect(telemetry.sessionChunkIndex).toBe(2);
  });

  it('does not apply English warmup to Spanish Browser TTS', () => {
    const controller = new AdaptiveDictationController();
    const decision = controller.decide(
      input({
        phraseId: 'tts-0',
        sessionChunkIndex: 0,
        language: 'es',
        lagSec: 0.1,
        accuracy: 0.98,
        chunkAccuracy: 0.98,
        rollingAccuracyLast3: 0.98,
        rollingAccuracyLast5: 0.98,
        correctionRate: 0.01,
        phraseDifficulty: 0.2,
        wpm: 60,
      }),
    );

    expect(decision.reason).not.toContain('session-warmup-calibration');
    expect(decision.playbackRate).not.toBe(0.78);
  });

  it('converts Browser TTS replay pressure into recovery instead of replay execution', () => {
    const controller = new AdaptiveDictationController();
    const decision = controller.decide(
      input({
        lagSec: 3.2,
        lagWords: 8,
        accuracy: 0.74,
        chunkAccuracy: 0.74,
        rollingAccuracyLast3: 0.74,
        rollingAccuracyLast5: 0.76,
        correctionRate: 0.16,
      }),
    );

    expect(decision.mode).toBe('support');
    expect(decision.shouldReplayPhrase).toBe(false);
    expect(decision.nextPhraseSize).toBe('short');
    expect(decision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(1200);
    expect(decision.reason).toContain('replay-disabled-recovery');
  });

  it('keeps real replay available for inputs that support phrase replay', () => {
    const controller = new AdaptiveDictationController();
    const decision = controller.decide({
      ...input({
        inputMode: 'browser-tts',
        language: 'en',
        lagSec: 3.2,
        lagWords: 8,
        accuracy: 0.74,
        chunkAccuracy: 0.74,
        rollingAccuracyLast3: 0.74,
        rollingAccuracyLast5: 0.76,
        correctionRate: 0.16,
      }),
      capabilities: {
        supportsClausePause: true,
        supportsSentencePause: true,
        supportsPhraseReplay: true,
        supportsMidPhraseReplay: true,
        supportsDynamicRateChange: true,
        requiresPreChunking: false,
      },
    });

    expect(decision.mode).toBe('support');
    expect(decision.shouldReplayPhrase).toBe(true);
    expect(decision.reason).toContain('replay-due-to-lag-or-error');
  });

  it('keeps Browser TTS German support behavior isolated from English', () => {
    const germanController = new AdaptiveDictationController();
    const englishController = new AdaptiveDictationController();

    const pressure = {
      lagSec: 4.5,
      lagWords: 12,
      accuracy: 0.7,
      chunkAccuracy: 0.7,
      rollingAccuracyLast3: 0.7,
      rollingAccuracyLast5: 0.72,
      correctionRate: 0.2,
    } satisfies Partial<LiveTelemetryFrame>;

    const germanDecision = germanController.decide(input({ ...pressure, language: 'de' }));
    const englishDecision = englishController.decide(input({ ...pressure, language: 'en' }));

    expect(germanDecision.mode).toBe('support');
    expect(englishDecision.mode).toBe('support');
    expect(germanDecision.shouldReplayPhrase).toBe(false);
    expect(englishDecision.shouldReplayPhrase).toBe(false);
    expect(germanDecision.reason).toContain('replay-disabled-recovery');
    expect(englishDecision.reason).toContain('replay-disabled-recovery');
  });

  it('avoids long phrases during early recovery even when accuracy is high', () => {
    const controller = new AdaptiveDictationController();
    const decision = controller.decide(
      input({
        lagSec: 0.1,
        accuracy: 0.98,
        chunkAccuracy: 0.98,
        rollingAccuracyLast3: 0.98,
        rollingAccuracyLast5: 0.98,
        correctionRate: 0.01,
        phraseDifficulty: 0.2,
        wpm: 60,
      }),
    );

    expect(decision.mode).toBe('flow');
    expect(decision.nextPhraseSize).toBe('medium');
    expect(decision.reason).toContain('high-accuracy-low-lag');
  });
it('enters recovery mode when Browser TTS user falls far behind', () => {
    const controller = new AdaptiveDictationController();
    const decision = controller.decide(
      input({
        phraseId: 'tts-recovery-1',
        sessionChunkIndex: 5,
        language: 'es',
        accuracy: 0.9,
        chunkAccuracy: 0.9,
        rollingAccuracyLast3: 0.9,
        rollingAccuracyLast5: 0.9,
        lagSec: 3.4,
        spokenProgressRatio: 0.82,
        typedProgressRatio: 0.58,
        correctionRate: 0.05,
        phraseDifficulty: 0.35,
        wpm: 38,
      }),
    );

    expect(decision.mode).toBe('recovery');
    expect(decision.nextPhraseSize).toBe('short');
    expect(decision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(2200);
    expect(decision.playbackRate).toBeLessThanOrEqual(0.92);
    expect(decision.reasonCodes).toContain('mode-recovery');
    expect(decision.reasonCodes).toContain('recovery-needed');
    expect(decision.reasonCodes).toContain('extended-catch-up-window');
    expect(decision.reasonCodes).toContain('support-needed');
  });

  it('blocks immediate flow after recovery even when the next chunk is strong', () => {
    const controller = new AdaptiveDictationController();

    controller.decide(
      input({
        phraseId: 'tts-recovery-2',
        sessionChunkIndex: 5,
        language: 'es',
        accuracy: 0.9,
        chunkAccuracy: 0.9,
        rollingAccuracyLast3: 0.9,
        rollingAccuracyLast5: 0.9,
        lagSec: 3.4,
        spokenProgressRatio: 0.82,
        typedProgressRatio: 0.58,
        correctionRate: 0.05,
        phraseDifficulty: 0.35,
        wpm: 38,
      }),
    );

    const decision = controller.decide(
      input({
        phraseId: 'tts-recovery-3',
        sessionChunkIndex: 6,
        language: 'es',
        accuracy: 0.99,
        chunkAccuracy: 0.99,
        rollingAccuracyLast3: 0.99,
        rollingAccuracyLast5: 0.99,
        lagSec: 0.1,
        spokenProgressRatio: 0.7,
        typedProgressRatio: 0.7,
        correctionRate: 0.01,
        phraseDifficulty: 0.2,
        wpm: 70,
      }),
    );

    expect(decision.mode).toBe('balanced');
    expect(decision.nextPhraseSize).not.toBe('long');
    expect(decision.reasonCodes).toContain('flow-blocked-after-recovery');
  });

});
