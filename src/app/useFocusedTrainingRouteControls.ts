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
  punctuateTtsPracticeText,
  onTtsPracticeChange,
  submitTtsSession,
  setInputSettingsLocked,
  setError,
  setExportMessage,
  practiceChunkRuntime,
}: UseFocusedTrainingRouteRuntimeArgs) {
  const punctuateVisiblePracticeText = (latestTextValue?: string) => punctuateTtsPracticeText(
    latestTextValue !== undefined && practiceChunkRuntime?.enabled
      ? practiceChunkRuntime.transformImmediateDraft(latestTextValue)
      : latestTextValue,
  );
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
      punctuateTtsPracticeText: punctuateVisiblePracticeText,
      onTtsPracticeChange,
      submitTtsSession,
      setInputSettingsLocked,
      setError,
      setExportMessage,
      collapseSetupPanels: () => undefined,
    },
  }).focusedTrainingControls;
}
