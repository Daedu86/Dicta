import type {
  AdaptiveTimelinePoint,
  AdaptiveWeakArea,
  InputExecutionTelemetry,
  InputLanguageBenchmarkMetrics,
  InputLanguageBenchmarkRecommendation,
  InputMode,
  LanguageCode,
  LiveTelemetryFrame,
  PacingDecision,
  RateAccuracyBucket,
} from './types';
import { resolveBrowserTtsAdaptiveProfile } from '../../inputs/browserTts/browserTtsAdaptiveProfiles';

const ROLLING_WINDOW_DAYS = 30 as const;
const MAX_TIMELINE_POINTS = 450;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const BROWSER_TTS_DE_MAX_RATE_MARGIN = 0.01;
const BROWSER_TTS_DE_MIN_CONFIDENT_SAMPLES = 30;
const BROWSER_TTS_DE_CONSERVATIVE_RATE_RANGE: [number, number] = [0.95, 1];
const BROWSER_TTS_DE_CONSERVATIVE_PAUSE_MS = 1200;

type BrowserTtsDeTimelinePressure = {
  validScoringSampleCount: number;
  supportRatio: number;
  unsafeBoundaryRatio: number;
  severeRawLagOutlierCount: number;
  highLagRatio: number;
  lowAccuracyRatio: number;
  shouldUseConservativeRecommendation: boolean;
};

export type InputLanguageBenchmarkUpdateArgs = {
  current?: InputLanguageBenchmarkMetrics | null;
  live: LiveTelemetryFrame;
  decision: PacingDecision;
  execution?: InputExecutionTelemetry;
  timestampMs?: number;
  sessionId?: string;
  phraseIndex?: number;
  totalSemanticPhrases?: number;
  event?: AdaptiveTimelinePoint['event'];
};

export function normalizeBenchmarkLanguage(language?: string | null): LanguageCode {
  return language && language.trim() ? language : 'unknown';
}

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
    preferredPlaybackRate: 1,
    preferredPhraseSize: 'medium',
    preferredPauseAfterPhraseMs: 700,
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

