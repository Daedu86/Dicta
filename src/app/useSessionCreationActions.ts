import { useCallback, useMemo } from 'react';
import {
  parseDictationScriptJson,
  type DictationScript,
} from '../core/adaptive/dictationScriptValidation';
import type { SessionInputMode } from '../core/sessionInputModes';
import { createSessionCreationFormResetAction } from './sessionCreationFormResetAction';
import {
  createSessionFromDictationScriptAction,
  createSessionFromModeAction,
  createSessionFromOpenRouterScriptAction,
} from './sessionCreationActionRunners';
import type {
  OpenRouterScriptCreationOptions,
  UseSessionCreationActionsOptions,
} from './sessionCreationActionsTypes';

export { createSessionCreationFormResetAction } from './sessionCreationFormResetAction';
export type {
  OpenRouterScriptCreationOptions,
  SessionCreationFormResetActionOptions,
  SessionCreationMessageTarget,
  UseSessionCreationActionsOptions,
} from './sessionCreationActionsTypes';

export function useSessionCreationActions({
  sessionCreationName,
  dictationScriptJson,
  dictationScriptValidation,
  browserTtsVoices,
  suppressSidebarAutoSelectRef,
  ensureCanCreateDictationSession,
  prependSessionAndPersistNow,
  showSessionInputWorkspace,
  showLeaderboardWorkspace,
  setActiveSessionId,
  setLeaderboardLanguageView,
  setSessionCreationMode,
  setSessionCreationSource,
  setSessionCreationName,
  setDictationScriptJson,
  setDictationScriptValidation,
  setError,
  setOpenRouterError,
  setExportMessage,
}: UseSessionCreationActionsOptions) {
  const resetSessionCreationForm = useMemo(() => createSessionCreationFormResetAction({
    setDictationScriptJson,
    setDictationScriptValidation,
    setSessionCreationMode,
    setSessionCreationName,
    setSessionCreationSource,
  }), [
    setDictationScriptJson,
    setDictationScriptValidation,
    setSessionCreationMode,
    setSessionCreationName,
    setSessionCreationSource,
  ]);

  const createSessionWithMode = useCallback((inputMode: SessionInputMode): void => {
    createSessionFromModeAction(inputMode, {
      sessionCreationName,
      suppressSidebarAutoSelectRef,
      ensureCanCreateDictationSession,
      prependSessionAndPersistNow,
      showSessionInputWorkspace,
      setActiveSessionId,
      setError,
      resetSessionCreationForm,
    });
  }, [
    ensureCanCreateDictationSession,
    prependSessionAndPersistNow,
    resetSessionCreationForm,
    sessionCreationName,
    setActiveSessionId,
    setError,
    showSessionInputWorkspace,
    suppressSidebarAutoSelectRef,
  ]);

  const validateScriptImport = useCallback((): void => {
    setDictationScriptValidation(parseDictationScriptJson(dictationScriptJson));
  }, [dictationScriptJson, setDictationScriptValidation]);

  const createSessionFromDictationScript = useCallback((): void => {
    createSessionFromDictationScriptAction({
      dictationScriptJson,
      dictationScriptValidation,
      browserTtsVoices,
      suppressSidebarAutoSelectRef,
      ensureCanCreateDictationSession,
      prependSessionAndPersistNow,
      showSessionInputWorkspace,
      setActiveSessionId,
      setDictationScriptValidation,
      setError,
      setExportMessage,
      resetSessionCreationForm,
    });
  }, [
    browserTtsVoices,
    dictationScriptJson,
    dictationScriptValidation,
    ensureCanCreateDictationSession,
    prependSessionAndPersistNow,
    resetSessionCreationForm,
    setActiveSessionId,
    setDictationScriptValidation,
    setError,
    setExportMessage,
    showSessionInputWorkspace,
    suppressSidebarAutoSelectRef,
  ]);

  const createSessionFromOpenRouterScript = useCallback((
    script: DictationScript,
    options: OpenRouterScriptCreationOptions = {},
  ): void => {
    createSessionFromOpenRouterScriptAction(script, options, {
      browserTtsVoices,
      suppressSidebarAutoSelectRef,
      ensureCanCreateDictationSession,
      prependSessionAndPersistNow,
      showLeaderboardWorkspace,
      setActiveSessionId,
      setLeaderboardLanguageView,
      setOpenRouterError,
      setError,
      setExportMessage,
      resetSessionCreationForm,
    });
  }, [
    browserTtsVoices,
    ensureCanCreateDictationSession,
    prependSessionAndPersistNow,
    resetSessionCreationForm,
    setActiveSessionId,
    setError,
    setExportMessage,
    setLeaderboardLanguageView,
    setOpenRouterError,
    showLeaderboardWorkspace,
    suppressSidebarAutoSelectRef,
  ]);

  return {
    createSessionWithMode,
    validateScriptImport,
    createSessionFromDictationScript,
    createSessionFromOpenRouterScript,
  };
}
