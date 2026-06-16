import type {
  AdaptiveTimelinePoint,
  LanguageCode,
  LiveTelemetryFrame,
  PacingDecision,
} from './types';
import type { BrowserTtsEnvironmentFingerprint } from '../../types/dictation';
import { getBrowserTtsEnvironmentId } from '../../inputs/browserTts/browserTtsEnvironment';
import {
  buildTimelineDecisionReason,
  deriveTimelineEvent,
} from './browserTtsDeBenchmarkPolicy';

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
};

export function buildInputLanguageBenchmarkTimelinePoint({
  live,
  decision,
  timestampMs,
  language,
  semanticCompleteness,
  sessionId,
  ttsEnvironment,
  phraseIndex,
  totalSemanticPhrases,
  event,
}: InputLanguageBenchmarkTimelinePointArgs): AdaptiveTimelinePoint {
  const ttsEnvironmentId = ttsEnvironment ? getBrowserTtsEnvironmentId(ttsEnvironment) : undefined;

  return {
    timestampMs,
    inputMode: live.inputMode,
    language,
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
    semanticCompleteness,
    sessionId,
    ttsEnvironmentId,
    phraseId: live.phraseId,
    phraseIndex,
    totalSemanticPhrases,
    decisionReason: buildTimelineDecisionReason(live, decision, sessionId, phraseIndex, totalSemanticPhrases, event),
    executionHint: decision.executionHint,
    event: event ?? deriveTimelineEvent(decision),
  };
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

export function countUniqueSessions(timeline: AdaptiveTimelinePoint[]): number {
  const ids = new Set(timeline.map((point) => point.sessionId).filter(Boolean));
  return ids.size > 0 ? ids.size : timeline.length > 0 ? 1 : 0;
}