export function updateInputLanguageBenchmark(args: InputLanguageBenchmarkUpdateArgs): InputLanguageBenchmarkMetrics {
  const timestampMs = args.timestampMs ?? Date.now();
  const language = normalizeBenchmarkLanguage(args.live.language);
  const current =
    args.current && args.current.inputMode === args.live.inputMode && args.current.language === language
      ? args.current
      : createEmptyInputLanguageBenchmark(args.live.inputMode, language);
  const semanticCompleteness = args.live.semanticCompleteness ?? 1;
  const phraseDifficulty = args.live.phraseDifficulty ?? 0;
  const canPauseAfter = args.live.canPauseAfter ?? true;
  const canReplayIndependently = args.live.canReplayIndependently ?? true;
  const replayDenied = args.decision.shouldReplayPhrase && (!canReplayIndependently || semanticCompleteness < 0.65);
  const safePause = args.decision.shouldPauseNow && canPauseAfter;
  const unsafePause = args.decision.shouldPauseNow && !canPauseAfter;
  const semanticCutPenalty = unsafePause ? 1 : args.decision.deferPauseUntilSafeBoundary ? 0.35 : 0;
  const executionFidelity = computeExecutionFidelity(args.execution);
  const timelinePoint: AdaptiveTimelinePoint = {
    timestampMs,
    inputMode: args.live.inputMode,
    language,
    mode: args.decision.mode,
    playbackRate: args.decision.playbackRate,
    accuracy: args.live.accuracy,
    lagSec: args.live.lagSec,
    rawLagSec: args.live.rawLagSec ?? args.live.lagSec,
    stableLagSec: args.live.stableLagSec ?? args.live.lagSec,
    lagOutlierCount: args.live.lagOutlierCount,
    unsafeChunkCount: args.live.unsafeChunkCount,
    wpm: args.live.wpm,
    pauseMs: args.decision.pauseAfterPhraseMs,
    correctionRate: args.live.correctionRate,
    phraseBoundaryType: args.live.phraseBoundaryType,
    semanticCompleteness,
    sessionId: args.sessionId,
    phraseId: args.live.phraseId,
    phraseIndex: args.phraseIndex,
    totalSemanticPhrases: args.totalSemanticPhrases,
    decisionReason: args.decision.reason,
    executionHint: args.decision.executionHint,
    event: args.event ?? deriveTimelineEvent(args.decision),
  };
  const timeline = pruneTimelineToRollingWindow([...current.timeline, timelinePoint], ROLLING_WINDOW_DAYS);
  const usesFilteredBrowserTtsDeScoring = isBrowserTtsDe(args.live.inputMode, language);
  const scoringTimeline = usesFilteredBrowserTtsDeScoring
    ? timeline.filter(isValidBrowserTtsDeBenchmarkSample)
    : timeline;
  const rawLagSeries = scoringTimeline.map((point) => point.rawLagSec ?? point.lagSec);
  const stableLagSeries = scoringTimeline.map((point) => point.stableLagSec ?? point.lagSec);
  const absoluteStableLagSeries = stableLagSeries.map((value) => Math.abs(value));
  const stableLagOutlierCount = rawLagSeries.filter((value) => Math.abs(value) > 5).length;
  const currentPointIsScored = !usesFilteredBrowserTtsDeScoring || isValidBrowserTtsDeBenchmarkSample(timelinePoint);
  const sampleCount = usesFilteredBrowserTtsDeScoring ? scoringTimeline.length : current.sampleCount + 1;
  const hasBrowserTtsDeScoringSamples = !usesFilteredBrowserTtsDeScoring || scoringTimeline.length > 0;
  const previousAverageCount = current.sampleCount;
  const latestScoredPoint = scoringTimeline[scoringTimeline.length - 1];
  const semanticCounters = usesFilteredBrowserTtsDeScoring && hasBrowserTtsDeScoringSamples
    ? computeBrowserTtsDeSemanticCounters(scoringTimeline)
    : usesFilteredBrowserTtsDeScoring
      ? {
          semanticCutPenalty: current.semanticCutPenalty,
          unsafePauseCount: current.unsafePauseCount,
          safePauseCount: current.safePauseCount,
          deferredPauseCount: current.deferredPauseCount,
          replayDeniedByBoundaryCount: current.replayDeniedByBoundaryCount,
        }
      : {
        semanticCutPenalty: current.semanticCutPenalty + semanticCutPenalty,
        unsafePauseCount: current.unsafePauseCount + (unsafePause ? 1 : 0),
        safePauseCount: current.safePauseCount + (safePause ? 1 : 0),
        deferredPauseCount: current.deferredPauseCount + (args.decision.deferPauseUntilSafeBoundary ? 1 : 0),
        replayDeniedByBoundaryCount: current.replayDeniedByBoundaryCount + (replayDenied ? 1 : 0),
      };
  const next: InputLanguageBenchmarkMetrics = {
    ...current,
    sessionCount: countUniqueSessions(usesFilteredBrowserTtsDeScoring ? scoringTimeline : timeline),
    sampleCount,
    lastUpdatedAt: new Date(timestampMs).toISOString(),
    averageAccuracy: usesFilteredBrowserTtsDeScoring && hasBrowserTtsDeScoringSamples
      ? average(scoringTimeline.map((point) => point.accuracy))
      : usesFilteredBrowserTtsDeScoring
        ? current.averageAccuracy
        : runningAverage(current.averageAccuracy, args.live.accuracy, previousAverageCount),
    averageWpm: usesFilteredBrowserTtsDeScoring && hasBrowserTtsDeScoringSamples
      ? average(scoringTimeline.map((point) => point.wpm))
      : usesFilteredBrowserTtsDeScoring
        ? current.averageWpm
        : runningAverage(current.averageWpm, args.live.wpm, previousAverageCount),
    averageLagSec: hasBrowserTtsDeScoringSamples ? average(stableLagSeries) : current.averageLagSec,
    rawAverageLagSec: hasBrowserTtsDeScoringSamples ? average(rawLagSeries) : current.rawAverageLagSec,
    stableAverageLagSec: hasBrowserTtsDeScoringSamples ? average(stableLagSeries) : current.stableAverageLagSec,
    medianLagSec: hasBrowserTtsDeScoringSamples ? percentile(stableLagSeries, 0.5) : current.medianLagSec,
    p75LagSec: hasBrowserTtsDeScoringSamples ? percentile(stableLagSeries, 0.75) : current.p75LagSec,
    p90AbsLagSec: hasBrowserTtsDeScoringSamples ? percentile(absoluteStableLagSeries, 0.9) : current.p90AbsLagSec,
    lagOutlierCount: hasBrowserTtsDeScoringSamples ? stableLagOutlierCount : current.lagOutlierCount,
    averageCorrectionRate: usesFilteredBrowserTtsDeScoring && hasBrowserTtsDeScoringSamples
      ? average(scoringTimeline.map((point) => point.correctionRate ?? 0))
      : usesFilteredBrowserTtsDeScoring
        ? current.averageCorrectionRate
        : runningAverage(current.averageCorrectionRate, args.live.correctionRate, previousAverageCount),
    semanticCutPenalty: semanticCounters.semanticCutPenalty,
    unsafePauseCount: semanticCounters.unsafePauseCount,
    safePauseCount: semanticCounters.safePauseCount,
    deferredPauseCount: semanticCounters.deferredPauseCount,
    replayDeniedByBoundaryCount: semanticCounters.replayDeniedByBoundaryCount,
    averageSemanticCompleteness: usesFilteredBrowserTtsDeScoring && hasBrowserTtsDeScoringSamples
      ? average(scoringTimeline.map((point) => point.semanticCompleteness ?? 1)) || 1
      : usesFilteredBrowserTtsDeScoring
        ? current.averageSemanticCompleteness
        : runningAverage(current.averageSemanticCompleteness, semanticCompleteness, previousAverageCount),
    averagePhraseDifficulty: usesFilteredBrowserTtsDeScoring
      ? currentPointIsScored
        ? runningAverage(current.averagePhraseDifficulty, phraseDifficulty, previousAverageCount)
        : current.averagePhraseDifficulty
      : runningAverage(current.averagePhraseDifficulty, phraseDifficulty, previousAverageCount),
    preferredPlaybackRate: usesFilteredBrowserTtsDeScoring
      ? (latestScoredPoint?.playbackRate ?? current.preferredPlaybackRate)
      : args.decision.playbackRate,
    preferredPhraseSize: args.decision.nextPhraseSize,
    preferredPauseAfterPhraseMs: usesFilteredBrowserTtsDeScoring
      ? (latestScoredPoint?.pauseMs ?? current.preferredPauseAfterPhraseMs)
      : args.decision.pauseAfterPhraseMs,
    inputExecutionFidelityScore: usesFilteredBrowserTtsDeScoring
      ? hasBrowserTtsDeScoringSamples
        ? computeAverageInputExecutionFidelity(scoringTimeline)
        : current.inputExecutionFidelityScore
      : currentPointIsScored
      ? runningAverage(current.inputExecutionFidelityScore, executionFidelity, previousAverageCount)
      : current.inputExecutionFidelityScore,
    timeline,
  };

  if (usesFilteredBrowserTtsDeScoring && !hasBrowserTtsDeScoringSamples) {
    const zeroScoredNext = {
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
    return normalizeInputLanguageBenchmarkForRecommendation(zeroScoredNext);
  }

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
  next.recommendation = computeBenchmarkRecommendation(next);
  return normalizeInputLanguageBenchmarkForRecommendation(next);
}

export function normalizeInputLanguageBenchmarkForRecommendation(
  metrics: InputLanguageBenchmarkMetrics,
): InputLanguageBenchmarkMetrics {
  return applyBrowserTtsDeTimelinePressureFallback(metrics);
}

export function isValidBrowserTtsDeBenchmarkSample(point: AdaptiveTimelinePoint): boolean {
  if (!isBrowserTtsDe(point.inputMode, point.language)) return true;
  const rawLagSec = point.rawLagSec;
  const lagSec = point.lagSec;
  const stableLagSec = point.stableLagSec;
  const semanticCompleteness = point.semanticCompleteness ?? 1;
  return (
    typeof rawLagSec === 'number' &&
    Number.isFinite(rawLagSec) &&
    Number.isFinite(lagSec) &&
    (stableLagSec === undefined || Number.isFinite(stableLagSec)) &&
    rawLagSec >= -3 &&
    rawLagSec <= 6 &&
    rawLagSec !== -5 &&
    lagSec !== -5 &&
    stableLagSec !== -5 &&
    point.wpm > 0 &&
    point.phraseBoundaryType !== 'unsafe' &&
    semanticCompleteness >= 0.7 &&
    isScoringTimelineEvent(point.event)
  );
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
    reason: decision.reason.includes('de-target-rate-clamp')
      ? decision.reason
      : `${decision.reason}, de-target-rate-clamp`,
  };
}

