import { useMemo } from 'react';
import { createTtsSessionSubmitAction } from './ttsSessionSubmitActionRunner';
import type {
  TtsSessionSubmitAction,
  TtsSessionSubmitActionOptions,
} from './ttsSessionSubmitActionTypes';

export { createTtsSessionSubmitAction } from './ttsSessionSubmitActionRunner';
export type {
  StateSetter,
  TtsSessionSubmitAction,
  TtsSessionSubmitActionOptions,
  TtsSessionSubmitVoiceResolution,
  TtsSubmitPerfSpanStarter,
} from './ttsSessionSubmitActionTypes';

export function useTtsSessionSubmitAction(options: TtsSessionSubmitActionOptions): TtsSessionSubmitAction {
  return useMemo(
    () => createTtsSessionSubmitAction(options),
    [
      options.activeInputMode,
      options.activeSession,
      options.activeSessionId,
      options.applyTtsPerformanceSample,
      options.collectBrowserTtsEnvironmentForSession,
      options.completeAdaptiveSessionFeedback,
      options.nowIso,
      options.persistAndPushSessionsNow,
      options.resolveBrowserTtsVoiceForSession,
      options.sessions,
      options.setError,
      options.setRunning,
      options.setSessionStatus,
      options.setSessions,
      options.setTrainingSubmitMessage,
      options.setTtsPracticeText,
      options.setTtsStatus,
      options.startPerfSpan,
      options.stopTtsPlayback,
      options.ttsHasText,
      options.ttsLanguage,
      options.ttsPracticeText,
    ],
  );
}
