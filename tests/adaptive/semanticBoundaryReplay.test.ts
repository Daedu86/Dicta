import { describe, expect, it } from 'vitest';
import { AdaptiveDictationController } from '../../src/core/adaptive/AdaptiveDictationController';
import type { AdaptivePacingInput } from '../../src/core/adaptive/types';
import { buildHistory, buildLive } from '../helpers/adaptiveSemanticFixtures';

describe('AdaptiveDictationController semantic boundary and replay guardrails', () => {
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
});
