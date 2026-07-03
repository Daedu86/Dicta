import { useFocusedTrainingViewProps } from './useFocusedTrainingViewProps';
import type { useFocusedTrainingInputTelemetryRuntime } from './useFocusedTrainingInputTelemetryRuntime';
import type { useFocusedTrainingRouteControls } from './useFocusedTrainingRouteControls';
import type { useFocusedTrainingRouteGenerationButtons } from './useFocusedTrainingRouteGenerationButtons';
import type { useFocusedTrainingRoutePresentationState } from './useFocusedTrainingRoutePresentationState';
import type { UseFocusedTrainingRouteRuntimeArgs } from './useFocusedTrainingRouteRuntimeTypes';

interface UseFocusedTrainingRouteViewPropsArgs {
  args: UseFocusedTrainingRouteRuntimeArgs;
  focusedTrainingControls: ReturnType<typeof useFocusedTrainingRouteControls>;
  focusedImmediateInputHandler: ReturnType<typeof useFocusedTrainingInputTelemetryRuntime>;
  focusedTrainingGenerationButtons: ReturnType<typeof useFocusedTrainingRouteGenerationButtons>;
  focusedTrainingPresentationState: ReturnType<typeof useFocusedTrainingRoutePresentationState>;
  replayFocusedTts: () => void;
}

export function useFocusedTrainingRouteViewProps({
  args,
  focusedTrainingControls,
  focusedImmediateInputHandler,
  focusedTrainingGenerationButtons,
  focusedTrainingPresentationState,
  replayFocusedTts,
}: UseFocusedTrainingRouteViewPropsArgs) {
  const practiceChunkRuntime = args.practiceChunkRuntime;
  const practiceChunksEnabled = practiceChunkRuntime?.enabled ?? false;
  return useFocusedTrainingViewProps({
    activeSession: args.activeSession,
    submissionMeta: args.activeTrainingSubmissionMeta,
    activeInputLabel: args.activeInputLabel,
    sessionStatus: args.sessionStatus,
    sourceLabel: focusedTrainingPresentationState.focusedSourceLabel,
    progressLabel: focusedTrainingPresentationState.focusedProgressLabel,
    statusLabel: args.ttsStatus,
    currentTextValue: practiceChunksEnabled && practiceChunkRuntime
      ? practiceChunkRuntime.activeDraft
      : focusedTrainingPresentationState.focusedTextValue,
    onTextChange: args.onTtsPracticeChange,
    onImmediateTextChange: (value) => focusedImmediateInputHandler(
      practiceChunksEnabled && practiceChunkRuntime
        ? practiceChunkRuntime.transformImmediateDraft(value)
        : value,
    ),
    onTextBlur: focusedTrainingControls.onTextBlur,
    onTextKeyDown: args.onTtsPracticeKeyDown,
    textPlaceholder: focusedTrainingPresentationState.focusedTextPlaceholder,
    activeVisibleScore: args.activeVisibleScore,
    liveScoreHelpText: args.activeLiveScoreHelpText,
    livePointsLabel: args.activeLivePointsLabel,
    livePointsHelpText: args.activeLivePointsHelpText,
    activeVisibleAccuracy: args.activeVisibleAccuracy,
    liveAccuracyHelpText: args.activeLiveAccuracyHelpText,
    lagSec: args.lagSec,
    activeSessionFinished: args.activeSessionFinished,
    focusedTrainingControls,
    ttsHasText: args.ttsHasText,
    ttsPlayerDurationSec: focusedTrainingPresentationState.ttsPlayerDurationSec,
    onReplayFocusedTts: replayFocusedTts,
    message: focusedTrainingPresentationState.focusedTrainingMessage,
    messageTone: focusedTrainingPresentationState.focusedTrainingMessageTone,
    pendingSessions: args.pendingSessions,
    activeSessionId: args.activeSessionId,
    onOpenPendingSession: args.openWorkspaceForSession,
    onDeletePendingSession: args.deleteSession,
    syncStatus: args.supabaseSyncStatus,
    pendingSyncSummary: args.pendingSyncSummary,
    isOnline: args.isOnline,
    generationButtons: focusedTrainingGenerationButtons,
    completedPracticeChunks: practiceChunkRuntime?.completedChunks ?? [],
    activePracticeChunk: practiceChunksEnabled && practiceChunkRuntime ? practiceChunkRuntime.activeChunk : null,
    practiceChunkActionQueued: practiceChunkRuntime?.actionQueued ?? false,
    practiceChunkAdvanceCountdownSeconds: practiceChunkRuntime?.advanceCountdownSeconds ?? null,
    activePracticeChunkAudioCompleted: practiceChunkRuntime?.activeChunkAudioCompleted ?? false,
    onReplayPracticeChunk: args.playTtsFromWord,
    onSubmitPracticeChunk: practiceChunkRuntime?.requestCurrentChunkAdvance,
  });
}
