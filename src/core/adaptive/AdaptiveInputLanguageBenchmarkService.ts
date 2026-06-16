import type { InputLanguageBenchmarkMetrics } from './types';
import type { InputLanguageBenchmarkUpdateArgs } from './inputLanguageBenchmarkUpdateTypes';
import { normalizeBenchmarkLanguage } from './adaptiveBenchmarkLanguage';
import { createEmptyInputLanguageBenchmark, ROLLING_WINDOW_DAYS } from './inputLanguageBenchmarkDefaults';
import { computeExecutionFidelity } from './inputLanguageBenchmarkExecution';
import { buildBrowserTtsEnvironmentBenchmarkState } from './inputLanguageBenchmarkEnvironment';
import { buildInputLanguageBenchmarkScoringState } from './inputLanguageBenchmarkScoringState';
import {
  buildNextInputLanguageBenchmarkSnapshot,
  preserveUnscoredBenchmarkScoreState,
  applyScoredBenchmarkDerivedMetrics,
} from './inputLanguageBenchmarkSnapshot';
import {
  buildInputLanguageBenchmarkTimelinePoint,
  pruneTimelineToRollingWindow,
} from './inputLanguageBenchmarkTimeline';
import { getBrowserTtsDeBenchmarkRejectionReason, isValidBrowserTtsDeBenchmarkSample } from './browserTtsDeBenchmarkPolicy';
import { normalizeInputLanguageBenchmarkForRecommendation } from './inputLanguageBenchmarkRecommendation';

export type { InputLanguageBenchmarkUpdateArgs } from './inputLanguageBenchmarkUpdateTypes';
export { normalizeBenchmarkLanguage } from './adaptiveBenchmarkLanguage';
export {
  buildBrowserTtsDeDiagnostics,
  clampBrowserTtsDeDecisionToRecommendation,
  getBrowserTtsDeBenchmarkRejectionReason,
  isValidBrowserTtsDeBenchmarkSample,
} from './browserTtsDeBenchmarkPolicy';
export type {
  BrowserTtsDeBenchmarkRejectionReason,
  BrowserTtsDeDiagnostics,
} from './browserTtsDeBenchmarkPolicy';
export {
  createEmptyInputLanguageBenchmark,
} from './inputLanguageBenchmarkDefaults';
export {
  computeSweetSpotScore,
  computeSemanticFidelityScore,
  computeControlFidelityScore,
  computeLearningEffectivenessScore,
  computeFlowStabilityScore,
} from './inputLanguageBenchmarkAggregateScores';
export {
  computeRateAccuracyBuckets,
} from './inputLanguageBenchmarkTimelineAnalytics';
export {
  normalizeInputLanguageBenchmarkForRecommendation,
  computeBenchmarkRecommendation,
  pickBestRateRange,
  deriveWeakAreas,
} from './inputLanguageBenchmarkRecommendation';
export {
  pruneTimelineToRollingWindow,
} from './inputLanguageBenchmarkTimeline';

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
  const ttsEnvironment = args.live.inputMode === 'browser-tts' ? args.ttsEnvironment ?? undefined : undefined;
  const timelinePoint = buildInputLanguageBenchmarkTimelinePoint({
    live: args.live,
    decision: args.decision,
    timestampMs,
    language,
    semanticCompleteness,
    sessionId: args.sessionId,
    ttsEnvironment,
    phraseIndex: args.phraseIndex,
    totalSemanticPhrases: args.totalSemanticPhrases,
    event: args.event,
    decisionTraceId: args.decisionTraceId,
    requestedPlaybackRate: args.execution?.requestedPlaybackRate,
    actualPlaybackRate: args.execution?.actualPlaybackRate,
    requestedPauseMs: args.execution?.requestedPauseMs,
    actualPauseMs: args.execution?.actualPauseMs,
    replayExecuted: args.execution?.replayExecuted,
    unsafeBoundaryApplied: args.decision.deferPauseUntilSafeBoundary,
    mobileFallbackApplied: args.execution?.fallbackUsed,
    recoverySafeBoundary: args.decision.deferPauseUntilSafeBoundary,
    germanShortBias: language === 'de' && args.live.inputMode === 'browser-tts',
  });
  const timeline = pruneTimelineToRollingWindow([...current.timeline, timelinePoint], ROLLING_WINDOW_DAYS);
  const environmentState = buildBrowserTtsEnvironmentBenchmarkState({
    current,
    timeline,
    ttsEnvironment,
    timestampMs,
  });
  const scoringState = buildInputLanguageBenchmarkScoringState({
    current,
    language,
    timeline,
    timelinePoint,
    semanticCutPenalty,
    unsafePause,
    safePause,
    deferPauseUntilSafeBoundary: args.decision.deferPauseUntilSafeBoundary,
    replayDenied,
  });
  const benchmarkRejectionReason =
    args.live.inputMode === 'browser-tts' && language === 'de' && !isValidBrowserTtsDeBenchmarkSample(timelinePoint)
      ? getBrowserTtsDeBenchmarkRejectionReason(timelinePoint)
      : args.benchmarkRejectionReason ?? undefined;
  timelinePoint.benchmarkRejectionReason = benchmarkRejectionReason ?? undefined;
  const next = buildNextInputLanguageBenchmarkSnapshot({
    current,
    live: args.live,
    decision: args.decision,
    timestampMs,
    timeline,
    environmentState,
    scoringState,
    semanticCompleteness,
    phraseDifficulty,
    executionFidelity,
  });

  if (scoringState.usesFilteredBrowserTtsDeScoring && !scoringState.hasBrowserTtsDeScoringSamples) {
    return normalizeInputLanguageBenchmarkForRecommendation(preserveUnscoredBenchmarkScoreState(next, current));
  }

  return normalizeInputLanguageBenchmarkForRecommendation(
    applyScoredBenchmarkDerivedMetrics(next, scoringState.scoringTimeline),
  );
}
