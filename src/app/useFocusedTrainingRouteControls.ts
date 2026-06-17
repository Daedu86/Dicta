import { useTrainingSessionLifecycle } from './useTrainingSessionLifecycle';
import type { UseFocusedTrainingRouteRuntimeArgs } from './useFocusedTrainingRouteRuntimeTypes';

export function useFocusedTrainingRouteControls({
  activeInputMode,
  activeSession,
  activeSessionFinished,
  sessionStatus,
  running,
  ttsHasText,
  ttsStatus,
  inputSettingsLocked,
  ttsPracticeText,
  resetSession,
  playTts,
  resumeTts,
  pauseTts,
  stopTtsPlayback,
  onTtsPracticeChange,
  submitTtsSession,
  setInputSettingsLocked,
  setError,
  setExportMessage,
}: UseFocusedTrainingRouteRuntimeArgs) {
  return useTrainingSessionLifecycle({
    state: {
      activeInputMode,
      activeSessionPresent: Boolean(activeSession),
      activeSessionFinished,
      sessionStatus,
      running,
      ttsHasText,
      ttsStatus,
      inputSettingsLocked,
    },
    text: {
      ttsPracticeText,
    },
    actions: {
      resetSession,
      playTts,
      resumeTts,
      pauseTts,
      stopTts: stopTtsPlayback,
      onTtsPracticeChange,
      submitTtsSession,
      setInputSettingsLocked,
      setError,
      setExportMessage,
      collapseSetupPanels: () => undefined,
    },
  }).focusedTrainingControls;
}
