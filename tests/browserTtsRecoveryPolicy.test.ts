import { describe, expect, it } from 'vitest';
import {
  applyBrowserTtsDeRecoveryPolicy,
  summarizeBrowserTtsDeRecoveryState,
} from '../src/inputs/browserTts/browserTtsRecoveryPolicy';
import { resolveBrowserTtsAdaptiveProfile } from '../src/inputs/browserTts/browserTtsAdaptiveProfiles';
import type { AdaptiveTimelinePoint, PacingDecision } from '../src/core/adaptive/types';

const android = {
  userAgent: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S901B) AppleWebKit/537.36 Chrome/148.0 Mobile Safari/537.36',
  platform: 'Linux armv8l',
  maxTouchPoints: 5,
};

function point(overrides: Partial<AdaptiveTimelinePoint> = {}): AdaptiveTimelinePoint {
  return {
    timestampMs: Date.now(),
    inputMode: 'browser-tts',
    language: 'de',
    mode: 'support',
    playbackRate: 0.95,
    accuracy: 0.82,
    lagSec: 3.1,
    rawLagSec: 3.1,
    stableLagSec: 3.1,
    wpm: 48,
    pauseMs: 1200,
    correctionRate: 0,
    phraseBoundaryType: 'sentence',
    semanticCompleteness: 1,
    event: 'phrase_completed',
    phraseId: 'p',
    phraseIndex: 0,
    sessionId: 's',
    ...overrides,
  };
}

function decision(overrides: Partial<PacingDecision> = {}): PacingDecision {
  return {
    mode: 'support',
    playbackRate: 0.95,
    pauseAfterPhraseMs: 1600,
    shouldPauseNow: true,
    shouldReplayPhrase: false,
    boundaryStrictness: 'clause',
    allowMidPhrasePause: false,
    deferPauseUntilSafeBoundary: false,
    replayRate: 0.9,
    nextPhraseSize: 'short',
    reason: 'mode=support, support-needed',
    lagScore: 0.2,
    accuracyScore: 0.5,
    hesitationScore: 0.5,
    confidenceScore: 0.5,
    ...overrides,
  };
}

