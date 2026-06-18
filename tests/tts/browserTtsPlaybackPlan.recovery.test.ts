import { describe, expect, it } from 'vitest';

import { buildBrowserTtsPlaybackPlan } from '../../src/app/browserTtsPlaybackPlan';
import { resolveBrowserTtsAdaptiveProfile } from '../../src/inputs/browserTts/browserTtsAdaptiveProfiles';
import {
  benchmark,
  decision,
  input,
  liveSignal,
  recovery,
} from '../helpers/browserTtsPlaybackPlanFixtures';

describe('buildBrowserTtsPlaybackPlan recovery planning', () => {
  it('keeps legacy German recovery state out of normalized Browser TTS chunk planning', () => {
    const plan = buildBrowserTtsPlaybackPlan(input({
      language: 'de',
      macroWords: 'Wir hoeren den ersten Satz. Danach schreiben wir langsam weiter.'.split(' '),
      liveSignal: liveSignal({ accuracy: 78, lagSec: 3.2, rawLagSec: 3.2, stableLagSec: 3.2 }),
      browserTtsProfile: resolveBrowserTtsAdaptiveProfile('de'),
      browserTtsBenchmark: benchmark('de'),
      browserTtsRecovery: recovery({ active: true, level: 'strong', shortChunkWordCap: 4 }),
      adaptiveController: {
        decide: () => decision({ mode: 'support', reason: 'mode=support, support-needed', nextPhraseSize: 'short' }),
      },
    }));

    expect(plan?.recoverySafeBoundary).toBe(false);
    expect(plan?.germanShortBias).toBe(false);
    expect(plan?.runtimeDecision.reason).not.toContain('browser-tts-de-recovery');
    expect(plan?.runtimeDecision.pauseAfterPhraseMs).toBeLessThan(2600);
  });
});
