import type { PacingDecision, PhraseSize } from './types';
import { clamp } from './adaptiveDictationControllerMath';
import type { AdaptivePacingScores } from './adaptiveDictationControllerTelemetry';

interface AdaptiveSessionWarmupConfig {
  enabled: boolean;
  chunkCount: number;
  playbackRate: number;
  pauseMs: number;
  phraseSize: PhraseSize;
}

export function resolveAdaptiveSessionChunkIndex(
  sessionChunkIndex: number | undefined,
): number | null {
  return typeof sessionChunkIndex === 'number' && Number.isFinite(sessionChunkIndex)
    ? sessionChunkIndex
    : null;
}

export function shouldForceAdaptiveSessionWarmup({
  sessionWarmup,
  sessionChunkIndex,
}: {
  sessionWarmup?: AdaptiveSessionWarmupConfig;
  sessionChunkIndex: number | null;
}): boolean {
  return Boolean(
    sessionWarmup?.enabled &&
      sessionChunkIndex !== null &&
      sessionChunkIndex < sessionWarmup.chunkCount,
  );
}

export function buildAdaptiveSessionWarmupDecision({
  sessionWarmup,
  extremeSupportRateFloor,
  supportRateCeiling,
  scores,
}: {
  sessionWarmup: AdaptiveSessionWarmupConfig;
  extremeSupportRateFloor: number;
  supportRateCeiling: number;
  scores: AdaptivePacingScores;
}): PacingDecision {
  const warmupRate = Number(
    clamp(sessionWarmup.playbackRate, extremeSupportRateFloor, supportRateCeiling).toFixed(2),
  );

  return {
    mode: 'support',
    playbackRate: warmupRate,
    pauseAfterPhraseMs: sessionWarmup.pauseMs,
    shouldPauseNow: true,
    shouldReplayPhrase: false,
    boundaryStrictness: 'clause',
    allowMidPhrasePause: false,
    deferPauseUntilSafeBoundary: false,
    replayRate: Number(clamp(warmupRate - 0.08, extremeSupportRateFloor, supportRateCeiling).toFixed(2)),
    nextPhraseSize: sessionWarmup.phraseSize,
    reason: 'mode=support, session-warmup-calibration, support-needed',
    reasonCodes: ['mode-support', 'session-warmup-calibration', 'support-needed'],
    ...scores,
  };
}