describe('browserTtsDeRecoveryPolicy', () => {
  const deProfile = resolveBrowserTtsAdaptiveProfile('de');

  it('escalates recovery pause after 3 valid high-lag phrase_completed samples', () => {
    const recovery = summarizeBrowserTtsDeRecoveryState({
      timeline: [
        point({ phraseIndex: 1, accuracy: 0.88 }),
        point({ phraseIndex: 2, accuracy: 0.88 }),
        point({ phraseIndex: 3, accuracy: 0.88 }),
      ],
      ...android,
    });
    const next = applyBrowserTtsDeRecoveryPolicy({ decision: decision(), recovery, profile: deProfile });

    expect(recovery.active).toBe(true);
    expect(recovery.level).toBe('strong');
    expect(recovery.shortChunkWordCap).toBe(4);
    expect(next.pauseAfterPhraseMs).toBeGreaterThanOrEqual(2600);
    expect(next.playbackRate).toBe(0.84);
    expect(next.nextPhraseSize).toBe('short');
  });

  it('does not lower rate for one valid lag spike', () => {
    const recovery = summarizeBrowserTtsDeRecoveryState({
      timeline: [point({ lagSec: 4, rawLagSec: 4, stableLagSec: 4 })],
      ...android,
    });
    const next = applyBrowserTtsDeRecoveryPolicy({ decision: decision(), recovery, profile: deProfile });

    expect(recovery.active).toBe(false);
    expect(next.playbackRate).toBe(0.95);
  });

  it('blocks speed-up while accuracy is below 0.85 after repeated valid pressure', () => {
    const recovery = summarizeBrowserTtsDeRecoveryState({
      timeline: [
        point({ lagSec: 0.8, rawLagSec: 0.8, stableLagSec: 0.8, accuracy: 0.82 }),
        point({ lagSec: 0.9, rawLagSec: 0.9, stableLagSec: 0.9, accuracy: 0.83 }),
      ],
      ...android,
    });
    const next = applyBrowserTtsDeRecoveryPolicy({
      decision: decision({ playbackRate: 1.02, mode: 'balanced', reason: 'mode=balanced' }),
      recovery,
      profile: deProfile,
    });

    expect(recovery.active).toBe(true);
    expect(recovery.level).toBe('moderate');
    expect(next.playbackRate).toBe(0.88);
    expect(next.pauseAfterPhraseMs).toBeGreaterThanOrEqual(2200);
  });

  it('uses severe fallback only for repeated high lag plus low accuracy', () => {
    const recovery = summarizeBrowserTtsDeRecoveryState({
      timeline: [
        point({ lagSec: 4.1, rawLagSec: 4.1, stableLagSec: 4.1, accuracy: 0.74 }),
        point({ lagSec: 3.6, rawLagSec: 3.6, stableLagSec: 3.6, accuracy: 0.76 }),
      ],
      ...android,
    });
    const next = applyBrowserTtsDeRecoveryPolicy({ decision: decision({ playbackRate: 0.95 }), recovery, profile: deProfile });

    expect(recovery.level).toBe('severe');
    expect(next.playbackRate).toBe(0.8);
    expect(next.pauseAfterPhraseMs).toBeGreaterThanOrEqual(2600);
  });

  it('exits recovery after recent valid low-lag high-accuracy phrases', () => {
    const recovery = summarizeBrowserTtsDeRecoveryState({
      timeline: [
        point({ lagSec: 3.2, rawLagSec: 3.2, stableLagSec: 3.2, accuracy: 0.8 }),
        point({ lagSec: 0.8, rawLagSec: 0.8, stableLagSec: 0.8, accuracy: 0.91 }),
        point({ lagSec: 0.7, rawLagSec: 0.7, stableLagSec: 0.7, accuracy: 0.9 }),
        point({ lagSec: 0.6, rawLagSec: 0.6, stableLagSec: 0.6, accuracy: 0.92 }),
      ],
      ...android,
    });

    expect(recovery.active).toBe(false);
  });

  it('ignores unsafe and raw-outlier samples as direct recovery triggers', () => {
    const recovery = summarizeBrowserTtsDeRecoveryState({
      timeline: [
        point({ rawLagSec: -84, lagSec: -5, stableLagSec: -5 }),
        point({ phraseBoundaryType: 'unsafe', semanticCompleteness: 0.35 }),
        point({ event: 'pause', lagSec: 4, rawLagSec: 4, stableLagSec: 4 }),
      ],
      ...android,
    });

    expect(recovery.active).toBe(false);
    expect(recovery.validCompletedSampleCount).toBe(0);
    expect(recovery.recentOutlierDiagnosticCount).toBe(1);
  });

  it('does not apply to EN or ES benchmark samples', () => {
    for (const language of ['en', 'es'] as const) {
      const recovery = summarizeBrowserTtsDeRecoveryState({
        timeline: [
          point({ language, lagSec: 3.5, rawLagSec: 3.5, stableLagSec: 3.5 }),
          point({ language, lagSec: 3.6, rawLagSec: 3.6, stableLagSec: 3.6 }),
          point({ language, lagSec: 3.7, rawLagSec: 3.7, stableLagSec: 3.7 }),
        ],
        ...android,
      });
      expect(recovery.active).toBe(false);
    }
  });

  it('does not apply to desktop runtimes', () => {
    const recovery = summarizeBrowserTtsDeRecoveryState({
      timeline: [point(), point(), point()],
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148.0 Safari/537.36',
      platform: 'Win32',
      maxTouchPoints: 0,
    });

    expect(recovery.active).toBe(false);
  });

  it('does not over-slow stable low-lag DE sessions', () => {
    const recovery = summarizeBrowserTtsDeRecoveryState({
      timeline: [
        point({ lagSec: 0.7, rawLagSec: 0.7, stableLagSec: 0.7, accuracy: 0.92 }),
        point({ lagSec: 0.8, rawLagSec: 0.8, stableLagSec: 0.8, accuracy: 0.91 }),
        point({ lagSec: 0.9, rawLagSec: 0.9, stableLagSec: 0.9, accuracy: 0.93 }),
      ],
      ...android,
    });

    expect(recovery.active).toBe(false);
  });
});
