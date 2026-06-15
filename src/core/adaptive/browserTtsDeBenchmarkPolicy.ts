import { appendLegacyReasonToken } from './pacingReasonCodes';
import type {
  AdaptiveTimelinePoint,
  AdaptiveWeakArea,
  InputLanguageBenchmarkMetrics,
  LiveTelemetryFrame,
  PacingDecision,
} from './types';
import { resolveBrowserTtsAdaptiveProfile } from '../../inputs/browserTts/browserTtsAdaptiveProfiles';
import { normalizeBenchmarkLanguage } from './adaptiveBenchmarkLanguage';

const BROWSER_TTS_DE_MAX_RATE_MARGIN = 0.01;
const BROWSER_TTS_DE_MIN_CONFIDENT_SAMPLES = 30;
const BROWSER_TTS_DE_RAW_LAG_MIN_SEC = -2;
const BROWSER_TTS_DE_RAW_LAG_MAX_SEC = 8;
const BROWSER_TTS_DE_LOW_CONFIDENCE_RATE_RANGE: [number, number] = [0.95, 1];
const BROWSER_TTS_DE_CONSERVATIVE_PAUSE_MS = 1200;
const BROWSER_TTS_DE_RECENT_PRESSURE_SAMPLE_COUNT = 5;
const BROWSER_TTS_DE_CLEAN_RECENT_MIN_COUNT = 3;
const BROWSER_TTS_DE_CLEAN_RECENT_MIN_ACCURACY = 0.84;
const BROWSER_TTS_DE_CLEAN_RECENT_MAX_ABS_LAG_SEC = 2;
const BROWSER_TTS_DE_PRESSURE_TIMELINE_WINDOW = 60;

