import type {
  KeyboardArgs,
  UseTtsSessionOrchestrationRuntimeArgs,
} from '../ttsSessionOrchestrationDelegateTypes';

export function buildTtsSessionKeyboardRemapArgs(
  args: UseTtsSessionOrchestrationRuntimeArgs,
): KeyboardArgs {
  return {
    activeInputMode: args.activeInputMode,
    inputSettingsLocked: args.inputSettingsLocked,
    ttsLanguage: args.ttsLanguage,
  };
}