export function computeSweetSpotScore(metrics: InputLanguageBenchmarkMetrics): number {
  return clamp01(
    metrics.semanticFidelityScore * 0.3 +
      metrics.controlFidelityScore * 0.25 +
      metrics.learningEffectivenessScore * 0.3 +
      metrics.flowStabilityScore * 0.15,
  );
}

export function computeSemanticFidelityScore(metrics: InputLanguageBenchmarkMetrics): number {
  const unsafeRate = metrics.unsafePauseCount / Math.max(1, metrics.sampleCount);
  const deferredRate = metrics.deferredPauseCount / Math.max(1, metrics.sampleCount);
  const cutPenalty = metrics.semanticCutPenalty / Math.max(1, metrics.sampleCount);
  return clamp01(metrics.averageSemanticCompleteness * 0.55 + (1 - cutPenalty) * 0.2 + (1 - unsafeRate) * 0.2 + (1 - deferredRate) * 0.05);
}

export function computeControlFidelityScore(metrics: InputLanguageBenchmarkMetrics): number {
  const replayPenalty = metrics.replayDeniedByBoundaryCount / Math.max(1, metrics.sampleCount);
  return clamp01(metrics.inputExecutionFidelityScore * 0.75 + (1 - replayPenalty) * 0.25);
}

