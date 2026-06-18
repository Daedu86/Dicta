import type { AdaptiveTimelinePoint, AdaptiveWeakArea, InputLanguageBenchmarkMetrics } from './types';
import {
  BROWSER_TTS_DE_CLEAN_RECENT_MAX_ABS_LAG_SEC,
  BROWSER_TTS_DE_CLEAN_RECENT_MIN_ACCURACY,
  BROWSER_TTS_DE_CLEAN_RECENT_MIN_COUNT,
  BROWSER_TTS_DE_RECENT_PRESSURE_SAMPLE_COUNT,
  normalizeAccuracy,
} from './browserTtsDeBenchmarkCore';
import {
  getBrowserTtsDeBenchmarkRejectionReason,
  includesDiagnosticReason,
} from './browserTtsDeBenchmarkSamples';
import type { BrowserTtsDeTimelinePressure } from './browserTtsDeBenchmarkPressureTypes';

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
  const hasCurrentLearnerPressure =
    pressure.highLagRatio > 0.15 ||
    pressure.lowAccuracyRatio > 0.2 ||
    pressure.severeRecoveryRatio > 0;
  if (pressure.supportRatio > 0.5 && hasCurrentLearnerPressure) weakAreas.push('support_dependency');
  if (!pressure.hasRecentCleanCompletedSamples && (pressure.unsafeBoundaryRatio > 0.1 || pressure.unsafeChunkRatio > 0.15)) {
    weakAreas.push('unsafe_boundary_pressure');
  }
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
  if (pressure.supportRatio > 0.5 && (pressure.highLagRatio > 0.15 || pressure.lowAccuracyRatio > 0.2 || pressure.severeRecoveryRatio > 0)) {
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

export function countBrowserTtsDeSupportPressure(points: AdaptiveTimelinePoint[]): number {
  return points.filter((point) => point.mode === 'support' || includesDiagnosticReason(point, 'support-needed')).length;
}
