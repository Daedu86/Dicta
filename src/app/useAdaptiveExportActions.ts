import { useCallback } from 'react';
import type {
  AdaptiveSessionFeedback,
  AdaptiveTimelinePoint,
  InputLanguageBenchmarkMetrics,
  InputMode,
  PhrasePlaybackEvent,
} from '../core/adaptive/types';
import { buildAdaptiveUserSystemReport } from '../core/adaptive/adaptiveUserSystemReport';
import { normalizeBenchmarkLanguage } from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildBenchmarkFilename, buildSelectedBenchmarkExportPayload } from '../core/adaptive/benchmarkJson';
import { buildDictationScriptPrompt, buildDictationScriptTemplate } from '../core/adaptive/dictationScriptPrompt';
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
import { writeTextToClipboard } from './clipboardText';
import { mapSessionInputMode, resolveStoredSessionLanguage } from './appRuntimeHelpers';
import { formatInputModeLabel, formatSessionInputMode } from './sessionDisplayFormatters';
import { formatSessionPlaybackDuration } from './sessionPlaybackDuration';
import type { SessionStatus, StoredSession, TypingLanguage } from './sessionTypes';

type UseAdaptiveExportActionsOptions = {
  sessions: StoredSession[];
  activeSession: StoredSession | null;
  activeSessionFinished: boolean;
  sessionStatus: SessionStatus;
  getActiveTypingLanguage: () => TypingLanguage | null;
  insightsDiagnosticProfile: InputLanguageBenchmarkMetrics;
  insightsDiagnosticFeedback: AdaptiveSessionFeedback | null;
  insightsDiagnosticInputMode: InputMode;
  metricsLanguageView: MetricsLanguageView;
  setBenchmarkExportMessage: (message: string) => void;
  setExportMessage: (message: string) => void;
  setSessionFeedbackMessage: (message: string) => void;
  setInsightsDiagnosticFallbackReport: (report: string) => void;
  setInsightsDiagnosticMessage: (message: string) => void;
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

export function useAdaptiveExportActions({
  sessions,
  activeSession,
  activeSessionFinished,
  sessionStatus,
  getActiveTypingLanguage,
  insightsDiagnosticProfile,
  insightsDiagnosticFeedback,
  insightsDiagnosticInputMode,
  metricsLanguageView,
  setBenchmarkExportMessage,
  setExportMessage,
  setSessionFeedbackMessage,
  setInsightsDiagnosticFallbackReport,
  setInsightsDiagnosticMessage,
}: UseAdaptiveExportActionsOptions) {
  const getBenchmarkActiveSessionStatus = useCallback((profile: InputLanguageBenchmarkMetrics): string | undefined => {
    if (!activeSession || activeSessionFinished) return undefined;
    const activeInputMode = mapSessionInputMode(activeSession.inputMode);
    const activeLanguage = normalizeBenchmarkLanguage(getActiveTypingLanguage() ?? resolveStoredSessionLanguage(activeSession));
    if (profile.inputMode !== activeInputMode || profile.language !== activeLanguage) return undefined;
    return sessionStatus;
  }, [activeSession, activeSessionFinished, getActiveTypingLanguage, sessionStatus]);

  const copySelectedBenchmarkJson = useCallback(async (profile: InputLanguageBenchmarkMetrics): Promise<void> => {
    try {
      const payload = buildSelectedBenchmarkExportPayload(profile);
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setBenchmarkExportMessage('Benchmark JSON copied.');
    } catch {
      setBenchmarkExportMessage('Could not copy benchmark JSON.');
    }
  }, [setBenchmarkExportMessage]);

  const downloadSelectedBenchmarkJson = useCallback((profile: InputLanguageBenchmarkMetrics): void => {
    const payload = buildSelectedBenchmarkExportPayload(profile);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildBenchmarkFilename(profile.inputMode, String(profile.language), new Date());
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setBenchmarkExportMessage('Benchmark JSON exported.');
  }, [setBenchmarkExportMessage]);

  const copyDictationScriptPrompt = useCallback(async (profile: InputLanguageBenchmarkMetrics): Promise<void> => {
    try {
      await navigator.clipboard.writeText(buildDictationScriptPrompt(profile));
      setExportMessage('LLM prompt copied.');
    } catch {
      setExportMessage('Could not copy LLM prompt.');
    }
  }, [setExportMessage]);

  const copyBenchmarkWithDictationScriptPrompt = useCallback(async (profile: InputLanguageBenchmarkMetrics): Promise<void> => {
    try {
      const benchmarkJson = JSON.stringify(buildSelectedBenchmarkExportPayload(profile), null, 2);
      const prompt = buildDictationScriptPrompt(profile);
      await navigator.clipboard.writeText(`Benchmark JSON context:\n${benchmarkJson}\n\nLLM prompt:\n${prompt}`);
      setExportMessage('Benchmark JSON and LLM prompt copied.');
    } catch {
      setExportMessage('Could not copy benchmark and LLM prompt.');
    }
  }, [setExportMessage]);

  const copyDictationScriptTemplate = useCallback(async (profile: InputLanguageBenchmarkMetrics): Promise<void> => {
    try {
      await navigator.clipboard.writeText(buildDictationScriptTemplate(profile.inputMode, profile.language));
      setExportMessage('Sample output template copied.');
    } catch {
      setExportMessage('Could not copy sample output template.');
    }
  }, [setExportMessage]);

  const copySessionFeedbackJson = useCallback(async (
    profile: InputLanguageBenchmarkMetrics,
    feedback: AdaptiveSessionFeedback | null,
  ): Promise<void> => {
    try {
      const latestFinishedSession = buildLatestFinishedSessionFeedbackReference(sessions, profile);
      await navigator.clipboard.writeText(JSON.stringify(buildSessionFeedbackJsonPayload(profile.inputMode, profile.language, feedback, {
        activeSessionStatus: getBenchmarkActiveSessionStatus(profile),
        fallbackDiagnostics: derivePlaybackDiagnosticsFromTimeline(profile.timeline.slice(-60)),
        latestFinishedSession,
      }), null, 2));
      setSessionFeedbackMessage('Session feedback JSON copied.');
    } catch {
      setSessionFeedbackMessage('Could not copy session feedback JSON.');
    }
  }, [getBenchmarkActiveSessionStatus, sessions, setSessionFeedbackMessage]);

  const copyBenchmarkFeedbackJson = useCallback(async (
    profile: InputLanguageBenchmarkMetrics,
    feedback: AdaptiveSessionFeedback | null,
  ): Promise<void> => {
    try {
      const latestFinishedSession = buildLatestFinishedSessionFeedbackReference(sessions, profile);
      await navigator.clipboard.writeText(JSON.stringify(buildBenchmarkFeedbackPackage(profile, feedback, {
        activeSessionStatus: getBenchmarkActiveSessionStatus(profile),
        activitySummary: buildBenchmarkActivitySummary(sessions, profile),
        latestFinishedSession,
      }), null, 2));
      setSessionFeedbackMessage('Benchmark + feedback package copied.');
    } catch {
      setSessionFeedbackMessage('Could not copy benchmark + feedback package.');
    }
  }, [getBenchmarkActiveSessionStatus, sessions, setSessionFeedbackMessage]);

  const selectInsightsDiagnosticFallbackReport = useCallback((): void => {
    const textarea = document.getElementById('insights-diagnostic-fallback-report') as HTMLTextAreaElement | null;
    if (!textarea) return;
    textarea.focus();
    textarea.select();
  }, []);

  const copyInsightsDiagnosticPackage = useCallback(async (): Promise<void> => {
    try {
      const latestFinishedSession = buildLatestFinishedSessionFeedbackReference(sessions, insightsDiagnosticProfile);
      const latestFinishedFullSession = findLatestFinishedSessionForProfile(sessions, insightsDiagnosticProfile);
      const technicalDebugData = buildBenchmarkFeedbackPackage(insightsDiagnosticProfile, insightsDiagnosticFeedback, {
        activeSessionStatus: getBenchmarkActiveSessionStatus(insightsDiagnosticProfile),
        activitySummary: buildBenchmarkActivitySummary(sessions, insightsDiagnosticProfile),
        latestFinishedSession,
      });
      const report = buildAdaptiveUserSystemReport({
        profile: insightsDiagnosticProfile,
        feedback: insightsDiagnosticFeedback,
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
      const reportJson = JSON.stringify(report, null, 2);
      const copied = await writeTextToClipboard(reportJson);
      if (copied) {
        setInsightsDiagnosticFallbackReport('');
        setInsightsDiagnosticMessage(
          `Copied adaptive user/system report for ${formatInputModeLabel(insightsDiagnosticInputMode)} / ${metricsLanguageView.toUpperCase()}.`,
        );
        return;
      }

      setInsightsDiagnosticFallbackReport(reportJson);
      setInsightsDiagnosticMessage('Clipboard access is blocked. Report generated below; select it and press Ctrl+C.');
      window.setTimeout(selectInsightsDiagnosticFallbackReport, 0);
    } catch (error) {
      console.error('Copy insights report failed.', error);
      const message = error instanceof Error ? error.message : String(error);
      setInsightsDiagnosticFallbackReport('');
      setInsightsDiagnosticMessage(`Could not prepare the insights report. ${message}`);
    }
  }, [
    getBenchmarkActiveSessionStatus,
    insightsDiagnosticFeedback,
    insightsDiagnosticInputMode,
    insightsDiagnosticProfile,
    metricsLanguageView,
    selectInsightsDiagnosticFallbackReport,
    sessions,
    setInsightsDiagnosticFallbackReport,
    setInsightsDiagnosticMessage,
  ]);

  const copyBenchmarkFeedbackPrompt = useCallback(async (
    profile: InputLanguageBenchmarkMetrics,
    feedback: AdaptiveSessionFeedback | null,
  ): Promise<void> => {
    try {
      const latestFinishedSession = buildLatestFinishedSessionFeedbackReference(sessions, profile);
      await navigator.clipboard.writeText(buildBenchmarkFeedbackPromptPackage(profile, feedback, buildDictationScriptPrompt(profile), {
        activeSessionStatus: getBenchmarkActiveSessionStatus(profile),
        activitySummary: buildBenchmarkActivitySummary(sessions, profile),
        latestFinishedSession,
      }));
      setSessionFeedbackMessage('Benchmark + feedback + LLM prompt copied.');
    } catch {
      setSessionFeedbackMessage('Could not copy benchmark + feedback + LLM prompt.');
    }
  }, [getBenchmarkActiveSessionStatus, sessions, setSessionFeedbackMessage]);

  const copyBenchmarkFeedbackPromptWithHumanFeedback = useCallback(async (
    profile: InputLanguageBenchmarkMetrics,
    feedback: AdaptiveSessionFeedback | null,
    humanFeedback: string,
  ): Promise<void> => {
    try {
      const latestFinishedSession = buildLatestFinishedSessionFeedbackReference(sessions, profile);
      const base = buildBenchmarkFeedbackPackage(profile, feedback, {
        activeSessionStatus: getBenchmarkActiveSessionStatus(profile),
        activitySummary: buildBenchmarkActivitySummary(sessions, profile),
        latestFinishedSession,
      }) as Record<string, unknown>;
      const payload = {
        ...base,
        llmPrompt: buildDictationScriptPrompt(profile),
        humanFeedback: humanFeedback.trim(),
      };
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setSessionFeedbackMessage('Copied JSON Benchmark + Feedback + LLM Prompt + Human feedback');
    } catch {
      setSessionFeedbackMessage('Could not copy benchmark + feedback + LLM prompt + human feedback.');
    }
  }, [getBenchmarkActiveSessionStatus, sessions, setSessionFeedbackMessage]);

  return {
    getBenchmarkActiveSessionStatus,
    copySelectedBenchmarkJson,
    downloadSelectedBenchmarkJson,
    copyDictationScriptPrompt,
    copyBenchmarkWithDictationScriptPrompt,
    copyDictationScriptTemplate,
    copySessionFeedbackJson,
    copyBenchmarkFeedbackJson,
    copyInsightsDiagnosticPackage,
    selectInsightsDiagnosticFallbackReport,
    copyBenchmarkFeedbackPrompt,
    copyBenchmarkFeedbackPromptWithHumanFeedback,
  };
}