export function computeLearningEffectivenessScore(metrics: InputLanguageBenchmarkMetrics): number {
  const accuracy = clamp01(metrics.averageAccuracy > 1 ? metrics.averageAccuracy / 100 : metrics.averageAccuracy);
  const lagScore = clamp01(1 - Math.abs(metrics.stableAverageLagSec) / 5);
  const lagConsistencyScore = clamp01(1 - metrics.p90AbsLagSec / 5);
  const outlierPenalty = clamp01(1 - metrics.lagOutlierCount / Math.max(1, metrics.sampleCount * 0.2));
  const correctionScore = clamp01(1 - metrics.averageCorrectionRate / 0.25);
  const burstScore = clamp01(1 - metrics.errorBurstLength / 12);
  return clamp01(accuracy * 0.4 + lagScore * 0.2 + lagConsistencyScore * 0.15 + correctionScore * 0.15 + burstScore * 0.05 + outlierPenalty * 0.05);
}

export function computeFlowStabilityScore(metrics: InputLanguageBenchmarkMetrics): number {
  const modeScore = clamp01(1 - metrics.modeSwitchFrequency / 0.35);
  const rateScore = clamp01(1 - metrics.rateVariance / 0.04);
  const pauseScore = clamp01(1 - metrics.pauseVariance / 250000);
  const replayScore = clamp01(1 - metrics.replayDeniedByBoundaryCount / Math.max(1, metrics.sampleCount));
  return clamp01(modeScore * 0.35 + rateScore * 0.25 + pauseScore * 0.2 + replayScore * 0.2);
}

export function computeRateAccuracyBuckets(samples: AdaptiveTimelinePoint[]): RateAccuracyBucket[] {
  const buckets = new Map<number, AdaptiveTimelinePoint[]>();
  for (const sample of samples) {
    const rate = Number(sample.playbackRate.toFixed(2));
    buckets.set(rate, [...(buckets.get(rate) ?? []), sample]);
  }
  return [...buckets.entries()]
    .map(([rate, entries]) => ({
      rate,
      seconds: entries.length,
      averageAccuracy: average(entries.map((entry) => entry.accuracy)),
      averageLagSec: average(entries.map((entry) => entry.lagSec)),
      averageWpm: average(entries.map((entry) => entry.wpm)),
      sampleCount: entries.length,
    }))
    .sort((a, b) => a.rate - b.rate);
}

