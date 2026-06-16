import { describe, expect, it } from 'vitest';
import { AdaptiveDictationController } from '../src/core/adaptive/AdaptiveDictationController';
import { createDefaultListeningPrecisionMetrics } from '../src/core/adaptive/listeningPrecisionMetrics';
import { buildBrowserTtsTelemetryFrame } from '../src/inputs/browserTts/browserTtsTelemetryAdapter';
import { input } from './helpers/adaptiveControllerFixtures';

describe('AdaptiveDictationController profile guardrails', () => {
  it('does not force Browser TTS English warmup before adapting upward', () => {
    const controller = new AdaptiveDictationController();
    const decision = controller.decide(
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

    expect(decision.reason).not.toContain('session-warmup-calibration');
    expect(decision.mode).toBe('flow');
    expect(decision.reason).toContain('high-accuracy-low-lag');
    expect(decision.playbackRate).toBeGreaterThanOrEqual(0.95);
    expect(decision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(1200);
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
});
