import { expect, it } from 'vitest';
import { AdaptiveDictationController } from '../../src/core/adaptive/AdaptiveDictationController';
import { buildBrowserTtsTelemetryFrame } from '../../src/inputs/browserTts/browserTtsTelemetryAdapter';
import { input } from './adaptiveControllerFixtures';

export function runAdaptiveControllerTelemetryGuardrailsSuite(): void {
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
}
