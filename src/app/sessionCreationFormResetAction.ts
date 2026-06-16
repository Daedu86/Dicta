import type { SessionCreationFormResetActionOptions } from './sessionCreationActionsTypes';

export function createSessionCreationFormResetAction({
  setSessionCreationMode,
  setSessionCreationSource,
  setSessionCreationName,
  setDictationScriptJson,
  setDictationScriptValidation,
}: SessionCreationFormResetActionOptions) {
  return (): void => {
    setSessionCreationMode(null);
    setSessionCreationSource('plainText');
    setSessionCreationName('');
    setDictationScriptJson('');
    setDictationScriptValidation(null);
  };
}
