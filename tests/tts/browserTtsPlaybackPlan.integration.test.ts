import { describe, expect, it } from 'vitest';

import { buildBrowserTtsPlaybackPlan } from '../../src/app/browserTtsPlaybackPlan';
import { AdaptiveDictationController } from '../../src/core/adaptive/AdaptiveDictationController';
import {
  attempt,
  benchmark,
  historyProfile,
  input,
  liveSignal,
} from '../helpers/browserTtsPlaybackPlanFixtures';

describe('buildBrowserTtsPlaybackPlan adaptive integration', () => {
  it('still allows integration with the adaptive controller', () => {
    const controller = new AdaptiveDictationController();
    const plan = buildBrowserTtsPlaybackPlan(input({
      adaptiveController: controller,
      historyProfile: historyProfile({
        recommendedRates: {
          support: 0.75,
          balanced: 0.9,
          flow: 0.98,
        },
      }),
      liveSignal: liveSignal({ accuracy: 96, lagSec: 0.7, rawLagSec: 0.7, stableLagSec: 0.7 }),
      browserTtsBenchmark: benchmark('en', {
        recentAttempts: [attempt({ accuracy: 0.94, wordsPerMinute: 48 })],
      }),
    }));

    expect(plan).not.toBeNull();
    expect(plan?.runtimeDecision.reason).toContain('mode=');
  });
});
