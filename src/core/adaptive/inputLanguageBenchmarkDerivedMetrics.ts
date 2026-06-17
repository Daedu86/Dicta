import type { AdaptiveTimelinePoint, InputLanguageBenchmarkMetrics } from './types';
import { computeVariance } from './inputLanguageBenchmarkMath';
import {
  computeErrorBurstLength,
  computeModeSwitchFrequency,
  computeRateAccuracyBuckets,
  computeRecoveryScore,
  computeTimeToRecoveryMs,
} from './inputLanguageBenchmarkTimelineAnalytics';
import {
  computeControlFidelityScore,
  computeFlowStabilityScore,
  computeLearningEffectivenessScore,
  computeSemanticFidelityScore,
  computeSweetSpotScore,
} from './inputLanguageBenchmarkAggregateScores';
import {
  applyRecommendationHysteresis,
  computeBenchmarkRecommendation,
  deriveWeakAreas,
} from './inputLanguageBenchmarkRecommendation';

export function preserveUnscoredBenchmarkScoreState(
  next: InputLanguageBenchmarkMetrics,
  current: InputLanguageBenchmarkMetrics,
): InputLanguageBenchmarkMetrics {
  return {
    ...next,
    rateAccuracyBuckets: current.rateAccuracyBuckets,
    recoveryScore: current.recoveryScore,
    timeToRecoveryMs: current.timeToRecoveryMs,
    errorBurstLength: current.errorBurstLength,
    modeSwitchFrequency: current.modeSwitchFrequency,
    rateVariance: current.rateVariance,
    pauseVariance: current.pauseVariance,
    semanticFidelityScore: current.semanticFidelityScore,
    controlFidelityScore: current.controlFidelityScore,
    learningEffectivenessScore: current.learningEffectivenessScore,
    flowStabilityScore: current.flowStabilityScore,
    sweetSpotScore: current.sweetSpotScore,
    weakAreas: current.weakAreas,
    recommendation: current.recommendation,
  };
}

export function applyScoredBenchmarkDerivedMetrics(
  next: InputLanguageBenchmarkMetrics,
  scoringTimeline: AdaptiveTimelinePoint[],
): InputLanguageBenchmarkMetrics {
  next.rateAccuracyBuckets = computeRateAccuracyBuckets(scoringTimeline);
  next.recoveryScore = computeRecoveryScore(scoringTimeline);
  next.timeToRecoveryMs = computeTimeToRecoveryMs(scoringTimeline);
  next.errorBurstLength = computeErrorBurstLength(scoringTimeline);
  next.modeSwitchFrequency = computeModeSwitchFrequency(scoringTimeline);
  next.rateVariance = computeVariance(scoringTimeline.map((point) => point.playbackRate));
  next.pauseVariance = computeVariance(scoringTimeline.map((point) => point.pauseMs));
  next.semanticFidelityScore = computeSemanticFidelityScore(next);
  next.controlFidelityScore = computeControlFidelityScore(next);
  next.learningEffectivenessScore = computeLearningEffectivenessScore(next);
  next.flowStabilityScore = computeFlowStabilityScore(next);
  next.sweetSpotScore = computeSweetSpotScore(next);
  next.weakAreas = deriveWeakAreas(next);
  next.recommendation = applyRecommendationHysteresis(next, computeBenchmarkRecommendation(next));
  return next;
}