export function computeBenchmarkRecommendation(metrics: InputLanguageBenchmarkMetrics): InputLanguageBenchmarkRecommendation {
  const targetRateRange = calibrateTargetRateRangeForProfile(metrics, pickBestRateRange(metrics.rateAccuracyBuckets));
  const weakAreas = deriveWeakAreas(metrics);
  const targetPhraseSize = metrics.averagePhraseDifficulty > 0.65 || metrics.averageSemanticCompleteness < 0.7 ? 'short' : metrics.preferredPhraseSize;
  const focus = weakAreas.length > 0 ? weakAreas.slice(0, 3).map(formatWeakArea) : [`Maintain stable pace and ${targetPhraseSize}-length semantic phrases`];
  const confidence = clamp01(Math.min(1, metrics.sampleCount / 40) * metrics.sweetSpotScore);
  const inputLabel = metrics.inputMode;
  const languageLabel = String(metrics.language).toUpperCase();
  return {
    targetRateRange,
    targetPhraseSize,
    targetPauseMs: Math.round(metrics.preferredPauseAfterPhraseMs || 700),
    nextTrainingFocus: focus,
    confidence,
    summary:
      metrics.sampleCount === 0
        ? `No benchmark samples yet for ${inputLabel} ${languageLabel}.`
        : `For ${inputLabel} ${languageLabel}, the current target is ${targetRateRange[0].toFixed(2)}x-${targetRateRange[1].toFixed(2)}x with focus on ${focus.join(', ')}.`,
  };
}

export function pickBestRateRange(rateAccuracyBuckets: RateAccuracyBucket[]): [number, number] {
  if (rateAccuracyBuckets.length === 0) return [0.9, 1];
  const scored = [...rateAccuracyBuckets].sort((a, b) => rateBucketScore(b) - rateBucketScore(a));
  const best = scored[0];
  const nearby = scored.filter((bucket) => Math.abs(bucket.rate - best.rate) <= 0.05 && rateBucketScore(bucket) >= rateBucketScore(best) * 0.85);
  const rates = nearby.length > 0 ? nearby.map((bucket) => bucket.rate) : [best.rate];
  return [Math.min(...rates), Math.max(...rates)];
}

export function deriveWeakAreas(metrics: InputLanguageBenchmarkMetrics): AdaptiveWeakArea[] {
  const weakAreas: AdaptiveWeakArea[] = [];
  if (metrics.averagePhraseDifficulty > 0.65) weakAreas.push('long_phrases');
  if (metrics.averageSemanticCompleteness < 0.7) weakAreas.push('low_semantic_completeness');
  if (metrics.unsafePauseCount > Math.max(2, metrics.sampleCount * 0.08)) weakAreas.push('unsafe_boundaries');
  if (metrics.replayDeniedByBoundaryCount > Math.max(2, metrics.sampleCount * 0.08)) weakAreas.push('replay');
  if (Math.abs(metrics.stableAverageLagSec) > 2 || metrics.p90AbsLagSec > 3) weakAreas.push('lag');
  if (metrics.averageCorrectionRate > 0.12) weakAreas.push('corrections');
  if (metrics.averageAccuracy < 0.82) weakAreas.push('low_accuracy');
  if (metrics.modeSwitchFrequency > 0.25 || metrics.rateVariance > 0.03) weakAreas.push('flow_instability');
  if (metrics.rateAccuracyBuckets.some((bucket) => bucket.rate >= 1.05 && bucket.averageAccuracy < 0.82)) weakAreas.push('high_rate');
  if (isBrowserTtsDe(metrics.inputMode, metrics.language)) {
    weakAreas.push(...deriveBrowserTtsDeTimelineWeakAreas(analyzeBrowserTtsDeTimelinePressure(metrics)));
  }
  return [...new Set(weakAreas)];
}

export function pruneTimelineToRollingWindow(
  timeline: AdaptiveTimelinePoint[],
  rollingWindowDays: number,
): AdaptiveTimelinePoint[] {
  const cutoff = Date.now() - rollingWindowDays * MS_PER_DAY;
  return timeline
    .filter((point) => point.timestampMs >= cutoff)
    .slice(-MAX_TIMELINE_POINTS);
}

