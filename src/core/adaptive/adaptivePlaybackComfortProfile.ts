import type {
  AdaptivePlaybackComfortProfile,
  HistoricalPerformanceProfile,
  InputLanguageBenchmarkMetrics,
  PacingMode,
  PhraseSize,
} from './types';
import { MAX_PLAYBACK_RATE, MIN_PLAYBACK_RATE, clamp } from './adaptiveDictationControllerMath';

const MIN_COMFORT_PAUSE_MS = 1200;
const MAX_COMFORT_PAUSE_MS = 4000;
const DEFAULT_BOOTSTRAP_RATE = 0.82;
const DEFAULT_BOOTSTRAP_PAUSE_MS = 2200;

export function buildAdaptivePlaybackComfortProfile({
  history,
  benchmark,
}: {
  history: HistoricalPerformanceProfile;
  benchmark?: InputLanguageBenchmarkMetrics | null;
}): AdaptivePlaybackComfortProfile {
  const sampleConfidence = benchmark ? clamp(benchmark.sampleCount / 30, 0, 1) : 0;
  const benchmarkConfidence = benchmark ? clamp(benchmark.recommendation.confidence, 0, 1) : 0;
  const historyConfidence = clamp(history.profileConfidence, 0, 1);
  const confidence = Number(Math.max(sampleConfidence, benchmarkConfidence, historyConfidence).toFixed(2));
  const source: AdaptivePlaybackComfortProfile['source'] = benchmark?.sampleCount
    ? 'benchmark'
    : history.sessionsCount > 0
      ? 'history'
      : 'bootstrap';

  const averageAccuracy = benchmark?.averageAccuracy || history.averageAccuracy || 0;
  const averageLagSec = Math.abs(benchmark?.averageLagSec ?? history.averageLagSec ?? 0);
  const averageCorrectionRate = benchmark?.averageCorrectionRate ?? history.typicalCorrectionRate ?? 0;
  const weakAreas = new Set(benchmark?.weakAreas ?? []);
  const userIsUnderPressure =
    averageAccuracy < 0.84 ||
    averageLagSec > 1.5 ||
    averageCorrectionRate > 0.08 ||
    weakAreas.has('lag') ||
    weakAreas.has('low_accuracy') ||
    weakAreas.has('omissions') ||
    weakAreas.has('content_word_loss') ||
    weakAreas.has('long_clause_overload');
  const userIsStable =
    averageAccuracy >= 0.92 &&
    averageLagSec < 0.8 &&
    averageCorrectionRate < 0.06 &&
    !weakAreas.has('unsafe_boundary_pressure') &&
    !weakAreas.has('flow_instability');

  const benchmarkTargetRate = benchmark
    ? averageTuple(benchmark.recommendation.targetRateRange)
    : null;
  const rawPreferredRate = firstFinite([
    benchmark?.preferredPlaybackRate,
    benchmarkTargetRate,
    history.comfortablePlaybackRate,
    DEFAULT_BOOTSTRAP_RATE,
  ]);
  const preferredRate = roundRate(clamp(
    rawPreferredRate + (userIsStable ? 0.03 : 0) - (userIsUnderPressure ? 0.08 : 0),
    MIN_PLAYBACK_RATE,
    MAX_PLAYBACK_RATE,
  ));

  const rateWindow = clamp(0.1 + (1 - confidence) * 0.18 + (userIsUnderPressure ? 0.08 : 0), 0.1, 0.32);
  const rateRange: [number, number] = [
    roundRate(clamp(preferredRate - rateWindow, MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE)),
    roundRate(clamp(preferredRate + rateWindow, MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE)),
  ];

  const rawPreferredPauseMs = firstFinite([
    benchmark?.preferredPauseAfterPhraseMs,
    benchmark?.recommendation.targetPauseMs,
    history.preferredPauseAfterPhraseMs,
    history.averagePauseMs,
    DEFAULT_BOOTSTRAP_PAUSE_MS,
  ]);
  const preferredPauseMs = Math.round(clamp(
    rawPreferredPauseMs + (userIsUnderPressure ? 600 : 0) - (userIsStable ? 250 : 0),
    MIN_COMFORT_PAUSE_MS,
    MAX_COMFORT_PAUSE_MS,
  ));
  const pauseWindowMs = Math.round(clamp(550 + (1 - confidence) * 650 + (userIsUnderPressure ? 450 : 0), 550, 1600));
  const pauseRangeMs: [number, number] = [
    Math.round(clamp(preferredPauseMs - pauseWindowMs, MIN_COMFORT_PAUSE_MS, MAX_COMFORT_PAUSE_MS)),
    Math.round(clamp(preferredPauseMs + pauseWindowMs, MIN_COMFORT_PAUSE_MS, MAX_COMFORT_PAUSE_MS)),
  ];

  return {
    source,
    confidence,
    rateRange,
    pauseRangeMs,
    preferredRate,
    preferredPauseMs,
    preferredPhraseSize: resolvePreferredPhraseSize(history, benchmark, userIsUnderPressure, userIsStable),
    statePauseMs: buildStatePauseMap(preferredPauseMs, userIsUnderPressure),
  };
}

export function buildHistoryProfileWithAdaptivePlaybackComfort({
  history,
  benchmark,
}: {
  history: HistoricalPerformanceProfile;
  benchmark?: InputLanguageBenchmarkMetrics | null;
}): HistoricalPerformanceProfile {
  return {
    ...history,
    adaptivePlaybackComfortProfile: buildAdaptivePlaybackComfortProfile({ history, benchmark }),
  };
}

function buildStatePauseMap(preferredPauseMs: number, userIsUnderPressure: boolean): Record<PacingMode, number> {
  const recoveryBoost = userIsUnderPressure ? 1100 : 850;
  const supportBoost = userIsUnderPressure ? 650 : 400;
  const balancedOffset = userIsUnderPressure ? 250 : 0;
  const flowReduction = userIsUnderPressure ? 0 : 500;
  return {
    recovery: Math.round(clamp(preferredPauseMs + recoveryBoost, MIN_COMFORT_PAUSE_MS, MAX_COMFORT_PAUSE_MS)),
    support: Math.round(clamp(preferredPauseMs + supportBoost, MIN_COMFORT_PAUSE_MS, MAX_COMFORT_PAUSE_MS)),
    balanced: Math.round(clamp(preferredPauseMs + balancedOffset, MIN_COMFORT_PAUSE_MS, MAX_COMFORT_PAUSE_MS)),
    flow: Math.round(clamp(preferredPauseMs - flowReduction, MIN_COMFORT_PAUSE_MS, MAX_COMFORT_PAUSE_MS)),
  };
}

function resolvePreferredPhraseSize(
  history: HistoricalPerformanceProfile,
  benchmark: InputLanguageBenchmarkMetrics | null | undefined,
  userIsUnderPressure: boolean,
  userIsStable: boolean,
): PhraseSize {
  if (userIsUnderPressure) return 'short';
  if (userIsStable && (benchmark?.preferredPhraseSize === 'long' || history.preferredPhraseSize === 'long')) return 'long';
  return benchmark?.preferredPhraseSize ?? benchmark?.recommendation.targetPhraseSize ?? history.preferredPhraseSize ?? 'medium';
}

function averageTuple(value: [number, number] | undefined): number | null {
  if (!value) return null;
  return (value[0] + value[1]) / 2;
}

function firstFinite(values: Array<number | null | undefined>): number {
  const match = values.find((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return match ?? 0;
}

function roundRate(value: number): number {
  return Number(value.toFixed(2));
}
