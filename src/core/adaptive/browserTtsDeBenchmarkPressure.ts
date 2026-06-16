import type { InputLanguageBenchmarkMetrics } from './types';
import { resolveBrowserTtsAdaptiveProfile } from '../../inputs/browserTts/browserTtsAdaptiveProfiles';
import {
  BROWSER_TTS_DE_CONSERVATIVE_PAUSE_MS,
  BROWSER_TTS_DE_LOW_CONFIDENCE_RATE_RANGE,
  BROWSER_TTS_DE_MIN_CONFIDENT_SAMPLES,
  BROWSER_TTS_DE_PRESSURE_TIMELINE_WINDOW,
  BROWSER_TTS_DE_RECENT_PRESSURE_SAMPLE_COUNT,
  isBrowserTtsDe,
} from './browserTtsDeBenchmarkCore';
import { isValidBrowserTtsDeBenchmarkSample } from './browserTtsDeBenchmarkSamples';
import {
  buildBrowserTtsDeConservativeFocus,
  buildBrowserTtsDePressureSummary,
  countBrowserTtsDeSupportPressure,
  dedupeBrowserTtsDeScoringTimeline,
  deriveBrowserTtsDeTimelineWeakAreas,
  hasBrowserTtsDeHighLagPressure,
  hasBrowserTtsDeLearnerPressure,
  hasBrowserTtsDeLowAccuracyPressure,
  hasCleanRecentBrowserTtsDeCompletedSamples,
  isBrowserTtsDeTechnicalTimingIssue,
} from './browserTtsDeBenchmarkPressureSignals';
import type { BrowserTtsDeTimelinePressure } from './browserTtsDeBenchmarkPressureTypes';

export type { BrowserTtsDeTimelinePressure } from './browserTtsDeBenchmarkPressureTypes';
export {
  buildBrowserTtsDeConservativeFocus,
  buildBrowserTtsDePressureSummary,
  computeBrowserTtsDeSemanticCounters,
  dedupeBrowserTtsDeScoringTimeline,
  deriveBrowserTtsDeTimelineWeakAreas,
  hasBrowserTtsDeHighLagPressure,
  hasBrowserTtsDeLearnerPressure,
  hasBrowserTtsDeLowAccuracyPressure,
  hasCleanRecentBrowserTtsDeCompletedSamples,
  isBrowserTtsDeTechnicalTimingIssue,
  scoreBrowserTtsDeScoringEvent,
} from './browserTtsDeBenchmarkPressureSignals';

export function applyBrowserTtsDeTimelinePressureFallback(metrics: InputLanguageBenchmarkMetrics): InputLanguageBenchmarkMetrics {
  if (!isBrowserTtsDe(metrics.inputMode, metrics.language)) return metrics;
  const pressure = analyzeBrowserTtsDeTimelinePressure(metrics);
  if (!pressure.shouldUseConservativeRecommendation) return metrics;
  const profile = resolveBrowserTtsAdaptiveProfile('de');
  const recoveryPressure = pressure.hasLearnerRecoveryPressure;
  const recoveryRateRange: [number, number] = recoveryPressure ? [
    profile.supportRateFloor,
    Number(Math.min(profile.supportRateFloor + 0.05, profile.supportRateCeiling).toFixed(2)),
  ] : BROWSER_TTS_DE_LOW_CONFIDENCE_RATE_RANGE;
  const weakAreas = [...new Set([...metrics.weakAreas, ...deriveBrowserTtsDeTimelineWeakAreas(pressure)])];
  const nextTrainingFocus = buildBrowserTtsDeConservativeFocus(weakAreas);
  const flowStabilityScore = recoveryPressure ? Math.min(metrics.flowStabilityScore, 0.7) : metrics.flowStabilityScore;
  const sweetSpotScore = recoveryPressure ? Math.min(metrics.sweetSpotScore, 0.65) : metrics.sweetSpotScore;
  const pressureSummary = buildBrowserTtsDePressureSummary(pressure);
  const targetPauseMs = recoveryPressure
    ? BROWSER_TTS_DE_CONSERVATIVE_PAUSE_MS
    : (metrics.recommendation?.targetPauseMs ?? Math.round(metrics.preferredPauseAfterPhraseMs || 700));
  return {
    ...metrics,
    flowStabilityScore,
    sweetSpotScore,
    weakAreas,
    recommendation: {
      targetRateRange: recoveryRateRange,
      targetPhraseSize: 'short',
      targetPauseMs,
      nextTrainingFocus,
      confidence: Math.min(metrics.recommendation?.confidence ?? 0, recoveryPressure ? 0.2 : 0.3),
      summary:
        `${pressureSummary} ` +
        `Keep conservative DE browser-TTS ${recoveryPressure ? 'recovery' : 'low-confidence'} settings at ${recoveryRateRange[0].toFixed(2)}x-${recoveryRateRange[1].toFixed(2)}x with short semantic phrases and focus on ${nextTrainingFocus.join(', ')}.`,
    },
  };
}