function deriveTimelineEvent(decision: PacingDecision): AdaptiveTimelinePoint['event'] {
  if (decision.deferPauseUntilSafeBoundary) return 'defer_pause';
  if (decision.shouldReplayPhrase) return 'replay';
  if (decision.shouldPauseNow) return 'pause';
  if (decision.mode === 'support') return 'support_entered';
  if (decision.mode === 'flow') return 'flow_entered';
  return 'rate_change';
}

function isBrowserTtsDe(inputMode: InputMode, language?: string | null): boolean {
  return inputMode === 'browser-tts' && normalizeBenchmarkLanguage(language).toLowerCase() === 'de';
}

function applyBrowserTtsDeTimelinePressureFallback(metrics: InputLanguageBenchmarkMetrics): InputLanguageBenchmarkMetrics {
  if (!isBrowserTtsDe(metrics.inputMode, metrics.language)) return metrics;
  const pressure = analyzeBrowserTtsDeTimelinePressure(metrics);
  if (!pressure.shouldUseConservativeRecommendation) return metrics;
  const weakAreas = [...new Set([...metrics.weakAreas, ...deriveBrowserTtsDeTimelineWeakAreas(pressure)])];
  const nextTrainingFocus = buildBrowserTtsDeConservativeFocus(weakAreas);
  const flowStabilityScore = Math.min(metrics.flowStabilityScore, 0.7);
  const sweetSpotScore = Math.min(metrics.sweetSpotScore, 0.65);
  return {
    ...metrics,
    flowStabilityScore,
    sweetSpotScore,
    weakAreas,
    recommendation: {
      targetRateRange: BROWSER_TTS_DE_CONSERVATIVE_RATE_RANGE,
      targetPhraseSize: 'short',
      targetPauseMs: BROWSER_TTS_DE_CONSERVATIVE_PAUSE_MS,
      nextTrainingFocus,
      confidence: Math.min(metrics.recommendation?.confidence ?? 0, 0.3),
      summary:
        `Playback was stable, but benchmark confidence is very low and support-mode pressure remains high. ` +
        `Keep conservative DE browser-TTS settings at ${BROWSER_TTS_DE_CONSERVATIVE_RATE_RANGE[0].toFixed(2)}x-${BROWSER_TTS_DE_CONSERVATIVE_RATE_RANGE[1].toFixed(2)}x with short semantic phrases and focus on ${nextTrainingFocus.join(', ')}.`,
    },
  };
}

function analyzeBrowserTtsDeTimelinePressure(metrics: InputLanguageBenchmarkMetrics): BrowserTtsDeTimelinePressure {
  if (!isBrowserTtsDe(metrics.inputMode, metrics.language)) {
    return {
      validScoringSampleCount: metrics.sampleCount,
      supportRatio: 0,
      unsafeBoundaryRatio: 0,
      severeRawLagOutlierCount: 0,
      highLagRatio: 0,
      lowAccuracyRatio: 0,
      shouldUseConservativeRecommendation: false,
    };
  }
  const timeline = metrics.timeline.filter((point) => isBrowserTtsDe(point.inputMode, point.language));
  const validScoringSampleCount = timeline.filter(isValidBrowserTtsDeBenchmarkSample).length;
  const pressurePoints = timeline.filter((point) => point.event !== 'defer_pause');
  const denominator = Math.max(1, pressurePoints.length);
  const supportCount = pressurePoints.filter((point) => point.mode === 'support' || includesDiagnosticReason(point, 'support-needed')).length;
  const unsafeBoundaryCount = pressurePoints.filter((point) => point.phraseBoundaryType === 'unsafe' || includesDiagnosticReason(point, 'replay-blocked-boundary')).length;
  const severeRawLagOutlierCount = pressurePoints.filter((point) => typeof point.rawLagSec === 'number' && Number.isFinite(point.rawLagSec) && Math.abs(point.rawLagSec) > 10).length;
  const highLagCount = pressurePoints.filter((point) => Number.isFinite(point.lagSec) && point.lagSec !== -5 && point.lagSec > 2).length;
  const lowAccuracyCount = pressurePoints.filter((point) => normalizeAccuracy(point.accuracy) < 0.75).length;
  const supportRatio = supportCount / denominator;
  const unsafeBoundaryRatio = unsafeBoundaryCount / denominator;
  const highLagRatio = highLagCount / denominator;
  const lowAccuracyRatio = lowAccuracyCount / denominator;
  return {
    validScoringSampleCount,
    supportRatio,
    unsafeBoundaryRatio,
    severeRawLagOutlierCount,
    highLagRatio,
    lowAccuracyRatio,
    shouldUseConservativeRecommendation:
      metrics.sampleCount < BROWSER_TTS_DE_MIN_CONFIDENT_SAMPLES ||
      validScoringSampleCount < BROWSER_TTS_DE_MIN_CONFIDENT_SAMPLES ||
      (metrics.recommendation?.confidence ?? 1) < 0.3 ||
      supportRatio > 0.5 ||
      unsafeBoundaryRatio > 0.1 ||
      severeRawLagOutlierCount > 0 ||
      highLagRatio > 0.15,
  };
}

