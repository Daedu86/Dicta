import { describe, expect, it } from 'vitest';
import { AdaptiveDictationController } from '../../src/core/adaptive/AdaptiveDictationController';
import { buildHistory, buildLive } from '../helpers/adaptiveSemanticFixtures';

describe('AdaptiveDictationController semantic rate policy', () => {
  it('enforces playback rate floors by mode', () => {
    const controller = new AdaptiveDictationController();
    const supportDecision = controller.decide({
      live: buildLive({ lagSec: 3.4, accuracy: 0.75, correctionRate: 0.14 }),
      history: buildHistory({ comfortablePlaybackRate: 0.84, averageAccuracy: 0.92 }),
    });
    expect(supportDecision.mode).toBe('support');
    expect(supportDecision.playbackRate).toBeGreaterThanOrEqual(0.82);

    const extremeSupportDecision = controller.decide({
      live: buildLive({ lagSec: 4.8, accuracy: 0.72, correctionRate: 0.2 }),
      history: buildHistory({ comfortablePlaybackRate: 0.84, averageAccuracy: 0.92 }),
    });
    expect(extremeSupportDecision.mode).toBe('support');
    expect(extremeSupportDecision.playbackRate).toBeGreaterThanOrEqual(0.78);

    const balancedDecision = controller.decide({
      live: buildLive({ lagSec: 1.0, accuracy: 0.9, correctionRate: 0.05 }),
      history: buildHistory({ comfortablePlaybackRate: 0.84, averageAccuracy: 0.9 }),
    });
    expect(balancedDecision.mode === 'balanced' || balancedDecision.mode === 'flow').toBe(true);
    expect(balancedDecision.playbackRate).toBeGreaterThanOrEqual(0.84);
  });

  it('caps support-needed playbackRate at 0.92 without affecting balanced/flow ceiling', () => {
    const controller = new AdaptiveDictationController();
    const supportDecision = controller.decide({
      live: buildLive({
        lagSec: 2.2,
        correctionRate: 0.11,
        rollingAccuracyLast3: 0.81,
        rollingAccuracyLast5: 0.83,
      }),
      history: buildHistory({ comfortablePlaybackRate: 1.08, averageAccuracy: 0.8 }),
    });
    expect(supportDecision.mode).toBe('support');
    expect(supportDecision.reason.includes('support-needed')).toBe(true);
    expect(supportDecision.playbackRate).toBeLessThanOrEqual(0.92);
    expect(supportDecision.playbackRate).toBeGreaterThanOrEqual(0.82);

    const flowDecision = controller.decide({
      live: buildLive({
        lagSec: 0,
        correctionRate: 0,
        rollingAccuracyLast3: 0.99,
        rollingAccuracyLast5: 0.99,
        wpm: 120,
      }),
      history: buildHistory({ comfortablePlaybackRate: 1.1, averageWpm: 40, averageAccuracy: 0.8 }),
    });
    expect(flowDecision.mode === 'flow' || flowDecision.mode === 'balanced').toBe(true);
    if (flowDecision.mode === 'flow') {
      expect(flowDecision.playbackRate).toBeGreaterThan(0.92);
    }
  });

  it('keeps defer-pause slowdown above the mode floor', () => {
    const controller = new AdaptiveDictationController();
    const supportDeferred = controller.decide({
      live: buildLive({ lagSec: 3.2, accuracy: 0.79, correctionRate: 0.13, canPauseAfter: false }),
      history: buildHistory({ comfortablePlaybackRate: 0.84, averageAccuracy: 0.9 }),
    });
    expect(supportDeferred.deferPauseUntilSafeBoundary).toBe(true);
    expect(supportDeferred.mode).toBe('support');
    expect(supportDeferred.playbackRate).toBeGreaterThanOrEqual(0.82);

    const balancedDeferred = controller.decide({
      live: buildLive({ lagSec: 1.0, accuracy: 0.91, correctionRate: 0.03, canPauseAfter: false }),
      history: buildHistory({ comfortablePlaybackRate: 0.84, averageAccuracy: 0.9 }),
    });
    expect(balancedDeferred.deferPauseUntilSafeBoundary).toBe(false);
    expect(balancedDeferred.playbackRate).toBeGreaterThanOrEqual(0.84);
  });
});
