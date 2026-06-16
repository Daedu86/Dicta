import type { AdaptiveTimelinePoint, LanguageCode, LiveTelemetryFrame, PacingDecision } from './types';
import type { BrowserTtsEnvironmentFingerprint } from '../../types/dictation';
import { getBrowserTtsEnvironmentId } from '../../inputs/browserTts/browserTtsEnvironment';
import { buildTimelineDecisionReason, deriveTimelineEvent } from './browserTtsDeBenchmarkPolicy';

export const MAX_TIMELINE_POINTS = 450;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type InputLanguageBenchmarkTimelinePointArgs = {
  live: LiveTelemetryFrame;
  decision: PacingDecision;
  timestampMs: number;
  language: LanguageCode;
  semanticCompleteness: number;
  sessionId?: string;
  ttsEnvironment?: BrowserTtsEnvironmentFingerprint;
  phraseIndex?: number;
  totalSemanticPhrases?: number;
  event?: AdaptiveTimelinePoint['event'];
  decisionTraceId?: string;
  benchmarkRejectionReason?: string | null;
  requestedPlaybackRate?: number;
  actualPlaybackRate?: number;
  requestedPauseMs?: number;
  actualPauseMs?: number;
  replayExecuted?: boolean;
  unsafeBoundaryApplied?: boolean;
  mobileFallbackApplied?: boolean;
  recoverySafeBoundary?: boolean;
  germanShortBias?: boolean;
};

export function buildInputLanguageBenchmarkTimelinePoint(args: InputLanguageBenchmarkTimelinePointArgs): AdaptiveTimelinePoint {
  const ttsEnvironmentId = args.ttsEnvironment ? getBrowserTtsEnvironmentId(args.ttsEnvironment) : undefined;
  return {
    timestampMs: args.timestampMs,
    inputMode: args.live.inputMode,
    language: args.language,
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
    semanticCompleteness: args.semanticCompleteness,
    sessionId: args.sessionId,
    ttsEnvironmentId,
    phraseId: args.live.phraseId,
    phraseIndex: args.phraseIndex,
    totalSemanticPhrases: args.totalSemanticPhrases,
    decisionTraceId: args.decisionTraceId,
    benchmarkRejectionReason: args.benchmarkRejectionReason ?? undefined,
    requestedPlaybackRate: args.requestedPlaybackRate,
    actualPlaybackRate: args.actualPlaybackRate,
    requestedPauseMs: args.requestedPauseMs,
    actualPauseMs: args.actualPauseMs,
    replayExecuted: args.replayExecuted,
    unsafeBoundaryApplied: args.unsafeBoundaryApplied,
    mobileFallbackApplied: args.mobileFallbackApplied,
    recoverySafeBoundary: args.recoverySafeBoundary,
    germanShortBias: args.germanShortBias,
    decisionReason: buildTimelineDecisionReason(args.live, args.decision, args.sessionId, args.phraseIndex, args.totalSemanticPhrases, args.event),
    executionHint: args.decision.executionHint,
    event: args.event ?? deriveTimelineEvent(args.decision),
  };
}

export function pruneTimelineToRollingWindow(timeline: AdaptiveTimelinePoint[], rollingWindowDays: number): AdaptiveTimelinePoint[] {
  const cutoff = Date.now() - rollingWindowDays * MS_PER_DAY;
  return timeline.filter((point) => point.timestampMs >= cutoff).slice(-MAX_TIMELINE_POINTS);
}

export function countUniqueSessions(timeline: AdaptiveTimelinePoint[]): number {
  const ids = new Set(timeline.map((point) => point.sessionId).filter(Boolean));
  return ids.size > 0 ? ids.size : timeline.length > 0 ? 1 : 0;
}
