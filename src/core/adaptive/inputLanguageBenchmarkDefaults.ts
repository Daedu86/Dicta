import type {
  InputLanguageBenchmarkMetrics,
  InputLanguageBenchmarkRecommendation,
  InputMode,
  LanguageCode,
} from './types';
import { normalizeBenchmarkLanguage } from './adaptiveBenchmarkLanguage';

export const ROLLING_WINDOW_DAYS = 30 as const;

export function createEmptyInputLanguageBenchmark(
  inputMode: InputMode,
  language: LanguageCode,
): InputLanguageBenchmarkMetrics {
  const recommendation = buildDefaultRecommendation();
  return {
    inputMode,
    language: normalizeBenchmarkLanguage(language),
    rollingWindowDays: ROLLING_WINDOW_DAYS,
    sessionCount: 0,
    sampleCount: 0,
    lastUpdatedAt: null,
    semanticFidelityScore: 1,
    controlFidelityScore: 1,
    learningEffectivenessScore: 0,
    flowStabilityScore: 1,
    sweetSpotScore: 0,
    averageAccuracy: 0,
    averageWpm: 0,
    averageLagSec: 0,
    rawAverageLagSec: 0,
    stableAverageLagSec: 0,
    medianLagSec: 0,
    p75LagSec: 0,
    p90AbsLagSec: 0,
    lagOutlierCount: 0,
    averageCorrectionRate: 0,
    semanticCutPenalty: 0,
    unsafePauseCount: 0,
    safePauseCount: 0,
    deferredPauseCount: 0,
    replayDeniedByBoundaryCount: 0,
    averageSemanticCompleteness: 1,
    averagePhraseDifficulty: 0,
    preferredPlaybackRate: 0.82,
    preferredPhraseSize: 'medium',
    preferredPauseAfterPhraseMs: 1200,
    recoveryScore: 0,
    timeToRecoveryMs: null,
    errorBurstLength: 0,
    modeSwitchFrequency: 0,
    rateVariance: 0,
    pauseVariance: 0,
    inputExecutionFidelityScore: 1,
    rateAccuracyBuckets: [],
    timeline: [],
    weakAreas: [],
    recommendation,
  };
}

export function buildDefaultRecommendation(): InputLanguageBenchmarkRecommendation {
  return {
    targetRateRange: [0.6, 1.15],
    targetPhraseSize: 'medium',
    targetPauseMs: 1200,
    nextTrainingFocus: ['Collect benchmark samples'],
    confidence: 0,
    summary: 'No benchmark samples yet.',
  };
}
