import { useSessionCreationActions } from './useSessionCreationActions';
import { useSessionCreationWorkspaceState } from './useSessionCreationWorkspaceState';

type SessionCreationActionsOptions = Parameters<typeof useSessionCreationActions>[0];

type UseSessionCreationRuntimeOptions = Omit<
  SessionCreationActionsOptions,
  | 'sessionCreationName'
  | 'dictationScriptJson'
  | 'dictationScriptValidation'
  | 'setSessionCreationMode'
  | 'setSessionCreationSource'
  | 'setSessionCreationName'
  | 'setDictationScriptJson'
  | 'setDictationScriptValidation'
>;

export function useSessionCreationRuntime(options: UseSessionCreationRuntimeOptions) {
  const workspaceState = useSessionCreationWorkspaceState();

  const sessionCreationActions = useSessionCreationActions({
    ...options,
    sessionCreationName: workspaceState.sessionCreationName,
    dictationScriptJson: workspaceState.dictationScriptJson,
    dictationScriptValidation: workspaceState.dictationScriptValidation,
    setSessionCreationMode: workspaceState.setSessionCreationMode,
    setSessionCreationSource: workspaceState.setSessionCreationSource,
    setSessionCreationName: workspaceState.setSessionCreationName,
    setDictationScriptJson: workspaceState.setDictationScriptJson,
    setDictationScriptValidation: workspaceState.setDictationScriptValidation,
  });

  return {
    ...workspaceState,
    ...sessionCreationActions,
  };
}
