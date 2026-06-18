import { describe, expect, it } from 'vitest';
import { WINDOWS_DESKTOP_CHROME_RUNTIME } from './browserTtsRatePolicyTestUtils';
import {
  applyBrowserTtsDeRecoveryPolicyCase,
  createBrowserTtsRecoveryDecision,
  createBrowserTtsRecoveryPoint as point,
  summarizeBrowserTtsDeRecoveryCase,
} from './browserTtsRecoveryPolicyTestUtils';

describe('browserTtsDeRecoveryPolicy', () => {
  it('escalates recovery pause after 3 valid high-lag phrase_completed samples', () => {
    const { recovery, next } = applyBrowserTtsDeRecoveryPolicyCase({
      timeline: [
        point({ phraseIndex: 1, accuracy: 0.88 }),
        point({ phraseIndex: 2, accuracy: 0.88 }),
        point({ phraseIndex: 3, accuracy: 0.88 }),
      ],
    });

    expect(recovery.active).toBe(true);
    expect(recovery.level).toBe('strong');
    expect(recovery.shortChunkWordCap).toBe(4);
    expect(next.pauseAfterPhraseMs).toBeGreaterThanOrEqual(3200);
    expect(next.playbackRate).toBe(0.9);
    expect(next.nextPhraseSize).toBe('short');
  });

  it('does not lower rate for one valid lag spike', () => {
    const { recovery, next } = applyBrowserTtsDeRecoveryPolicyCase({
      timeline: [point({ lagSec: 4, rawLagSec: 4, stableLagSec: 4 })],
    });

    expect(recovery.active).toBe(false);
    expect(next.playbackRate).toBe(0.95);
  });

  it('blocks speed-up while accuracy is below 0.85 after repeated valid pressure', () => {
    const { recovery, next } = applyBrowserTtsDeRecoveryPolicyCase({
      timeline: [
        point({ lagSec: 0.8, rawLagSec: 0.8, stableLagSec: 0.8, accuracy: 0.82 }),
        point({ lagSec: 0.9, rawLagSec: 0.9, stableLagSec: 0.9, accuracy: 0.83 }),
      ],
      decision: createBrowserTtsRecoveryDecision({
        playbackRate: 1.02,
        mode: 'balanced',
        reason: 'mode=balanced',
      }),
    });

    expect(recovery.active).toBe(true);
    expect(recovery.level).toBe('moderate');
    expect(next.playbackRate).toBe(0.98);
    expect(next.pauseAfterPhraseMs).toBeGreaterThanOrEqual(2600);
  });

  it('uses severe fallback only for repeated high lag plus low accuracy', () => {
    const { recovery, next } = applyBrowserTtsDeRecoveryPolicyCase({
      timeline: [
        point({ lagSec: 4.1, rawLagSec: 4.1, stableLagSec: 4.1, accuracy: 0.74 }),
        point({ lagSec: 3.6, rawLagSec: 3.6, stableLagSec: 3.6, accuracy: 0.76 }),
      ],
      decision: createBrowserTtsRecoveryDecision({ playbackRate: 0.95 }),
    });

    expect(recovery.level).toBe('severe');
    expect(next.playbackRate).toBe(0.7);
    expect(next.pauseAfterPhraseMs).toBeGreaterThanOrEqual(3200);
  });

  it('exits recovery after recent valid low-lag high-accuracy phrases', () => {
    const recovery = summarizeBrowserTtsDeRecoveryCase({
      timeline: [
        point({ lagSec: 3.2, rawLagSec: 3.2, stableLagSec: 3.2, accuracy: 0.8 }),
        point({ lagSec: 0.8, rawLagSec: 0.8, stableLagSec: 0.8, accuracy: 0.91 }),
        point({ lagSec: 0.7, rawLagSec: 0.7, stableLagSec: 0.7, accuracy: 0.9 }),
        point({ lagSec: 0.6, rawLagSec: 0.6, stableLagSec: 0.6, accuracy: 0.92 }),
      ],
    });

    expect(recovery.active).toBe(false);
  });

  it('ignores unsafe and raw-outlier samples as direct recovery triggers', () => {
    const recovery = summarizeBrowserTtsDeRecoveryCase({
      timeline: [
        point({ rawLagSec: -84, lagSec: -5, stableLagSec: -5 }),
        point({ phraseBoundaryType: 'unsafe', semanticCompleteness: 0.35 }),
        point({ event: 'pause', lagSec: 4, rawLagSec: 4, stableLagSec: 4 }),
      ],
    });

    expect(recovery.active).toBe(false);
    expect(recovery.validCompletedSampleCount).toBe(0);
    expect(recovery.recentOutlierDiagnosticCount).toBe(1);
  });

  it('does not apply to EN, ES, FR, or PT benchmark samples', () => {
    for (const language of ['en', 'es', 'fr', 'pt'] as const) {
      const recovery = summarizeBrowserTtsDeRecoveryCase({
        timeline: [
          point({ language, lagSec: 3.5, rawLagSec: 3.5, stableLagSec: 3.5 }),
          point({ language, lagSec: 3.6, rawLagSec: 3.6, stableLagSec: 3.6 }),
          point({ language, lagSec: 3.7, rawLagSec: 3.7, stableLagSec: 3.7 }),
        ],
      });

      expect(recovery.active).toBe(false);
    }
  });

  it('does not apply to desktop runtimes', () => {
    const recovery = summarizeBrowserTtsDeRecoveryCase({
      timeline: [point(), point(), point()],
      runtime: WINDOWS_DESKTOP_CHROME_RUNTIME,
    });

    expect(recovery.active).toBe(false);
  });

  it('does not over-slow stable low-lag DE sessions', () => {
    const recovery = summarizeBrowserTtsDeRecoveryCase({
      timeline: [
        point({ lagSec: 0.7, rawLagSec: 0.7, stableLagSec: 0.7, accuracy: 0.92 }),
        point({ lagSec: 0.8, rawLagSec: 0.8, stableLagSec: 0.8, accuracy: 0.91 }),
        point({ lagSec: 0.9, rawLagSec: 0.9, stableLagSec: 0.9, accuracy: 0.93 }),
      ],
    });

    expect(recovery.active).toBe(false);
  });
});
