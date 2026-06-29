import type {
  PracticeInputDelegateArgs,
  UseTtsSessionOrchestrationRuntimeArgs,
} from '../ttsSessionOrchestrationDelegateTypes';

export function buildTtsSessionPracticeInputArgs(
  args: UseTtsSessionOrchestrationRuntimeArgs,
): PracticeInputDelegateArgs {
  return {
    activeSessionFinished: args.activeSessionFinished,
    telemetryRef: args.telemetryRef,
    ttsStartedAtMsRef: args.ttsStartedAtMsRef,
    ttsPracticeLiveTextRef: args.ttsPracticeLiveTextRef,
    setTtsPracticeText: args.setTtsPracticeText,
    transformPracticeText: args.transformPracticeText,
  };
}
