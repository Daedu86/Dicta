import type { AdaptiveTimelinePoint, AdaptiveWeakArea, InputLanguageBenchmarkMetrics } from './types';
import { resolveBrowserTtsAdaptiveProfile } from '../../inputs/browserTts/browserTtsAdaptiveProfiles';
import {
  BROWSER_TTS_DE_CLEAN_RECENT_MAX_ABS_LAG_SEC,
  BROWSER_TTS_DE_CLEAN_RECENT_MIN_ACCURACY,
  BROWSER_TTS_DE_CLEAN_RECENT_MIN_COUNT,
  BROWSER_TTS_DE_CONSERVATIVE_PAUSE_MS,
  BROWSER_TTS_DE_LOW_CONFIDENCE_RATE_RANGE,
  BROWSER_TTS_DE_MIN_CONFIDENT_SAMPLES,
  BROWSER_TTS_DE_PRESSURE_TIMELINE_WINDOW,
  BROWSER_TTS_DE_RECENT_PRESSURE_SAMPLE_COUNT,
  isBrowserTtsDe,
  normalizeAccuracy,
} from './browserTtsDeBenchmarkCore';
import {
  getBrowserTtsDeBenchmarkRejectionReason,
  includesDiagnosticReason,
  isValidBrowserTtsDeBenchmarkSample,
} from './browserTtsDeBenchmarkSamples';

export type BrowserTtsDeTimelinePressure = {
  validScoringSampleCount: number;
  supportRatio: number;
  unsafeBoundaryRatio: number;
  severeRawLagOutlierCount: number;
  severeRecoveryRatio: number;
  unsafeChunkRatio: number;
  highLagRatio: number;
  lowAccuracyRatio: number;
  technicalTimingIssueCount: number;
  hasRecentCleanCompletedSamples: boolean;
  hasLearnerRecoveryPressure: boolean;
  shouldUseConservativeRecommendation: boolean;
};

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
  const supportCount = learnerPressurePoints.filter((point) => point.mode === 'support' || includesDiagnosticReason(point, 'support-needed')).length;
  const unsafeBoundaryCount = pressurePoints.filter((point) => point.phraseBoundaryType === 'unsafe' || includesDiagnosticReason(point, 'replay-blocked-boundary')).length;
  const severeRawLagOutlierCount = pressurePoints.filter((point) => typeof point.rawLagSec === 'number' && Number.isFinite(point.rawLagSec) && Math.abs(point.rawLagSec) > 10).length;
  const technicalTimingIssueCount = pressurePoints.filter(isBrowserTtsDeTechnicalTimingIssue).length;
  const severeRecoveryCount = learnerPressurePoints.filter((point) =>
    includesDiagnosticReason(point, 'browser-tts-de-recovery-severe') &&
    hasBrowserTtsDeLearnerPressure(point)
  ).length;
  const unsafeChunkCount = pressurePoints.filter((point) => includesDiagnosticReason(point, 'unsafe-boundary-conservative')).length;
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

export function isBrowserTtsDeTechnicalTimingIssue(point: AdaptiveTimelinePoint): boolean {
  const reason = getBrowserTtsDeBenchmarkRejectionReason(point);
  return (
    reason === 'stale_tts_progress' ||
    reason === 'rawLagSec_missing_or_non_finite' ||
    reason === 'lagSec_non_finite' ||
    reason === 'stableLagSec_non_finite' ||
    reason === 'lag_clipped_to_sentinel' ||
    reason === 'rawLagSec_out_of_range'
  );
}

export function hasBrowserTtsDeHighLagPressure(point: AdaptiveTimelinePoint): boolean {
  const lagSec = typeof point.stableLagSec === 'number' ? point.stableLagSec : point.lagSec;
  return Number.isFinite(lagSec) && lagSec !== -5 && lagSec > 2;
}

export function hasBrowserTtsDeLowAccuracyPressure(point: AdaptiveTimelinePoint): boolean {
  return normalizeAccuracy(point.accuracy) < 0.75;
}

export function hasBrowserTtsDeLearnerPressure(point: AdaptiveTimelinePoint): boolean {
  return hasBrowserTtsDeHighLagPressure(point) || hasBrowserTtsDeLowAccuracyPressure(point);
}

export function hasCleanRecentBrowserTtsDeCompletedSamples(validCompletedSamples: AdaptiveTimelinePoint[]): boolean {
  const recentCompletedSamples = validCompletedSamples.slice(-BROWSER_TTS_DE_RECENT_PRESSURE_SAMPLE_COUNT);
  const cleanSampleCount = recentCompletedSamples.filter((point) => {
    const lagSec = typeof point.stableLagSec === 'number' ? point.stableLagSec : point.lagSec;
    return (
      normalizeAccuracy(point.accuracy) >= BROWSER_TTS_DE_CLEAN_RECENT_MIN_ACCURACY &&
      Number.isFinite(lagSec) &&
      Math.abs(lagSec) <= BROWSER_TTS_DE_CLEAN_RECENT_MAX_ABS_LAG_SEC
    );
  }).length;
  return cleanSampleCount >= BROWSER_TTS_DE_CLEAN_RECENT_MIN_COUNT;
}

