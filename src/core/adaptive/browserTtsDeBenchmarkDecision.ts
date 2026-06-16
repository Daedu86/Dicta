import { appendLegacyReasonToken } from './pacingReasonCodes';
import type { AdaptiveTimelinePoint, InputLanguageBenchmarkMetrics, LiveTelemetryFrame, PacingDecision } from './types';
import { normalizeBenchmarkLanguage } from './adaptiveBenchmarkLanguage';
import {
  BROWSER_TTS_DE_MAX_RATE_MARGIN,
  clampNumber,
  isBrowserTtsDe,
} from './browserTtsDeBenchmarkCore';
import {
  deriveTimelineEvent,
  getBrowserTtsDeBenchmarkRejectionTokens,
} from './browserTtsDeBenchmarkSamples';

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
