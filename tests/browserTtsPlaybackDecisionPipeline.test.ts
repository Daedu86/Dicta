import { describe, expect, it } from 'vitest';
import {
  applyBrowserTtsEnBenchmarkRecoveryPolicy,
} from '../src/app/browserTtsPlaybackDecisionPipeline';
import { resolveBrowserTtsAdaptiveProfile } from '../src/inputs/browserTts/browserTtsAdaptiveProfiles';
import type {
  InputLanguageBenchmarkMetrics,
  PacingDecision,
} from '../src/core/adaptive/types';

const EN_BROWSER_TTS_PROFILE = resolveBrowserTtsAdaptiveProfile('en');

const BASE_DECISION: PacingDecision = {
  mode: 'balanced',
  playbackRate: 0.88,
  pauseAfterPhraseMs: 900,
  shouldPauseNow: false,
  shouldReplayPhrase: false,
  boundaryStrictness: 'sentence',
  allowMidPhrasePause: false,
  deferPauseUntilSafeBoundary: false,
  replayRate: 0.82,
  nextPhraseSize: 'medium',
  reason: 'mode=balanced',
  reasonCodes: ['mode-balanced'],
  lagScore: 0.2,
  accuracyScore: 0.95,
  hesitationScore: 0.1,
  confidenceScore: 0.7,
};

function buildBenchmark(overrides: Partial<InputLanguageBenchmarkMetrics> = {}): InputLanguageBenchmarkMetrics {
  return {
    inputMode: 'browser-tts',
    language: 'en',
    rollingWindowDays: 20,
    sessionCount: 0,
    sampleCount: 0,
    lastUpdatedAt: null,
    semanticFidelityScore: 0.8,
    controlFidelityScore: 0.7,
    learningEffectivenessScore: 0.7,
    flowStabilityScore: 0.7,
    sweetSpotScore: 0.7,
    averageAccuracy: 0.94,
    averageWpm: 24,
    averageLagSec: 0.5,
    rawAverageLagSec: 0.5,
    stableAverageLagSec: 0.5,
    medianLagSec: 0.5,
    p75LagSec: 0.8,
    p90AbsLagSec: 1.2,
    lagOutlierCount: 0,
    averageCorrectionRate: 0.05,
    semanticCutPenalty: 0,
    unsafePauseCount: 0,
    safePauseCount: 1,
    deferredPauseCount: 0,
    replayDeniedByBoundaryCount: 0,
    averageSemanticCompleteness: 1,
    averagePhraseDifficulty: 0.3,
    preferredPlaybackRate: 0.8,
    preferredPhraseSize: 'short',
    preferredPauseAfterPhraseMs: 2600,
    recoveryScore: 0.6,
    timeToRecoveryMs: null,
    errorBurstLength: 0,
    modeSwitchFrequency: 0,
    rateVariance: 0,
    pauseVariance: 0,
    inputExecutionFidelityScore: 0.8,
    rateAccuracyBuckets: [],
    timeline: [],
    environmentChanged: false,
    weakAreas: [],
    recommendation: {
      targetRateRange: [0.76, 0.84],
      targetPhraseSize: 'short',
      targetPauseMs: 2600,
      nextTrainingFocus: ['stabilize English Browser TTS pacing'],
      confidence: 0.02,
      summary: 'Cold-start English Browser TTS benchmark should stay conservative.',
    },
    ...overrides,
  };
}

describe('applyBrowserTtsEnBenchmarkRecoveryPolicy', () => {
  it('uses low-confidence EN benchmark recommendations as a hard intra-chunk slowdown clamp', () => {
    const result = applyBrowserTtsEnBenchmarkRecoveryPolicy({
      decision: BASE_DECISION,
      browserTtsBenchmark: buildBenchmark(),
      profile: EN_BROWSER_TTS_PROFILE,
    });

    expect(result.playbackRate).toBe(0.66);
    expect(result.replayRate).toBeLessThanOrEqual(result.playbackRate);
    expect(result.pauseAfterPhraseMs).toBeGreaterThanOrEqual(2600);
    expect(result.shouldPauseNow).toBe(true);
    expect(result.nextPhraseSize).toBe('short');
    expect(result.reason).toContain('browser-tts-en-benchmark-recovery');
    expect(result.reason).toContain('browser-tts-en-intrachunk-slowdown');
    expect(result.reasonCodes).toContain('low-history-confidence');
    expect(result.reasonCodes).toContain('support-needed');
  });

  it('slows even more and adds extra pause when the EN browser TTS environment changed', () => {
    const result = applyBrowserTtsEnBenchmarkRecoveryPolicy({
      decision: BASE_DECISION,
      browserTtsBenchmark: buildBenchmark({
        environmentChanged: true,
        recommendation: {
          targetRateRange: [0.74, 0.8],
          targetPhraseSize: 'short',
          targetPauseMs: 2600,
          nextTrainingFocus: ['recalibrate after voice change'],
          confidence: 0.12,
          summary: 'Environment changed.',
        },
      }),
      profile: EN_BROWSER_TTS_PROFILE,
    });

    expect(result.playbackRate).toBe(0.62);
    expect(result.pauseAfterPhraseMs).toBeGreaterThanOrEqual(3000);
    expect(result.reasonCodes).toContain('environment-pressure');
  });

  it('leaves stable non-EN benchmarks unchanged', () => {
    const result = applyBrowserTtsEnBenchmarkRecoveryPolicy({
      decision: BASE_DECISION,
      browserTtsBenchmark: buildBenchmark({
        language: 'es',
        sampleCount: 12,
        sessionCount: 3,
        recommendation: {
          targetRateRange: [0.9, 1],
          targetPhraseSize: 'medium',
          targetPauseMs: 1200,
          nextTrainingFocus: [],
          confidence: 0.8,
          summary: 'Stable.',
        },
      }),
      profile: EN_BROWSER_TTS_PROFILE,
    });

    expect(result).toBe(BASE_DECISION);
  });
});
