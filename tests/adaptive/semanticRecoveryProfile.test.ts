import { describe, expect, it } from 'vitest';
import { AdaptiveDictationController } from '../../src/core/adaptive/AdaptiveDictationController';
import { resolveBrowserTtsAdaptiveProfile } from '../../src/inputs/browserTts/browserTtsAdaptiveProfiles';
import { buildHistory, buildLive } from '../helpers/adaptiveSemanticFixtures';

describe('AdaptiveDictationController semantic recovery and profile policy', () => {
  it('exits support after sustained recovery', () => {
    const controller = new AdaptiveDictationController();
    controller.decide({
      live: buildLive({ lagSec: 3.1, accuracy: 0.79, correctionRate: 0.12 }),
      history: buildHistory(),
    });
    controller.decide({
      live: buildLive({ lagSec: 2.8, accuracy: 0.8, correctionRate: 0.11 }),
      history: buildHistory(),
    });

    const recovered1 = controller.decide({
      live: buildLive({ lagSec: 1.2, accuracy: 0.94, correctionRate: 0.03 }),
      history: buildHistory(),
    });
    const recovered2 = controller.decide({
      live: buildLive({ lagSec: 1.1, accuracy: 0.95, correctionRate: 0.03 }),
      history: buildHistory(),
    });
    const recovered3 = controller.decide({
      live: buildLive({ lagSec: 1.0, accuracy: 0.95, correctionRate: 0.03 }),
      history: buildHistory(),
    });
    expect(recovered1.mode).not.toBe('support');
    expect(recovered2.mode).not.toBe('support');
    expect(recovered3.mode).not.toBe('support');
  });

  it('uses rolling/chunk accuracy for adaptation instead of session accuracy alone', () => {
    const controller = new AdaptiveDictationController();
    const badChunk = controller.decide({
      live: buildLive({
        lagSec: 2.9,
        sessionAccuracy: 0.95,
        chunkAccuracy: 0.62,
        rollingAccuracyLast3: 0.7,
        rollingAccuracyLast5: 0.78,
        correctionRate: 0.1,
      }),
      history: buildHistory({ averageAccuracy: 0.9 }),
    });
    expect(badChunk.mode).toBe('support');

    const recoveredChunk = controller.decide({
      live: buildLive({
        lagSec: 0.8,
        sessionAccuracy: 0.86,
        chunkAccuracy: 0.97,
        rollingAccuracyLast3: 0.95,
        rollingAccuracyLast5: 0.94,
        correctionRate: 0.02,
      }),
      history: buildHistory({ averageAccuracy: 0.9 }),
    });
    expect(recoveredChunk.mode === 'balanced' || recoveredChunk.mode === 'flow').toBe(true);
  });

  it('keeps controller support floor/ceiling aligned with language profile', () => {
    const controller = new AdaptiveDictationController();
    const enProfile = resolveBrowserTtsAdaptiveProfile('en');
    const deProfile = resolveBrowserTtsAdaptiveProfile('de');

    const enDecision = controller.decide({
      live: buildLive({
        language: 'en',
        lagSec: 2.6,
        rollingAccuracyLast3: 0.8,
        rollingAccuracyLast5: 0.82,
        correctionRate: 0.11,
      }),
      history: buildHistory({ comfortablePlaybackRate: 1.1, averageAccuracy: 0.8 }),
    });
    expect(enDecision.mode).toBe('support');
    expect(enDecision.playbackRate).toBeGreaterThanOrEqual(enProfile.supportRateFloor);
    expect(enDecision.playbackRate).toBeLessThanOrEqual(enProfile.supportRateCeiling);

    const deDecision = controller.decide({
      live: buildLive({
        language: 'de',
        lagSec: 2.6,
        rollingAccuracyLast3: 0.8,
        rollingAccuracyLast5: 0.82,
        correctionRate: 0.11,
      }),
      history: buildHistory({ comfortablePlaybackRate: 1.1, averageAccuracy: 0.8 }),
    });
    expect(deDecision.mode).toBe('support');
    expect(deDecision.playbackRate).toBeGreaterThanOrEqual(deProfile.supportRateFloor);
    expect(deDecision.playbackRate).toBeLessThanOrEqual(deProfile.supportRateCeiling);
  });
});
