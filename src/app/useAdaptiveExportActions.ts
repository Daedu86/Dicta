import { useCallback } from 'react';
import type {
  AdaptiveSessionFeedback,
  InputLanguageBenchmarkMetrics,
} from '../core/adaptive/types';
import { buildBenchmarkFilename, buildSelectedBenchmarkExportPayload } from '../core/adaptive/benchmarkJson';
import { buildDictationScriptPrompt, buildDictationScriptTemplate } from '../core/adaptive/dictationScriptPrompt';
import { writeTextToClipboard } from './clipboardText';
import { formatInputModeLabel } from './sessionDisplayFormatters';
import {
  buildAdaptiveBenchmarkFeedbackExportPayload,
  buildAdaptiveBenchmarkFeedbackPromptExportText,
  buildAdaptiveBenchmarkFeedbackPromptWithHumanFeedbackPayload,
  buildAdaptiveSessionFeedbackExportPayload,
  buildInsightsDiagnosticReportExport,
} from './adaptiveExportPackages';
import { getAdaptiveBenchmarkActiveSessionStatus } from './adaptiveExportActiveSessionStatus';
import type { UseAdaptiveExportActionsOptions } from './useAdaptiveExportActionsTypes';

export type { UseAdaptiveExportActionsOptions } from './useAdaptiveExportActionsTypes';

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
    return getAdaptiveBenchmarkActiveSessionStatus({
      activeSession,
      activeSessionFinished,
      sessionStatus,
      getActiveTypingLanguage,
      profile,
    });
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
      const payload = buildAdaptiveSessionFeedbackExportPayload({
        sessions,
        profile,
        feedback,
        activeSessionStatus: getBenchmarkActiveSessionStatus(profile),
      });
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
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
      const payload = buildAdaptiveBenchmarkFeedbackExportPayload({
        sessions,
        profile,
        feedback,
        activeSessionStatus: getBenchmarkActiveSessionStatus(profile),
      });
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
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
      const report = buildInsightsDiagnosticReportExport({
        sessions,
        profile: insightsDiagnosticProfile,
        feedback: insightsDiagnosticFeedback,
        activeSessionStatus: getBenchmarkActiveSessionStatus(insightsDiagnosticProfile),
        insightsDiagnosticInputMode,
        metricsLanguageView,
      });
      const reportJson = JSON.stringify(report, null, 2);
      const copied = await writeTextToClipboard(reportJson);
      if (copied) {
        setInsightsDiagnosticFallbackReport('');
        setInsightsDiagnosticMessage(
          `Copied adaptive report for ${formatInputModeLabel(insightsDiagnosticInputMode)} / ${metricsLanguageView.toUpperCase()}.`,
        );
        return;
      }

      setInsightsDiagnosticFallbackReport(reportJson);
      setInsightsDiagnosticMessage('Clipboard access is blocked. Adaptive report generated below; select it and press Ctrl+C.');
      window.setTimeout(selectInsightsDiagnosticFallbackReport, 0);
    } catch (error) {
      console.error('Copy adaptive report failed.', error);
      const message = error instanceof Error ? error.message : String(error);
      setInsightsDiagnosticFallbackReport('');
      setInsightsDiagnosticMessage(`Could not prepare the adaptive report. ${message}`);
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
      const promptPackage = buildAdaptiveBenchmarkFeedbackPromptExportText({
        sessions,
        profile,
        feedback,
        activeSessionStatus: getBenchmarkActiveSessionStatus(profile),
      });
      await navigator.clipboard.writeText(promptPackage);
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
      const payload = buildAdaptiveBenchmarkFeedbackPromptWithHumanFeedbackPayload({
        sessions,
        profile,
        feedback,
        activeSessionStatus: getBenchmarkActiveSessionStatus(profile),
        humanFeedback,
      });
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
