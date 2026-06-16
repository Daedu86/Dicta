import { describe, expect, it } from 'vitest';
import { AdaptiveDictationController } from '../src/core/adaptive/AdaptiveDictationController';
import type { AdaptivePacingInput } from '../src/core/adaptive/types';
import { resolveBrowserTtsAdaptiveProfile } from '../src/inputs/browserTts/browserTtsAdaptiveProfiles';
import { buildHistory, buildLive } from './helpers/adaptiveSemanticFixtures';

describe('AdaptiveDictationController semantic guardrails', () => {
  it('defers pause when struggling on unsafe boundary', () => {
    const controller = new AdaptiveDictationController();
    const input: AdaptivePacingInput = {
      live: buildLive({ canPauseAfter: false, phraseBoundaryType: 'unsafe' }),
      history: buildHistory(),
    };
    const decision = controller.decide(input);
    expect(decision.shouldPauseNow).toBe(false);
    expect(decision.deferPauseUntilSafeBoundary).toBe(true);
  });

  it('allows pause when struggling on safe boundary', () => {
    const controller = new AdaptiveDictationController();
    const input: AdaptivePacingInput = {
      live: buildLive({ canPauseAfter: true, phraseBoundaryType: 'clause' }),
      history: buildHistory(),
    };
    const decision = controller.decide(input);
    expect(decision.shouldPauseNow).toBe(true);
    expect(decision.deferPauseUntilSafeBoundary).toBe(false);
  });

  it('denies replay for low semantic completeness', () => {
    const controller = new AdaptiveDictationController();
    const input: AdaptivePacingInput = {
      live: buildLive({ canReplayIndependently: true, semanticCompleteness: 0.45 }),
      history: buildHistory(),
    };
    const decision = controller.decide(input);
    expect(decision.shouldReplayPhrase).toBe(false);
  });

  it('converts replay intent into recovery when phrase replay is not supported', () => {
    const controller = new AdaptiveDictationController();
    const input: AdaptivePacingInput = {
      live: buildLive({ lagSec: 3.1, accuracy: 0.78, canReplayIndependently: true, semanticCompleteness: 0.9 }),
      history: buildHistory(),
      capabilities: {
        supportsClausePause: false,
        supportsSentencePause: true,
        supportsPhraseReplay: false,
        supportsMidPhraseReplay: false,
        supportsDynamicRateChange: true,
        requiresPreChunking: true,
      },
    };
    const decision = controller.decide(input);
    expect(decision.shouldReplayPhrase).toBe(false);
    expect(decision.nextPhraseSize).toBe('short');
    expect(decision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(1200);
  });

  it('uses stabilized lagSec for decisions while rawLagSec remains diagnostic', () => {
    const controller = new AdaptiveDictationController();
    const input: AdaptivePacingInput = {
      live: buildLive({
        lagSec: 1.1,
        rawLagSec: -91.68,
        stableLagSec: -5,
        accuracy: 0.9,
        correctionRate: 0.04,
      }),
      history: buildHistory(),
    };
    const decision = controller.decide(input);
    expect(decision.mode).not.toBe('support');
  });

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
