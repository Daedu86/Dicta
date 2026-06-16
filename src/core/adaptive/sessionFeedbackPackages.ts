import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics, InputMode, LanguageCode } from './types';
import {
  buildBrowserTtsDeDiagnostics,
  normalizeInputLanguageBenchmarkForRecommendation,
} from './AdaptiveInputLanguageBenchmarkService';
import type { BrowserTtsEnvironmentFingerprint, BrowserTtsEnvironmentHistoryEntry } from '../../types/dictation';
import type { SessionFeedbackReference, TimelinePlaybackDiagnostics } from './sessionFeedbackContracts';
import { compactBenchmark, normalizeFeedbackBenchmarkSnapshots } from './sessionFeedbackBenchmarkSnapshots';
import { derivePlaybackDiagnosticsFromTimeline } from './sessionFeedbackPlaybackDiagnostics';
import {
  buildFeedbackUnavailableSnapshot,
  buildSessionFeedbackRecency,
  buildSessionFeedbackStatus,
  summarizeFeedbackForRecency,
} from './sessionFeedbackRecency';

const FEEDBACK_EXPORT_TIMELINE_CAP = 120;

export function buildSessionFeedbackJsonPayload(
  inputMode: InputMode,
  language: LanguageCode,
  feedback: AdaptiveSessionFeedback | null,
  options: {
    activeSessionStatus?: string;
    fallbackDiagnostics?: TimelinePlaybackDiagnostics;
    latestFinishedSession?: SessionFeedbackReference | null;
  } = {},
): unknown {
  const recency = buildSessionFeedbackRecency(feedback, options.latestFinishedSession);
  const currentFeedback = recency?.status === 'stale_for_latest_finished_session' ? null : feedback;
  const sessionFeedbackStatus = buildSessionFeedbackStatus(currentFeedback, options.activeSessionStatus, recency);
  return {
    inputMode,
    language,
    sessionFeedbackStatus,
    ...(recency ? { sessionFeedbackRecency: recency } : {}),
    latestSessionFeedback: currentFeedback ?? buildFeedbackUnavailableSnapshot(sessionFeedbackStatus, recency),
    staleSessionFeedback: recency?.status === 'stale_for_latest_finished_session' ? summarizeFeedbackForRecency(feedback) : null,
    playbackIssues: currentFeedback?.playbackIssues ?? null,
    fallbackPlaybackDiagnostics: currentFeedback ? null : (options.fallbackDiagnostics ?? null),
    improvementDelta: currentFeedback?.improvementDelta ?? null,
    phraseStats: currentFeedback?.phraseStats ?? null,
  };
}

export function buildBenchmarkFeedbackPackage(
  profile: InputLanguageBenchmarkMetrics,
  feedback: AdaptiveSessionFeedback | null,
  options: { activeSessionStatus?: string; activitySummary?: unknown; latestFinishedSession?: SessionFeedbackReference | null } = {},
): unknown {
  const normalizedProfile = normalizeInputLanguageBenchmarkForRecommendation(profile);
  const recentTimelinePoints = normalizedProfile.timeline.slice(-FEEDBACK_EXPORT_TIMELINE_CAP);
  const recency = buildSessionFeedbackRecency(feedback, options.latestFinishedSession);
  const currentFeedback = recency?.status === 'stale_for_latest_finished_session' ? null : feedback;
  const fallbackDiagnostics = currentFeedback ? null : derivePlaybackDiagnosticsFromTimeline(recentTimelinePoints);
  const sessionFeedbackStatus = buildSessionFeedbackStatus(currentFeedback, options.activeSessionStatus, recency);
  const browserTtsDeDiagnostics = buildBrowserTtsDeDiagnostics(normalizedProfile, FEEDBACK_EXPORT_TIMELINE_CAP) ?? undefined;
  const ttsEnvironmentReport = buildTtsEnvironmentReport(normalizedProfile, currentFeedback);
  return {
    inputMode: normalizedProfile.inputMode,
    language: normalizedProfile.language,
    sessionFeedbackStatus,
    ...ttsEnvironmentReport,
    ...(recency ? { sessionFeedbackRecency: recency } : {}),
    benchmarkProfile: compactBenchmark(normalizedProfile),
    recommendation: normalizedProfile.recommendation,
    weakAreas: normalizedProfile.weakAreas,
    ...(browserTtsDeDiagnostics ? { browserTtsDeDiagnostics } : {}),
    activitySummary: options.activitySummary ?? null,
    recentTimelinePoints,
    latestSessionFeedback: currentFeedback
      ? normalizeFeedbackBenchmarkSnapshots(currentFeedback)
      : buildFeedbackUnavailableSnapshot(sessionFeedbackStatus, recency),
    staleSessionFeedback: recency?.status === 'stale_for_latest_finished_session' ? summarizeFeedbackForRecency(feedback) : null,
    playbackDiagnostics: currentFeedback?.playbackIssues ?? fallbackDiagnostics,
    dictationScript: currentFeedback?.scriptTitle
      ? {
          status: 'current_feedback_script',
          scriptId: currentFeedback.scriptId,
          scriptTitle: currentFeedback.scriptTitle,
        }
      : recency?.status === 'stale_for_latest_finished_session' && feedback?.scriptTitle
        ? {
            status: 'stale_feedback_script',
            scriptId: feedback.scriptId,
            scriptTitle: feedback.scriptTitle,
            feedbackSessionId: feedback.sessionId,
            latestFinishedSessionId: recency.latestFinishedSession?.sessionId ?? null,
          }
      : null,
  };
}

export function buildBenchmarkFeedbackPromptPackage(
  profile: InputLanguageBenchmarkMetrics,
  feedback: AdaptiveSessionFeedback | null,
  llmPrompt: string,
  options: { activeSessionStatus?: string; activitySummary?: unknown; latestFinishedSession?: SessionFeedbackReference | null } = {},
): string {
  const packageJson = JSON.stringify(buildBenchmarkFeedbackPackage(profile, feedback, options), null, 2);
  return [
    'Benchmark + session feedback package:',
    packageJson,
    '',
    'Additional LLM instructions:',
    '- Use the session feedback to decide whether the generated DictationScript improved, stayed stable, or regressed.',
    '- Avoid repeating problematic phrases listed in playbackIssues.repeatedPhrases.',
    '- If repeatedPhraseCount is high, reduce phrase complexity and shorten replay-sensitive phrases.',
    '- Preserve phrase order. Replay must repeat the current phrase and must not advance to the next phrase.',
    '- Do not introduce ' + 'unsafe mid-grammar splits.',
    '- Adjust the next DictationScript based on actual improvementDelta and verdict.',
    '',
    llmPrompt,
  ].join('\n');
}

function buildTtsEnvironmentReport(
  profile: InputLanguageBenchmarkMetrics,
  feedback: AdaptiveSessionFeedback | null,
): {
  ttsEnvironment?: BrowserTtsEnvironmentFingerprint;
  ttsEnvironmentHistory?: BrowserTtsEnvironmentHistoryEntry[];
  environmentChanged?: boolean;
} {
  if (profile.inputMode !== 'browser-tts') return {};
  const ttsEnvironment = feedback?.ttsEnvironment ?? profile.ttsEnvironment;
  const history = profile.ttsEnvironmentHistory;
  return {
    ...(ttsEnvironment ? { ttsEnvironment } : {}),
    ...(history && history.length > 0 ? { ttsEnvironmentHistory: history } : {}),
    ...(profile.environmentChanged || (history && history.length > 1) ? { environmentChanged: true } : {}),
  };
}