export function analyzeBrowserTtsDeTimelinePressure(metrics: InputLanguageBenchmarkMetrics): BrowserTtsDeTimelinePressure {
  if (!isBrowserTtsDe(metrics.inputMode, metrics.language)) {
    return {
      validScoringSampleCount: metrics.sampleCount,
      supportRatio: 0,
      unsafeBoundaryRatio: 0,
      severeRawLagOutlierCount: 0,
      severeRecoveryRatio: 0,
      unsafeChunkRatio: 0,
      highLagRatio: 0,
      lowAccuracyRatio: 0,
      technicalTimingIssueCount: 0,
      hasRecentCleanCompletedSamples: false,
      hasLearnerRecoveryPressure: false,
      shouldUseConservativeRecommendation: false,
    };
  }
  const timeline = metrics.timeline.filter((point) => isBrowserTtsDe(point.inputMode, point.language));
  const validScoringSampleCount = timeline.filter(isValidBrowserTtsDeBenchmarkSample).length;
  const validScoringSamples = dedupeBrowserTtsDeScoringTimeline(timeline.filter(isValidBrowserTtsDeBenchmarkSample));
  const validCompletedSamples = validScoringSamples.filter((point) => point.event === 'phrase_completed');
  const recentValidCompletedSamples = validCompletedSamples.slice(-BROWSER_TTS_DE_RECENT_PRESSURE_SAMPLE_COUNT);
  const learnerPressurePoints = (recentValidCompletedSamples.length > 0
    ? recentValidCompletedSamples
    : validScoringSamples.slice(-BROWSER_TTS_DE_RECENT_PRESSURE_SAMPLE_COUNT));
  const recentTimeline = timeline.slice(-BROWSER_TTS_DE_PRESSURE_TIMELINE_WINDOW);
  const pressurePoints = recentTimeline.filter((point) => point.event !== 'defer_pause');
  const learnerDenominator = Math.max(1, learnerPressurePoints.length);
  const boundaryDenominator = Math.max(1, pressurePoints.length);
  const supportCount = countBrowserTtsDeSupportPressure(learnerPressurePoints);
  const unsafeBoundaryCount = pressurePoints.filter((point) => point.phraseBoundaryType === 'unsafe' || point.reasonCodes?.includes('replay-blocked-boundary')).length;
  const severeRawLagOutlierCount = pressurePoints.filter((point) => typeof point.rawLagSec === 'number' && Number.isFinite(point.rawLagSec) && Math.abs(point.rawLagSec) > 10).length;
  const technicalTimingIssueCount = pressurePoints.filter(isBrowserTtsDeTechnicalTimingIssue).length;
  const severeRecoveryCount = learnerPressurePoints.filter((point) =>
    point.reasonCodes?.includes('browser-tts-de-recovery-severe') &&
    hasBrowserTtsDeLearnerPressure(point)
  ).length;
  const unsafeChunkCount = pressurePoints.filter((point) => point.reasonCodes?.includes('unsafe-boundary-conservative')).length;
  const highLagCount = learnerPressurePoints.filter(hasBrowserTtsDeHighLagPressure).length;
  const lowAccuracyCount = learnerPressurePoints.filter(hasBrowserTtsDeLowAccuracyPressure).length;
  const supportRatio = supportCount / learnerDenominator;
  const unsafeBoundaryRatio = unsafeBoundaryCount / boundaryDenominator;
  const severeRecoveryRatio = severeRecoveryCount / learnerDenominator;
  const unsafeChunkRatio = unsafeChunkCount / boundaryDenominator;
  const highLagRatio = highLagCount / learnerDenominator;
  const lowAccuracyRatio = lowAccuracyCount / learnerDenominator;
  const hasRecentCleanCompletedSamples = hasCleanRecentBrowserTtsDeCompletedSamples(validCompletedSamples);
  const semanticBoundaryPressure = unsafeBoundaryRatio > 0.1 || unsafeChunkRatio > 0.15;
  const learnerPerformancePressure =
    supportRatio > 0.5 ||
    severeRecoveryRatio > 0 ||
    highLagRatio > 0.15 ||
    lowAccuracyRatio > 0.2;
  const hasLearnerRecoveryPressure = semanticBoundaryPressure || learnerPerformancePressure;
  return {
    validScoringSampleCount,
    supportRatio,
    unsafeBoundaryRatio,
    severeRawLagOutlierCount,
    severeRecoveryRatio,
    unsafeChunkRatio,
    highLagRatio,
    lowAccuracyRatio,
    technicalTimingIssueCount,
    hasRecentCleanCompletedSamples,
    hasLearnerRecoveryPressure,
    shouldUseConservativeRecommendation:
      metrics.sampleCount < BROWSER_TTS_DE_MIN_CONFIDENT_SAMPLES ||
      validScoringSampleCount < BROWSER_TTS_DE_MIN_CONFIDENT_SAMPLES ||
      (metrics.recommendation?.confidence ?? 1) < 0.3 ||
      hasLearnerRecoveryPressure,
  };
}
