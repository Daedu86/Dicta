import { useCallback } from 'react';
import type { InputLanguageBenchmarkMetrics } from '../core/adaptive/types';
import { buildBenchmarkFilename, buildSelectedBenchmarkExportPayload } from '../core/adaptive/benchmarkJson';
import { buildDictationScriptPrompt, buildDictationScriptTemplate } from '../core/adaptive/dictationScriptPrompt';
import { getAdaptiveBenchmarkActiveSessionStatus } from './adaptiveExportActiveSessionStatus';
import { downloadJsonFile } from './adaptiveExportDownload';
import type { UseAdaptiveExportActionsOptions } from './useAdaptiveExportActionsTypes';

export type UseAdaptiveBenchmarkExportCallbacksOptions = Pick<
  UseAdaptiveExportActionsOptions,
  | 'activeSession'
  | 'activeSessionFinished'
  | 'sessionStatus'
  | 'getActiveTypingLanguage'
  | 'setBenchmarkExportMessage'
  | 'setExportMessage'
>;

export function useAdaptiveBenchmarkExportCallbacks({
  activeSession,
  activeSessionFinished,
  sessionStatus,
  getActiveTypingLanguage,
  setBenchmarkExportMessage,
  setExportMessage,
}: UseAdaptiveBenchmarkExportCallbacksOptions) {
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
    downloadJsonFile(payload, buildBenchmarkFilename(profile.inputMode, String(profile.language), new Date()));
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

  return {
    getBenchmarkActiveSessionStatus,
    copySelectedBenchmarkJson,
    downloadSelectedBenchmarkJson,
    copyDictationScriptPrompt,
    copyBenchmarkWithDictationScriptPrompt,
    copyDictationScriptTemplate,
  };
}
