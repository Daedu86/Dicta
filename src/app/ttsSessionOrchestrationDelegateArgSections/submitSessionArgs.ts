import type {
  SubmitSessionDelegateArgs,
  UseTtsSessionOrchestrationRuntimeArgs,
} from '../ttsSessionOrchestrationDelegateTypes';

export function buildTtsSessionSubmitSessionArgs(
  args: UseTtsSessionOrchestrationRuntimeArgs,
): SubmitSessionDelegateArgs {
  return {
    activeInputMode: args.activeInputMode,
    ttsHasText: args.ttsHasText,
    ttsPracticeText: args.ttsPracticeText,
    ttsLanguage: args.ttsLanguage,
    sessions: args.sessions,
    activeSessionId: args.activeSessionId,
    activeSession: args.activeSession,
    resolveBrowserTtsVoiceForSession: args.resolveBrowserTtsVoiceForSession,
    collectBrowserTtsEnvironmentForSession: args.collectBrowserTtsEnvironmentForSession,
    persistAndPushSessionsNow: args.persistAndPushSessionsNow,
    completeAdaptiveSessionFeedback: args.completeAdaptiveSessionFeedback,
    setTtsPracticeText: args.setTtsPracticeText,
    setSessions: args.setSessions,
    setRunning: args.setRunning,
    setSessionStatus: args.setSessionStatus,
    setTtsStatus: args.setTtsStatus,
    setError: args.setError,
    setTrainingSubmitMessage: args.setTrainingSubmitMessage,
  };
}
