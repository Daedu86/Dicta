import { useCallback } from 'react';
import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics } from '../core/adaptive/types';
import {
  buildAdaptiveBenchmarkFeedbackExportPayload,
  buildAdaptiveBenchmarkFeedbackPromptExportText,
  buildAdaptiveBenchmarkFeedbackPromptWithHumanFeedbackPayload,
  buildAdaptiveSessionFeedbackExportPayload,
} from './adaptiveExportPackages';
import type { UseAdaptiveExportActionsOptions } from './useAdaptiveExportActionsTypes';

export type UseAdaptiveFeedbackExportCallbacksOptions = Pick<
  UseAdaptiveExportActionsOptions,
  'sessions' | 'setSessionFeedbackMessage'
> & {
  getBenchmarkActiveSessionStatus: (profile: InputLanguageBenchmarkMetrics) => string | undefined;
};

export function useAdaptiveFeedbackExportCallbacks({
  sessions,
  setSessionFeedbackMessage,
  getBenchmarkActiveSessionStatus,
}: UseAdaptiveFeedbackExportCallbacksOptions) {
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
    copySessionFeedbackJson,
    copyBenchmarkFeedbackJson,
    copyBenchmarkFeedbackPrompt,
    copyBenchmarkFeedbackPromptWithHumanFeedback,
  };
}
