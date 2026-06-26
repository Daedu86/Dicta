import { useFocusedTrainingRuntime } from './useFocusedTrainingRuntime';
import { useTtsSessionRuntime } from './useTtsSessionRuntime';

type FocusedTrainingRuntimeOptions = Parameters<typeof useFocusedTrainingRuntime>[0];
type TtsSessionRuntime = ReturnType<typeof useTtsSessionRuntime>;

type TtsInjectedFocusedTrainingKeys =
  | 'activeInputMode'
  | 'activeInputLabel'
  | 'activeSession'
  | 'activeSessionFinished'
  | 'config'
  | 'applyTtsPerformanceSampleRef'
  | 'ttsPracticeLiveTextRef'
  | 'ttsPracticeLastInputAtMsRef'
  | 'ttsUiLastPublishedAtRef'
  | 'ttsPublishedUiRef'
  | 'telemetryRef'
  | 'previousLagRef'
  | 'previousAccuracyRef'
  | 'ttsStartedAtMsRef'
  | 'ttsChunkStartMsRef'
  | 'ttsChunkStartWordIndexRef'
  | 'ttsChunkWordCountRef'
  | 'ttsCompletedSourceWordsRef'
  | 'ttsLagOutlierCountRef'
  | 'ttsLastControllerActionRef'
  | 'ttsPlaybackProfile'
  | 'stopTtsPlaybackRef'
  | 'ttsPausedAtWordIndexRef'
  | 'ttsLastValidControlLagSecRef'
  | 'ttsLiveSignalRef'
  | 'ttsUnsafeChunkCountRef'
  | 'ttsChunkAccuracyWindowRef'
  | 'ttsLastAccuracySnapshotRef'
  | 'ttsUtteranceRef'
  | 'ttsSemanticPhraseAdvanceCountRef'
  | 'ttsSemanticPhraseReplayCountRef'
  | 'resolveActiveBrowserTtsVoice'
  | 'collectBrowserTtsEnvironmentForSession'
  | 'resolveBrowserTtsVoiceForSession';

type UseDictaFocusedTrainingRuntimeOptions = Omit<FocusedTrainingRuntimeOptions, TtsInjectedFocusedTrainingKeys> & {
  ttsSessionRuntime: TtsSessionRuntime;
};

export function useDictaFocusedTrainingRuntime({
  ttsSessionRuntime,
  ...focusedTrainingOptions
}: UseDictaFocusedTrainingRuntimeOptions) {
  const {
    previousLagRef,
    previousAccuracyRef,
    ttsPracticeLiveTextRef,
    ttsPracticeLastInputAtMsRef,
    ttsUtteranceRef,
    telemetryRef,
    ttsStartedAtMsRef,
    ttsChunkStartMsRef,
    ttsChunkStartWordIndexRef,
    ttsChunkWordCountRef,
    ttsCompletedSourceWordsRef,
    ttsPausedAtWordIndexRef,
    ttsLagOutlierCountRef,
    ttsLastValidControlLagSecRef,
    ttsUnsafeChunkCountRef,
    ttsChunkAccuracyWindowRef,
    ttsLastAccuracySnapshotRef,
    ttsLastControllerActionRef,
    applyTtsPerformanceSampleRef,
    stopTtsPlaybackRef,
    ttsSemanticPhraseAdvanceCountRef,
    ttsSemanticPhraseReplayCountRef,
    ttsLiveSignalRef,
    ttsUiLastPublishedAtRef,
    ttsPublishedUiRef,
    config,
    activeSession,
    activeInputMode,
    activeInputLabel,
    activeSessionFinished,
    ttsPlaybackProfile,
    collectBrowserTtsEnvironmentForSession,
    resolveBrowserTtsVoiceForSession,
    resolveActiveBrowserTtsVoice,
  } = ttsSessionRuntime;

  return useFocusedTrainingRuntime({
    ...focusedTrainingOptions,
    activeInputMode,
    activeInputLabel,
    activeSession,
    activeSessionFinished,
    config,
    applyTtsPerformanceSampleRef,
    ttsPracticeLiveTextRef,
    ttsPracticeLastInputAtMsRef,
    ttsUiLastPublishedAtRef,
    ttsPublishedUiRef,
    telemetryRef,
    previousLagRef,
    previousAccuracyRef,
    ttsStartedAtMsRef,
    ttsChunkStartMsRef,
    ttsChunkStartWordIndexRef,
    ttsChunkWordCountRef,
    ttsCompletedSourceWordsRef,
    ttsLagOutlierCountRef,
    ttsLastControllerActionRef,
    ttsPlaybackProfile,
    stopTtsPlaybackRef,
    ttsPausedAtWordIndexRef,
    ttsLastValidControlLagSecRef,
    ttsLiveSignalRef,
    ttsUnsafeChunkCountRef,
    ttsChunkAccuracyWindowRef,
    ttsLastAccuracySnapshotRef,
    ttsUtteranceRef,
    ttsSemanticPhraseAdvanceCountRef,
    ttsSemanticPhraseReplayCountRef,
    resolveActiveBrowserTtsVoice,
    collectBrowserTtsEnvironmentForSession,
    resolveBrowserTtsVoiceForSession,
  });
}