export function deriveBrowserTtsDeTimelineWeakAreas(pressure: BrowserTtsDeTimelinePressure): AdaptiveWeakArea[] {
  const weakAreas: AdaptiveWeakArea[] = [];
  if (pressure.supportRatio > 0.5) weakAreas.push('support_dependency');
  if (pressure.unsafeBoundaryRatio > 0.1 || pressure.unsafeChunkRatio > 0.15) weakAreas.push('unsafe_boundary_pressure');
  if (pressure.highLagRatio > 0.15 || pressure.severeRecoveryRatio > 0) weakAreas.push('lag_instability');
  if (pressure.lowAccuracyRatio > 0.2) weakAreas.push('accuracy_instability');
  return weakAreas;
}

export function buildBrowserTtsDePressureSummary(pressure: BrowserTtsDeTimelinePressure): string {
  if (pressure.severeRecoveryRatio > 0) {
    return 'Browser TTS DE is in severe recovery pressure.';
  }
  if (!pressure.hasRecentCleanCompletedSamples && (pressure.technicalTimingIssueCount > 0 || pressure.severeRawLagOutlierCount > 0)) {
    return 'Browser TTS DE has lag alignment diagnostics, so benchmark confidence is low.';
  }
  if (pressure.supportRatio > 0.5) {
    return 'Browser TTS DE support-mode pressure remains high.';
  }
  return 'Browser TTS DE benchmark confidence is low.';
}

export function dedupeBrowserTtsDeScoringTimeline(timeline: AdaptiveTimelinePoint[]): AdaptiveTimelinePoint[] {
  const byPhrase = new Map<string, AdaptiveTimelinePoint>();
  for (let index = 0; index < timeline.length; index += 1) {
    const point = timeline[index];
    const key = typeof point.phraseIndex === 'number'
      ? `${point.sessionId ?? 'unknown'}:${point.phraseIndex}`
      : `sample:${point.timestampMs}:${index}`;
    const existing = byPhrase.get(key);
    if (!existing || scoreBrowserTtsDeScoringEvent(point.event) >= scoreBrowserTtsDeScoringEvent(existing.event)) {
      byPhrase.set(key, point);
    }
  }
  return [...byPhrase.values()].sort((a, b) => a.timestampMs - b.timestampMs);
}

export function scoreBrowserTtsDeScoringEvent(event: AdaptiveTimelinePoint['event']): number {
  if (event === 'phrase_completed') return 3;
  if (event === 'phrase_advance') return 2;
  if (event === 'support_entered' || event === 'flow_entered' || event === 'rate_change') return 1;
  return 0;
}

export function buildBrowserTtsDeConservativeFocus(weakAreas: AdaptiveWeakArea[]): string[] {
  const focus: string[] = [];
  if (weakAreas.includes('accuracy_instability') || weakAreas.includes('low_accuracy')) focus.push('accuracy stability');
  if (weakAreas.includes('lag') || weakAreas.includes('lag_instability')) focus.push('lag control');
  if (weakAreas.includes('unsafe_boundary_pressure') || weakAreas.includes('unsafe_boundaries')) focus.push('safe semantic boundaries');
  if (weakAreas.includes('support_dependency')) focus.push('reduce support dependency');
  if (focus.length === 0) {
    focus.push('accuracy stability', 'lag control', 'safe semantic boundaries', 'reduce support dependency');
  }
  return [...new Set(focus)];
}

export function computeBrowserTtsDeSemanticCounters(timeline: AdaptiveTimelinePoint[]): Pick<
  InputLanguageBenchmarkMetrics,
  'semanticCutPenalty' | 'unsafePauseCount' | 'safePauseCount' | 'deferredPauseCount' | 'replayDeniedByBoundaryCount'
> {
  const unsafePauseCount = timeline.filter((point) => point.event === 'pause' && point.phraseBoundaryType === 'unsafe').length;
  const safePauseCount = timeline.filter((point) => point.event === 'pause' && point.phraseBoundaryType !== 'unsafe').length;
  const deferredPauseCount = timeline.filter((point) => point.event === 'defer_pause').length;
  const replayDeniedByBoundaryCount = timeline.filter(
    (point) => point.event === 'replay' && ((point.semanticCompleteness ?? 1) < 0.65 || point.phraseBoundaryType === 'unsafe'),
  ).length;
  return {
    semanticCutPenalty: unsafePauseCount + deferredPauseCount * 0.35 + replayDeniedByBoundaryCount * 0.5,
    unsafePauseCount,
    safePauseCount,
    deferredPauseCount,
    replayDeniedByBoundaryCount,
  };
}
