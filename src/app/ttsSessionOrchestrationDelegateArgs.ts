import {
  buildTtsSessionBrowserPlaybackArgs,
  buildTtsSessionKeyboardRemapArgs,
  buildTtsSessionPlaybackControlsArgs,
  buildTtsSessionPlaybackMetricsArgs,
  buildTtsSessionPracticeInputArgs,
  buildTtsSessionResetSessionArgs,
  buildTtsSessionSubmitSessionArgs,
} from './ttsSessionOrchestrationDelegateArgSections';
import type {
  BuildSemanticPhrasesForCurrentSession,
  TtsSessionOrchestrationDelegateArgs,
  UseTtsSessionOrchestrationRuntimeArgs,
} from './ttsSessionOrchestrationDelegateTypes';

export type {
  TtsSessionOrchestrationDelegateArgs,
  UseTtsSessionOrchestrationRuntimeArgs,
} from './ttsSessionOrchestrationDelegateTypes';

export function buildTtsSessionOrchestrationDelegateArgs(
  args: UseTtsSessionOrchestrationRuntimeArgs,
  buildSemanticPhrasesForCurrentSession: BuildSemanticPhrasesForCurrentSession,
): TtsSessionOrchestrationDelegateArgs {
  return {
    keyboardRemap: buildTtsSessionKeyboardRemapArgs(args),
    practiceInput: buildTtsSessionPracticeInputArgs(args),
    playbackMetrics: buildTtsSessionPlaybackMetricsArgs(args),
    browserPlayback: buildTtsSessionBrowserPlaybackArgs(
      args,
      buildSemanticPhrasesForCurrentSession,
    ),
    playbackControls: buildTtsSessionPlaybackControlsArgs(args),
    resetSession: buildTtsSessionResetSessionArgs(args),
    submitSession: buildTtsSessionSubmitSessionArgs(args),
  };
}
