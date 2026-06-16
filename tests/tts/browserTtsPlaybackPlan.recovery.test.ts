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
  it('uses German recovery-safe chunks when strong DE recovery is active', () => {
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

    expect(plan?.recoverySafeBoundary).toBe(true);
    expect(plan?.chunk.wordCount).toBe(5);
    expect(plan?.chunk.phraseBoundaryType).toBe('sentence');
    expect(plan?.runtimeDecision.reason).toContain('browser-tts-de-recovery-strong');
    expect(plan?.runtimeDecision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(2600);
  });
});
