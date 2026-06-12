import type {
  AdaptiveSessionFeedback,
  AdaptiveTimelinePoint,
  InputLanguageBenchmarkMetrics,
  InputMode,
  PhrasePlaybackEvent,
} from '../core/adaptive/types';
import { buildAdaptiveUserSystemReport } from '../core/adaptive/adaptiveUserSystemReport';
import { buildDictationScriptPrompt } from '../core/adaptive/dictationScriptPrompt';
import {
  buildBenchmarkFeedbackPackage,
  buildBenchmarkFeedbackPromptPackage,
  buildSessionFeedbackJsonPayload,
  derivePlaybackDiagnosticsFromTimeline,
} from '../core/adaptive/sessionFeedback';
import type { MetricsLanguageView } from '../core/liveMetrics';
import {
  buildBenchmarkActivitySummary,
  buildLatestFinishedSessionFeedbackReference,
  findLatestFinishedSessionForProfile,
} from './adaptiveFeedbackContext';
import { resolveStoredSessionLanguage } from './appRuntimeHelpers';
import { formatInputModeLabel, formatSessionInputMode } from './sessionDisplayFormatters';
import { formatSessionPlaybackDuration } from './sessionPlaybackDuration';
import type { StoredSession } from './sessionTypes';

type AdaptiveExportPackageContext = {
  sessions: StoredSession[];
  profile: InputLanguageBenchmarkMetrics;
  feedback: AdaptiveSessionFeedback | null;
  activeSessionStatus: string | undefined;
};

type InsightsDiagnosticReportExportContext = AdaptiveExportPackageContext & {
  insightsDiagnosticInputMode: InputMode;
  metricsLanguageView: MetricsLanguageView;
};

type HumanFeedbackPromptExportContext = AdaptiveExportPackageContext & {
  humanFeedback: string;
};

export function buildAdaptiveEventCounts(
  timelinePoints: AdaptiveTimelinePoint[],
  phraseEvents: PhrasePlaybackEvent[],
): Record<string, number> {
  const trackedEvents: Array<string> = [
    'pause',
    'defer_pause',
    'phrase_advance',
    'phrase_completed',
    'rate_change',
    'support_entered',
    'flow_entered',
    'phrase_started',
    'phrase_completed',
  ];
  const counts = Object.fromEntries(trackedEvents.map((event) => [event, 0])) as Record<string, number>;
  for (const point of timelinePoints) {
    const event = point.event;
    if (event && event in counts) counts[event] += 1;
  }
  for (const event of phraseEvents) {
    if (event.event in counts) counts[event.event] += 1;
  }
  return counts;
}

export function buildAdaptiveSessionFeedbackExportPayload({
  sessions,
  profile,
  feedback,
  activeSessionStatus,
}: AdaptiveExportPackageContext): unknown {
  const latestFinishedSession = buildLatestFinishedSessionFeedbackReference(sessions, profile);

  return buildSessionFeedbackJsonPayload(profile.inputMode, profile.language, feedback, {
    activeSessionStatus,
    fallbackDiagnostics: derivePlaybackDiagnosticsFromTimeline(profile.timeline.slice(-60)),
    latestFinishedSession,
  });
}

export function buildAdaptiveBenchmarkFeedbackExportPayload({
  sessions,
  profile,
  feedback,
  activeSessionStatus,
}: AdaptiveExportPackageContext): unknown {
  const latestFinishedSession = buildLatestFinishedSessionFeedbackReference(sessions, profile);

  return buildBenchmarkFeedbackPackage(profile, feedback, {
    activeSessionStatus,
    activitySummary: buildBenchmarkActivitySummary(sessions, profile),
    latestFinishedSession,
  });
}

export function buildAdaptiveBenchmarkFeedbackPromptExportText({
  sessions,
  profile,
  feedback,
  activeSessionStatus,
}: AdaptiveExportPackageContext): string {
  const latestFinishedSession = buildLatestFinishedSessionFeedbackReference(sessions, profile);

  return buildBenchmarkFeedbackPromptPackage(profile, feedback, buildDictationScriptPrompt(profile), {
    activeSessionStatus,
    activitySummary: buildBenchmarkActivitySummary(sessions, profile),
    latestFinishedSession,
  });
}

export function buildAdaptiveBenchmarkFeedbackPromptWithHumanFeedbackPayload({
  sessions,
  profile,
  feedback,
  activeSessionStatus,
  humanFeedback,
}: HumanFeedbackPromptExportContext): Record<string, unknown> {
  const base = buildAdaptiveBenchmarkFeedbackExportPayload({
    sessions,
    profile,
    feedback,
    activeSessionStatus,
  }) as Record<string, unknown>;

  return {
    ...base,
    llmPrompt: buildDictationScriptPrompt(profile),
    humanFeedback: humanFeedback.trim(),
  };
}

export function buildInsightsDiagnosticReportExport({
  sessions,
  profile,
  feedback,
  activeSessionStatus,
  insightsDiagnosticInputMode,
  metricsLanguageView,
}: InsightsDiagnosticReportExportContext): unknown {
  const technicalDebugData = buildAdaptiveBenchmarkFeedbackExportPayload({
    sessions,
    profile,
    feedback,
    activeSessionStatus,
  });
  const latestFinishedFullSession = findLatestFinishedSessionForProfile(sessions, profile);

  return buildAdaptiveUserSystemReport({
    profile,
    feedback,
    technicalDebugData,
    inputModeLabel: formatInputModeLabel(insightsDiagnosticInputMode),
    languageLabel: metricsLanguageView.toUpperCase(),
    latestSession: latestFinishedFullSession
      ? {
          ...latestFinishedFullSession,
          inputModeLabel: formatSessionInputMode(latestFinishedFullSession.inputMode),
          language: String(resolveStoredSessionLanguage(latestFinishedFullSession)),
          durationLabel: formatSessionPlaybackDuration(latestFinishedFullSession),
        }
      : null,
  });
}
