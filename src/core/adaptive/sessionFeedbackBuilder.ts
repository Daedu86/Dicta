import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics, InputMode, LanguageCode } from './types';
import type { SessionFeedbackBuildArgs } from './sessionFeedbackContracts';
import { compactBenchmark } from './sessionFeedbackBenchmarkSnapshots';
import { buildPhraseStats, detectPlaybackIssues } from './sessionFeedbackPlaybackDiagnostics';
import { buildFeedbackNotes, computeImprovementDelta, computeVerdict } from './sessionFeedbackScoring';

export function buildAdaptiveSessionFeedback(args: SessionFeedbackBuildArgs): AdaptiveSessionFeedback {
  const phraseEvents = shouldScopeFeedbackToSession(args.inputMode, args.language)
    ? args.phraseEvents.filter((event) => event.sessionId === args.sessionId)
    : args.phraseEvents;
  const playbackIssues = detectPlaybackIssues(phraseEvents);
  const phraseStats = buildPhraseStats(phraseEvents, args.totalPhrases);
  const improvementDelta = computeImprovementDelta(args.benchmarkBefore, args.benchmarkAfter, playbackIssues);
  const verdict = computeVerdict(improvementDelta.overallImprovementScore, phraseEvents.length);
  const notes = buildFeedbackNotes(playbackIssues, improvementDelta, verdict);
  const sessionCountDroppedReason = deriveSessionCountDroppedReason(args.benchmarkBefore, args.benchmarkAfter);

  return {
    sessionId: args.sessionId,
    inputMode: args.inputMode,
    language: args.language,
    scriptId: args.scriptId,
    scriptTitle: args.scriptTitle,
    createdAt: args.createdAt,
    completedAt: args.completedAt,
    sourceType: args.sourceType,
    ...(args.inputMode === 'browser-tts' && args.ttsEnvironment ? { ttsEnvironment: args.ttsEnvironment } : {}),
    benchmarkBefore: args.benchmarkBefore ? compactBenchmark(args.benchmarkBefore) : undefined,
    benchmarkAfter: args.benchmarkAfter ? compactBenchmark(args.benchmarkAfter) : undefined,
    sessionCountDroppedReason,
    improvementDelta,
    playbackIssues,
    phraseStats,
    verdict,
    notes,
  };
}

function shouldScopeFeedbackToSession(inputMode: InputMode, language: LanguageCode): boolean {
  return inputMode === 'browser-tts' && String(language).toLowerCase() === 'de';
}

function deriveSessionCountDroppedReason(
  before: InputLanguageBenchmarkMetrics | null | undefined,
  after: InputLanguageBenchmarkMetrics | null | undefined,
): string | undefined {
  if (!before || !after) return undefined;
  if (after.sessionCount >= before.sessionCount) return undefined;
  if (after.sampleCount < before.sampleCount) {
    return 'sessionCount decreased after rolling-window pruning removed older timeline samples.';
  }
  return 'sessionCount decreased after sessionId-based unique-session recalculation on the current benchmark timeline.';
}