function deriveBrowserTtsDeTimelineWeakAreas(pressure: BrowserTtsDeTimelinePressure): AdaptiveWeakArea[] {
  const weakAreas: AdaptiveWeakArea[] = [];
  if (pressure.supportRatio > 0.5) weakAreas.push('support_dependency');
  if (pressure.unsafeBoundaryRatio > 0.1) weakAreas.push('unsafe_boundary_pressure');
  if (pressure.highLagRatio > 0.15 || pressure.severeRawLagOutlierCount > 0) weakAreas.push('lag_instability');
  if (pressure.lowAccuracyRatio > 0.2) weakAreas.push('accuracy_instability');
  return weakAreas;
}

function buildBrowserTtsDeConservativeFocus(weakAreas: AdaptiveWeakArea[]): string[] {
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

function includesDiagnosticReason(point: AdaptiveTimelinePoint, token: string): boolean {
  return typeof point.decisionReason === 'string' && point.decisionReason.toLowerCase().includes(token);
}

function isScoringTimelineEvent(event: AdaptiveTimelinePoint['event']): boolean {
  return (
    event === 'phrase_advance' ||
    event === 'phrase_completed' ||
    event === 'rate_change' ||
    event === 'support_entered' ||
    event === 'flow_entered'
  );
}

function computeBrowserTtsDeSemanticCounters(timeline: AdaptiveTimelinePoint[]): Pick<
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

function computeExecutionFidelity(execution?: InputExecutionTelemetry): number {
  if (!execution) return 1;
  const scores: number[] = [];
  if (execution.requestedPlaybackRate !== undefined && execution.actualPlaybackRate !== undefined) {
    scores.push(clamp01(1 - Math.abs(execution.requestedPlaybackRate - execution.actualPlaybackRate) / 0.25));
  }
  if (execution.requestedPauseMs !== undefined && execution.actualPauseMs !== undefined) {
    scores.push(clamp01(1 - Math.abs(execution.requestedPauseMs - execution.actualPauseMs) / 1000));
  }
  if (execution.requestedReplay !== undefined && execution.replayExecuted !== undefined) {
    scores.push(execution.requestedReplay === execution.replayExecuted ? 1 : 0.35);
  }
  if (execution.requestedBoundaryType && execution.actualBoundaryType) {
    scores.push(execution.requestedBoundaryType === execution.actualBoundaryType ? 1 : 0.55);
  }
  if (execution.fallbackUsed) scores.push(0.75);
  return scores.length > 0 ? average(scores) : 1;
}

function computeAverageInputExecutionFidelity(timeline: AdaptiveTimelinePoint[]): number {
  return timeline.length > 0 ? 1 : 0;
}

function computeRecoveryScore(timeline: AdaptiveTimelinePoint[]): number {
  if (timeline.length < 2) return 0;
  const first = timeline[0];
  const last = timeline[timeline.length - 1];
  const accuracyGain = normalizeAccuracy(last.accuracy) - normalizeAccuracy(first.accuracy);
  const lagGain = Math.abs(first.lagSec) - Math.abs(last.lagSec);
  return clamp01(0.5 + accuracyGain * 0.7 + lagGain / 8);
}

function computeTimeToRecoveryMs(timeline: AdaptiveTimelinePoint[]): number | null {
  const firstStruggle = timeline.find((point) => normalizeAccuracy(point.accuracy) < 0.82 || Math.abs(point.lagSec) > 2);
  if (!firstStruggle) return null;
  const recovered = timeline.find((point) => point.timestampMs > firstStruggle.timestampMs && normalizeAccuracy(point.accuracy) >= 0.86 && Math.abs(point.lagSec) <= 1.5);
  return recovered ? recovered.timestampMs - firstStruggle.timestampMs : null;
}

function computeErrorBurstLength(timeline: AdaptiveTimelinePoint[]): number {
  let current = 0;
  let max = 0;
  for (const point of timeline) {
    if (normalizeAccuracy(point.accuracy) < 0.82 || Math.abs(point.lagSec) > 2) {
      current += 1;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return max;
}

function computeModeSwitchFrequency(timeline: AdaptiveTimelinePoint[]): number {
  if (timeline.length < 2) return 0;
  let switches = 0;
  for (let i = 1; i < timeline.length; i += 1) {
    if (timeline[i].mode !== timeline[i - 1].mode) switches += 1;
  }
  return switches / (timeline.length - 1);
}

function computeVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = average(values);
  return average(values.map((value) => (value - mean) ** 2));
}

function rateBucketScore(bucket: RateAccuracyBucket): number {
  const accuracy = normalizeAccuracy(bucket.averageAccuracy);
  const lagScore = clamp01(1 - Math.abs(bucket.averageLagSec) / 4);
  const sampleScore = clamp01(bucket.sampleCount / 8);
  return accuracy * 0.6 + lagScore * 0.3 + sampleScore * 0.1;
}

function runningAverage(currentAverage: number, nextValue: number, previousCount: number): number {
  return ((currentAverage * previousCount) + nextValue) / Math.max(1, previousCount + 1);
}

function average(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

function normalizeAccuracy(value: number): number {
  return value > 1 ? clamp01(value / 100) : clamp01(value);
}

function countUniqueSessions(timeline: AdaptiveTimelinePoint[]): number {
  const ids = new Set(timeline.map((point) => point.sessionId).filter(Boolean));
  return ids.size > 0 ? ids.size : timeline.length > 0 ? 1 : 0;
}

function formatWeakArea(value: AdaptiveWeakArea): string {
  return value.replace(/_/g, ' ');
}

function buildDefaultRecommendation(): InputLanguageBenchmarkRecommendation {
  return {
    targetRateRange: [0.9, 1],
    targetPhraseSize: 'medium',
    targetPauseMs: 700,
    nextTrainingFocus: ['Collect benchmark samples'],
    confidence: 0,
    summary: 'No benchmark samples yet.',
  };
}

function calibrateTargetRateRangeForProfile(
  metrics: InputLanguageBenchmarkMetrics,
  base: [number, number],
): [number, number] {
  const inputMode = String(metrics.inputMode).toLowerCase();
  if (inputMode !== 'browser-tts') {
    return base;
  }
  const profile = resolveBrowserTtsAdaptiveProfile(String(metrics.language).toLowerCase());
  if (!profile.recommendationCalibrationEnabled) {
    return base;
  }
  const gate = profile.recommendationCalibrationGate;
  if (!gate) return base;
  const [lower, upper] = base;
  const highAccuracy = normalizeAccuracy(metrics.averageAccuracy) >= gate.minAccuracy;
  const stableLagNearZero = Math.abs(metrics.stableAverageLagSec) <= gate.maxStableLagSecAbs && metrics.p90AbsLagSec <= gate.maxP90AbsLagSec;
  if (!highAccuracy || !stableLagNearZero || lower >= profile.minRecommendedRate) {
    return base;
  }
  const adjustedLower = profile.minRecommendedRate;
  const adjustedUpper = Math.max(upper, adjustedLower + 0.04);
  return [adjustedLower, adjustedUpper];
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