type BrowserTtsDeTimelinePressure = {
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

export type BrowserTtsDeBenchmarkRejectionReason =
  | 'stale_tts_progress'
  | 'rawLagSec_missing_or_non_finite'
  | 'lagSec_non_finite'
  | 'stableLagSec_non_finite'
  | 'lag_clipped_to_sentinel'
  | 'rawLagSec_out_of_range'
  | 'wpm_not_positive_or_placeholder'
  | 'unsafe_phrase_boundary'
  | 'semantic_completeness_below_0.7'
  | 'event_not_scoring'
  | 'filtered_by_de_scoring_rule';

export type BrowserTtsDeDiagnostics = {
  targetPauseMs: number;
  runtimeRecoveryPauseMs: number | null;
  pauseGapMs: number;
  acceptedRecentTimelineSamples: number;
  rejectedRecentTimelineSamples: number;
  rejectionReasonCounts: Partial<Record<BrowserTtsDeBenchmarkRejectionReason, number>>;
  note: string;
  semanticPressureNote?: string;
};

export function isValidBrowserTtsDeBenchmarkSample(point: AdaptiveTimelinePoint): boolean {
  if (!isBrowserTtsDe(point.inputMode, point.language)) return true;
  const rawLagSec = point.rawLagSec;
  const lagSec = point.lagSec;
  const stableLagSec = point.stableLagSec;
  const semanticCompleteness = point.semanticCompleteness ?? 1;
  const hasValidPhrasePosition =
    (point.phraseIndex === undefined || (Number.isInteger(point.phraseIndex) && point.phraseIndex >= 0)) &&
    (typeof point.totalSemanticPhrases !== 'number' ||
      point.phraseIndex === undefined ||
      point.phraseIndex < point.totalSemanticPhrases);
  return (
    hasValidPhrasePosition &&
    typeof rawLagSec === 'number' &&
    Number.isFinite(rawLagSec) &&
    Number.isFinite(lagSec) &&
    (stableLagSec === undefined || Number.isFinite(stableLagSec)) &&
    rawLagSec >= BROWSER_TTS_DE_RAW_LAG_MIN_SEC &&
    rawLagSec <= BROWSER_TTS_DE_RAW_LAG_MAX_SEC &&
    rawLagSec !== -5 &&
    rawLagSec !== 5 &&
    lagSec !== -5 &&
    lagSec !== 5 &&
    stableLagSec !== -5 &&
    stableLagSec !== 5 &&
    point.wpm > 0 &&
    point.phraseBoundaryType !== 'unsafe' &&
    semanticCompleteness >= 0.7 &&
    isScoringTimelineEvent(point.event)
  );
}

export function getBrowserTtsDeBenchmarkRejectionReason(
  point: AdaptiveTimelinePoint,
): BrowserTtsDeBenchmarkRejectionReason | null {
  if (!isBrowserTtsDe(point.inputMode, point.language)) return null;
  if (isValidBrowserTtsDeBenchmarkSample(point)) return null;

  const rawLagSec = point.rawLagSec;
  const stableLagSec = point.stableLagSec;
  const hasValidPhrasePosition =
    (point.phraseIndex === undefined || (Number.isInteger(point.phraseIndex) && point.phraseIndex >= 0)) &&
    (typeof point.totalSemanticPhrases !== 'number' ||
      point.phraseIndex === undefined ||
      point.phraseIndex < point.totalSemanticPhrases);

  if (!hasValidPhrasePosition) return 'stale_tts_progress';
  if (typeof rawLagSec !== 'number' || !Number.isFinite(rawLagSec)) return 'rawLagSec_missing_or_non_finite';
  if (!Number.isFinite(point.lagSec)) return 'lagSec_non_finite';
  if (stableLagSec !== undefined && !Number.isFinite(stableLagSec)) return 'stableLagSec_non_finite';
  if (
    rawLagSec === -5 ||
    rawLagSec === 5 ||
    point.lagSec === -5 ||
    point.lagSec === 5 ||
    stableLagSec === -5 ||
    stableLagSec === 5
  ) {
    return 'lag_clipped_to_sentinel';
  }
  if (rawLagSec < BROWSER_TTS_DE_RAW_LAG_MIN_SEC || rawLagSec > BROWSER_TTS_DE_RAW_LAG_MAX_SEC) {
    return 'rawLagSec_out_of_range';
  }
  if (point.wpm <= 0) return 'wpm_not_positive_or_placeholder';
  if (point.phraseBoundaryType === 'unsafe') return 'unsafe_phrase_boundary';
  if ((point.semanticCompleteness ?? 1) < 0.7) return 'semantic_completeness_below_0.7';
  if (!isScoringTimelineEvent(point.event)) return 'event_not_scoring';
  return 'filtered_by_de_scoring_rule';
}

export function buildBrowserTtsDeDiagnostics(
  profile: InputLanguageBenchmarkMetrics,
  recentPointLimit = 60,
): BrowserTtsDeDiagnostics | null {
  if (!isBrowserTtsDe(profile.inputMode, profile.language)) return null;

  const recentTimeline = profile.timeline.slice(-recentPointLimit);
  const targetPauseMs = Math.round(profile.recommendation?.targetPauseMs ?? profile.preferredPauseAfterPhraseMs ?? BROWSER_TTS_DE_CONSERVATIVE_PAUSE_MS);
  const runtimeRecoveryPauses = recentTimeline
    .filter(
      (point) =>
        includesDiagnosticReason(point, 'android-speech-rate-fallback') ||
        includesDiagnosticReason(point, 'browser-tts-de-recovery'),
    )
    .map((point) => point.pauseMs)
    .filter((pauseMs) => Number.isFinite(pauseMs) && pauseMs > 0);
  const runtimeRecoveryPauseMs = runtimeRecoveryPauses.length > 0 ? Math.max(...runtimeRecoveryPauses) : null;
  const pauseGapMs = runtimeRecoveryPauseMs === null ? 0 : Math.max(0, runtimeRecoveryPauseMs - targetPauseMs);
  const rejectionReasonCounts: Partial<Record<BrowserTtsDeBenchmarkRejectionReason, number>> = {};
  let acceptedRecentTimelineSamples = 0;
  let rejectedRecentTimelineSamples = 0;

  for (const point of recentTimeline) {
    const reason = getBrowserTtsDeBenchmarkRejectionReason(point);
    if (reason === null) {
      acceptedRecentTimelineSamples += 1;
    } else {
      rejectedRecentTimelineSamples += 1;
      rejectionReasonCounts[reason] = (rejectionReasonCounts[reason] ?? 0) + 1;
    }
  }

  const semanticPressureNote =
    profile.semanticFidelityScore >= 0.95 && profile.weakAreas.includes('unsafe_boundary_pressure')
      ? 'Semantic Fidelity can stay high because accepted benchmark samples are safe, while unsafe_boundary_pressure is derived from recent runtime pressure and rejected unsafe chunks.'
      : undefined;

  return {
    targetPauseMs,
    runtimeRecoveryPauseMs,
    pauseGapMs,
    acceptedRecentTimelineSamples,
    rejectedRecentTimelineSamples,
    rejectionReasonCounts,
    note:
      pauseGapMs > 0
        ? `targetPauseMs is the benchmark target; Browser TTS DE runtime recovery observed an executable Android/DE safety pause up to ${runtimeRecoveryPauseMs}ms.`
        : 'targetPauseMs is the benchmark target; no higher Browser TTS DE runtime recovery pause was observed in the recent timeline.',
    semanticPressureNote,
  };
}

export function clampBrowserTtsDeDecisionToRecommendation(
  decision: PacingDecision,
  metrics: InputLanguageBenchmarkMetrics | null | undefined,
): PacingDecision {
  if (!metrics || !isBrowserTtsDe(metrics.inputMode, metrics.language)) return decision;
  const targetRateRange = metrics.recommendation?.targetRateRange;
  if (!Array.isArray(targetRateRange) || targetRateRange.length !== 2) return decision;
  const [minRate, maxRate] = targetRateRange;
  if (!Number.isFinite(minRate) || !Number.isFinite(maxRate) || maxRate < minRate) return decision;
  const upper = maxRate + BROWSER_TTS_DE_MAX_RATE_MARGIN;
  const playbackRate = Number(clampNumber(decision.playbackRate, minRate, upper).toFixed(2));
  const replayRate = Number(clampNumber(decision.replayRate, minRate, upper).toFixed(2));
  if (playbackRate === decision.playbackRate && replayRate === decision.replayRate) return decision;
  return {
    ...decision,
    playbackRate,
    replayRate,
    reason: appendLegacyReasonToken(decision.reason, 'de-target-rate-clamp'),
  };
}

export function isBrowserTtsDe(inputMode: string | null | undefined, language?: string | null): boolean {
  return inputMode === 'browser-tts' && normalizeBenchmarkLanguage(language).toLowerCase() === 'de';
}

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

export function buildTimelineDecisionReason(
  live: LiveTelemetryFrame,
  decision: PacingDecision,
  sessionId?: string,
  phraseIndex?: number,
  totalSemanticPhrases?: number,
  event?: AdaptiveTimelinePoint['event'],
): string {
  if (!isBrowserTtsDe(live.inputMode, live.language)) return decision.reason;
  const diagnosticTokens = getBrowserTtsDeBenchmarkRejectionTokens({
    inputMode: live.inputMode,
    language: normalizeBenchmarkLanguage(live.language),
    timestampMs: 0,
    mode: decision.mode,
    playbackRate: decision.playbackRate,
    accuracy: live.accuracy,
    lagSec: live.lagSec,
    rawLagSec: live.rawLagSec ?? live.lagSec,
    stableLagSec: live.stableLagSec ?? live.lagSec,
    lagOutlierCount: live.lagOutlierCount,
    unsafeChunkCount: live.unsafeChunkCount,
    wpm: live.wpm,
    pauseMs: decision.pauseAfterPhraseMs,
    correctionRate: live.correctionRate,
    phraseBoundaryType: live.phraseBoundaryType,
    semanticCompleteness: live.semanticCompleteness ?? 1,
    sessionId,
    phraseId: live.phraseId,
    phraseIndex,
    totalSemanticPhrases,
    decisionReason: decision.reason,
    executionHint: decision.executionHint,
    event: event ?? deriveTimelineEvent(decision),
  });
  if (diagnosticTokens.length === 0) return decision.reason;
  const suffix = diagnosticTokens.join(', ');
  return appendLegacyReasonToken(decision.reason, suffix);
}

export function getBrowserTtsDeBenchmarkRejectionTokens(point: AdaptiveTimelinePoint): string[] {
  if (!isBrowserTtsDe(point.inputMode, point.language)) return [];
  const tokens: string[] = [];
  const rawLagSec = point.rawLagSec;
  const lagSec = point.lagSec;
  const stableLagSec = point.stableLagSec;
  if (
    (point.phraseIndex !== undefined && (!Number.isInteger(point.phraseIndex) || point.phraseIndex < 0)) ||
    (typeof point.totalSemanticPhrases === 'number' && point.phraseIndex !== undefined && point.phraseIndex >= point.totalSemanticPhrases)
  ) {
    tokens.push('stale-tts-progress');
  }
  if (
    typeof rawLagSec !== 'number' ||
    !Number.isFinite(rawLagSec) ||
    !Number.isFinite(lagSec) ||
    (stableLagSec !== undefined && !Number.isFinite(stableLagSec)) ||
    rawLagSec < BROWSER_TTS_DE_RAW_LAG_MIN_SEC ||
    rawLagSec > BROWSER_TTS_DE_RAW_LAG_MAX_SEC ||
    rawLagSec === -5 ||
    rawLagSec === 5 ||
    lagSec === -5 ||
    lagSec === 5 ||
    stableLagSec === -5 ||
    stableLagSec === 5
  ) {
    tokens.push('invalid-lag-alignment');
  }
  if (tokens.length > 0 || point.wpm <= 0 || point.phraseBoundaryType === 'unsafe' || (point.semanticCompleteness ?? 1) < 0.7 || !isScoringTimelineEvent(point.event)) {
    tokens.push('rejected-benchmark-sample');
  }
  return [...new Set(tokens)];
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

export function includesDiagnosticReason(point: AdaptiveTimelinePoint, token: string): boolean {
  return typeof point.decisionReason === 'string' && point.decisionReason.toLowerCase().includes(token);
}

export function isScoringTimelineEvent(event: AdaptiveTimelinePoint['event']): boolean {
  return (
    event === 'phrase_advance' ||
    event === 'phrase_completed' ||
    event === 'rate_change' ||
    event === 'support_entered' ||
    event === 'flow_entered'
  );
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

export function deriveTimelineEvent(decision: PacingDecision): AdaptiveTimelinePoint['event'] {
  if (decision.deferPauseUntilSafeBoundary) return 'defer_pause';
  if (decision.shouldReplayPhrase) return 'replay';
  if (decision.shouldPauseNow) return 'pause';
  if (decision.mode === 'support') return 'support_entered';
  if (decision.mode === 'flow') return 'flow_entered';
  return 'rate_change';
}

function normalizeAccuracy(value: number): number {
  return value > 1 ? clamp01(value / 100) : clamp01(value);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
