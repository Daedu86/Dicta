import type {
  AdaptiveTimelinePoint,
  HistoricalPerformanceProfile,
  InputExecutionTelemetry,
  LiveTelemetryFrame,
  PacingDecision,
} from './types';
import type {
  LagReliability,
  LanguageAdaptiveCalibration,
  NormalizedRuntimeTelemetry,
} from './continuousAdaptiveListeningTypes';

export type NormalizeRuntimeTelemetryInput = {
  live: LiveTelemetryFrame;
  history?: HistoricalPerformanceProfile;
  decision?: Partial<PacingDecision>;
  execution?: InputExecutionTelemetry;
  event?: AdaptiveTimelinePoint['event'] | string;
  phraseIndex?: number;
  totalSemanticPhrases?: number;
  calibration: LanguageAdaptiveCalibration;
};

export function normalizeRuntimeTelemetry({
  live,
  history,
  decision,
  execution,
  event,
  phraseIndex,
  totalSemanticPhrases,
  calibration,
}: NormalizeRuntimeTelemetryInput): NormalizedRuntimeTelemetry {
  const accuracy = clamp01(live.accuracy);
  const chunkAccuracy = clamp01(live.chunkAccuracy ?? accuracy);
  const rollingAccuracyLast3 = clamp01(live.rollingAccuracyLast3 ?? chunkAccuracy);
  const rollingAccuracyLast5 = clamp01(live.rollingAccuracyLast5 ?? rollingAccuracyLast3);
  const rawLagSec = finiteOrUndefined(live.rawLagSec);
  const stableLagSec = finiteOrUndefined(live.stableLagSec);
  const lagSec = finiteOr(live.lagSec, stableLagSec ?? rawLagSec ?? 0);
  const lagReliability = resolveLagReliability({
    rawLagSec,
    stableLagSec,
    lagSec,
    lagFallbackUsed: Boolean(live.lagFallbackUsed),
    calibration,
  });
  const requestedPlaybackRate = finiteOrUndefined(execution?.requestedPlaybackRate ?? decision?.playbackRate);
  const actualPlaybackRate = finiteOrUndefined(execution?.actualPlaybackRate ?? live.currentPlaybackRate);
  const requestedPauseMs = finiteOrUndefined(execution?.requestedPauseMs ?? decision?.pauseAfterPhraseMs);
  const actualPauseMs = finiteOrUndefined(execution?.actualPauseMs);
  const currentPauseAfterPhraseMs = Math.max(0, finiteOr(live.currentPauseAfterPhraseMs, live.pauseMs));
  const perceptualGapMs = Math.max(0, actualPauseMs ?? currentPauseAfterPhraseMs);
  const pauseShortfallMs = Math.max(0, (requestedPauseMs ?? 0) - perceptualGapMs);
  const spokenProgressRatio = finiteOr(live.spokenProgressRatio, 0);
  const typedProgressRatio = finiteOr(live.typedProgressRatio, 0);
  const progressGap = spokenProgressRatio > 0 && typedProgressRatio > 0
    ? clamp01(spokenProgressRatio - typedProgressRatio)
    : 0;
  const phraseBoundaryType = live.phraseBoundaryType;
  const semanticCompleteness = clamp01(live.semanticCompleteness ?? 1);
  const canPauseAfter = live.canPauseAfter ?? true;
  const canReplayIndependently = live.canReplayIndependently ?? true;
  const pauseDeferred = Boolean(decision?.deferPauseUntilSafeBoundary || (event === 'defer_pause'));

  return {
    inputMode: live.inputMode,
    language: live.language ?? calibration.language,
    event,
    phraseId: live.phraseId,
    phraseIndex,
    totalSemanticPhrases,
    accuracy,
    chunkAccuracy,
    rollingAccuracyLast3,
    rollingAccuracyLast5,
    wpm: Math.max(0, finiteOr(live.wpm, 0)),
    lagSec,
    rawLagSec,
    stableLagSec,
    lagFallbackUsed: Boolean(live.lagFallbackUsed),
    lagOutlierCount: Math.max(0, finiteOr(live.lagOutlierCount, 0)),
    lagReliability,
    correctionRate: clamp01(live.correctionRate),
    backspaceRate: clamp01(live.backspaceRate),
    listeningPrecision: live.listeningPrecision,
    phraseBoundaryType,
    canPauseAfter,
    canReplayIndependently,
    semanticCompleteness,
    phraseDifficulty: clamp01(live.phraseDifficulty),
    phraseLengthWords: Math.max(0, finiteOr(live.phraseLengthWords, 0)),
    phraseLengthChars: Math.max(0, finiteOr(live.phraseLengthChars, 0)),
    syntaxComplexity: clamp01(live.syntaxComplexity ?? 0),
    requestedPlaybackRate,
    actualPlaybackRate,
    requestedPauseMs,
    actualPauseMs,
    currentPlaybackRate: Math.max(0, finiteOr(live.currentPlaybackRate, requestedPlaybackRate ?? history?.comfortablePlaybackRate ?? 1)),
    currentPauseAfterPhraseMs,
    pauseDeferred,
    deferReason: pauseDeferred ? 'defer_pause' : undefined,
    pauseShortfallMs,
    perceptualGapMs,
    progressGap,
    timingConfidence: computeTimingConfidence(lagReliability, live.wpm, live.lagOutlierCount),
    semanticConfidence: computeSemanticConfidence(semanticCompleteness),
    boundaryConfidence: computeBoundaryConfidence(phraseBoundaryType),
    executionConfidence: computeExecutionConfidence({
      requestedPlaybackRate,
      actualPlaybackRate,
      requestedPauseMs,
      actualPauseMs,
      pauseDeferred,
    }),
  };
}

