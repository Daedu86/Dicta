import type {
  ResetSessionDelegateArgs,
  UseTtsSessionOrchestrationRuntimeArgs,
} from '../ttsSessionOrchestrationDelegateTypes';

export function buildTtsSessionResetSessionArgs(
  args: UseTtsSessionOrchestrationRuntimeArgs,
): ResetSessionDelegateArgs {
  return {
    activeSession: args.activeSession,
    activeInputMode: args.activeInputMode,
    inputSettingsLocked: args.inputSettingsLocked,
    ttsText: args.ttsText,
    resetAdaptiveSessionFeedbackTracking: args.resetAdaptiveSessionFeedbackTracking,
    allowFinishedSessionResetRef: args.allowFinishedSessionResetRef,
    ttsPracticeLiveTextRef: args.ttsPracticeLiveTextRef,
    ttsStartedAtMsRef: args.ttsStartedAtMsRef,
    ttsChunkStartMsRef: args.ttsChunkStartMsRef,
    ttsChunkStartWordIndexRef: args.ttsChunkStartWordIndexRef,
    ttsChunkWordCountRef: args.ttsChunkWordCountRef,
    ttsCompletedSourceWordsRef: args.ttsCompletedSourceWordsRef,
    ttsLastControllerActionRef: args.ttsLastControllerActionRef,
    ttsUiLastPublishedAtRef: args.ttsUiLastPublishedAtRef,
    ttsPublishedUiRef: args.ttsPublishedUiRef,
    telemetryRef: args.telemetryRef,
    setTtsPracticeText: args.setTtsPracticeText,
    setTtsStatus: args.setTtsStatus,
    setTtsCurrentChunk: args.setTtsCurrentChunk,
    setTtsPacingMode: args.setTtsPacingMode,
    setTtsSpeechRate: args.setTtsSpeechRate,
    setRunning: args.setRunning,
    setRate: args.setRate,
    setLagSec: args.setLagSec,
    setLagWords: args.setLagWords,
    setWpm: args.setWpm,
    setAccuracy: args.setAccuracy,
    setControllerState: args.setControllerState,
    setSessionStatus: args.setSessionStatus,
    setTrainingSubmitMessage: args.setTrainingSubmitMessage,
    setInputSettingsLocked: args.setInputSettingsLocked,
  };
}
