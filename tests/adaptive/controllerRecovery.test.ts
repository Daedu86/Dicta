import { describe, expect, it } from 'vitest';
import { AdaptiveDictationController } from '../../src/core/adaptive/AdaptiveDictationController';
import { input } from '../helpers/adaptiveControllerFixtures';

describe('AdaptiveDictationController recovery behavior', () => {
  it('allows challenge-level phrase growth when current pressure is clean', () => {
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
    expect(decision.adaptiveLevel).toBeGreaterThan(0.85);
    expect(decision.derivedAdaptiveLabel).toBe('legacy-flow');
    expect(decision.nextPhraseSize).toBe('long');
    expect(decision.reason).toContain('high-accuracy-low-lag');
  });

  it('eases continuously when Browser TTS user falls far behind', () => {
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

    expect(decision.adaptiveLevel).toBeLessThan(0.45);
    expect(decision.derivedAdaptiveLabel === 'legacy-support' || decision.derivedAdaptiveLabel === 'legacy-recovery').toBe(true);
    expect(decision.nextPhraseSize).toBe('short');
    expect(decision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(2200);
    expect(decision.playbackRate).toBeLessThanOrEqual(1.0);
    expect(decision.reasonCodes).toContain('continuous-easing');
    expect(decision.reasonCodes).toContain('lag-pressure');
    expect(decision.reasonCodes).toContain('perceptual-pause-pressure');
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
