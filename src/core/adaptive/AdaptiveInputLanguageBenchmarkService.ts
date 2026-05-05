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

const ROLLING_WINDOW_DAYS = 30 as const;
const MAX_TIMELINE_POINTS = 450;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
  const sampleCount = current.sampleCount + 1;
  const next: InputLanguageBenchmarkMetrics = {
    ...current,
    sessionCount: countUniqueSessions(timeline),
    sampleCount,
    lastUpdatedAt: new Date(timestampMs).toISOString(),
    averageAccuracy: runningAverage(current.averageAccuracy, args.live.accuracy, current.sampleCount),
    averageWpm: runningAverage(current.averageWpm, args.live.wpm, current.sampleCount),
    averageLagSec: runningAverage(current.averageLagSec, args.live.lagSec, current.sampleCount),
    averageCorrectionRate: runningAverage(current.averageCorrectionRate, args.live.correctionRate, current.sampleCount),
    semanticCutPenalty: current.semanticCutPenalty + semanticCutPenalty,
    unsafePauseCount: current.unsafePauseCount + (unsafePause ? 1 : 0),
    safePauseCount: current.safePauseCount + (safePause ? 1 : 0),
    deferredPauseCount: current.deferredPauseCount + (args.decision.deferPauseUntilSafeBoundary ? 1 : 0),
    replayDeniedByBoundaryCount: current.replayDeniedByBoundaryCount + (replayDenied ? 1 : 0),
    averageSemanticCompleteness: runningAverage(current.averageSemanticCompleteness, semanticCompleteness, current.sampleCount),
    averagePhraseDifficulty: runningAverage(current.averagePhraseDifficulty, phraseDifficulty, current.sampleCount),
    preferredPlaybackRate: args.decision.playbackRate,
    preferredPhraseSize: args.decision.nextPhraseSize,
    preferredPauseAfterPhraseMs: args.decision.pauseAfterPhraseMs,
    inputExecutionFidelityScore: runningAverage(current.inputExecutionFidelityScore, executionFidelity, current.sampleCount),
    timeline,
  };

  next.rateAccuracyBuckets = computeRateAccuracyBuckets(timeline);
  next.recoveryScore = computeRecoveryScore(timeline);
  next.timeToRecoveryMs = computeTimeToRecoveryMs(timeline);
  next.errorBurstLength = computeErrorBurstLength(timeline);
  next.modeSwitchFrequency = computeModeSwitchFrequency(timeline);
  next.rateVariance = computeVariance(timeline.map((point) => point.playbackRate));
  next.pauseVariance = computeVariance(timeline.map((point) => point.pauseMs));
  next.semanticFidelityScore = computeSemanticFidelityScore(next);
  next.controlFidelityScore = computeControlFidelityScore(next);
  next.learningEffectivenessScore = computeLearningEffectivenessScore(next);
  next.flowStabilityScore = computeFlowStabilityScore(next);
  next.sweetSpotScore = computeSweetSpotScore(next);
  next.weakAreas = deriveWeakAreas(next);
  next.recommendation = computeBenchmarkRecommendation(next);
  return next;
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
  const lagScore = clamp01(1 - Math.abs(metrics.averageLagSec) / 5);
  const correctionScore = clamp01(1 - metrics.averageCorrectionRate / 0.25);
  const burstScore = clamp01(1 - metrics.errorBurstLength / 12);
  return clamp01(accuracy * 0.45 + lagScore * 0.25 + correctionScore * 0.2 + burstScore * 0.1);
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
  const targetRateRange = pickBestRateRange(metrics.rateAccuracyBuckets);
  const weakAreas = deriveWeakAreas(metrics);
  const focus = weakAreas.length > 0 ? weakAreas.slice(0, 3).map(formatWeakArea) : ['Maintain stable pace and medium-length semantic phrases'];
  const confidence = clamp01(Math.min(1, metrics.sampleCount / 40) * metrics.sweetSpotScore);
  const inputLabel = metrics.inputMode;
  const languageLabel = String(metrics.language).toUpperCase();
  return {
    targetRateRange,
    targetPhraseSize: metrics.averagePhraseDifficulty > 0.65 || metrics.averageSemanticCompleteness < 0.7 ? 'short' : metrics.preferredPhraseSize,
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
  if (Math.abs(metrics.averageLagSec) > 2) weakAreas.push('lag');
  if (metrics.averageCorrectionRate > 0.12) weakAreas.push('corrections');
  if (metrics.averageAccuracy < 0.82) weakAreas.push('low_accuracy');
  if (metrics.modeSwitchFrequency > 0.25 || metrics.rateVariance > 0.03) weakAreas.push('flow_instability');
  if (metrics.rateAccuracyBuckets.some((bucket) => bucket.rate >= 1.05 && bucket.averageAccuracy < 0.82)) weakAreas.push('high_rate');
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

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