export function resolveLagReliability({
  rawLagSec,
  stableLagSec,
  lagSec,
  lagFallbackUsed,
  calibration,
}: {
  rawLagSec?: number;
  stableLagSec?: number;
  lagSec: number;
  lagFallbackUsed: boolean;
  calibration: LanguageAdaptiveCalibration;
}): LagReliability {
  const rawIsReliable =
    typeof rawLagSec === 'number' &&
    Number.isFinite(rawLagSec) &&
    rawLagSec >= calibration.reliableRawLagRange[0] &&
    rawLagSec <= calibration.reliableRawLagRange[1] &&
    rawLagSec !== -5 &&
    rawLagSec !== 5;
  const stableIsReliable =
    typeof stableLagSec === 'number' &&
    Number.isFinite(stableLagSec) &&
    stableLagSec !== -5 &&
    stableLagSec !== 5;

  if (rawIsReliable && !lagFallbackUsed) return 'raw';
  if (stableIsReliable && lagFallbackUsed) return 'fallback';
  if (stableIsReliable) return 'stable';
  if (Number.isFinite(lagSec) && lagSec !== -5 && lagSec !== 5) return 'stable';
  return 'invalid';
}

function computeTimingConfidence(lagReliability: LagReliability, wpm: number, lagOutlierCount = 0): number {
  const base = lagReliability === 'raw' ? 1 : lagReliability === 'stable' ? 0.82 : lagReliability === 'fallback' ? 0.58 : 0;
  const wpmPenalty = wpm > 0 ? 0 : 0.25;
  const outlierPenalty = Math.min(0.35, Math.max(0, lagOutlierCount) * 0.08);
  return clamp01(base - wpmPenalty - outlierPenalty);
}

function computeSemanticConfidence(semanticCompleteness: number): number {
  return clamp01(0.35 + semanticCompleteness * 0.65);
}

function computeBoundaryConfidence(boundaryType: LiveTelemetryFrame['phraseBoundaryType']): number {
  if (boundaryType === 'sentence') return 1;
  if (boundaryType === 'clause') return 0.86;
  if (boundaryType === 'minor') return 0.58;
  if (boundaryType === 'unsafe') return 0.2;
  return 0.65;
}

function computeExecutionConfidence({
  requestedPlaybackRate,
  actualPlaybackRate,
  requestedPauseMs,
  actualPauseMs,
  pauseDeferred,
}: {
  requestedPlaybackRate?: number;
  actualPlaybackRate?: number;
  requestedPauseMs?: number;
  actualPauseMs?: number;
  pauseDeferred: boolean;
}): number {
  const scores: number[] = [];
  if (requestedPlaybackRate !== undefined && actualPlaybackRate !== undefined) {
    scores.push(clamp01(1 - Math.abs(requestedPlaybackRate - actualPlaybackRate) / 0.35));
  }
  if (requestedPauseMs !== undefined && actualPauseMs !== undefined) {
    scores.push(clamp01(1 - Math.max(0, requestedPauseMs - actualPauseMs) / 1500));
  }
  if (pauseDeferred) scores.push(0.45);
  return scores.length > 0 ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0.78;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function finiteOrUndefined(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
