import { expect, it } from 'vitest';
import { AdaptiveDictationController } from '../../src/core/adaptive/AdaptiveDictationController';
import { input } from './adaptiveControllerFixtures';

export function runAdaptiveControllerBrowserTtsPauseGuardrailsSuite(): void {
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

    expect(decision.adaptiveLevel).toBeLessThan(0.85);
    expect(decision.pressureVector?.accuracy).toBeGreaterThan(0.5);
    expect(decision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(2600);
    expect(decision.pacingOutput?.pauseMsTarget).toBeGreaterThanOrEqual(2600);
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
}
