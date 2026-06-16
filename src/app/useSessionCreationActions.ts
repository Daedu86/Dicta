import { useCallback, useMemo } from 'react';
import {
  parseDictationScriptJson,
  type DictationScript,
} from '../core/adaptive/dictationScriptValidation';
import type { SessionInputMode } from '../core/sessionInputModes';
import { createStoredSession, getNextSessionIndex } from './sessionFactory';
import { createSessionFromScript } from './sessionFromDictationScript';
import {
  mapDictationScriptInputModeToSession,
  scriptLanguageToTtsLanguage,
} from './sessionRestoreGuards';
import { createSessionCreationFormResetAction } from './sessionCreationFormResetAction';
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
    if (!ensureCanCreateDictationSession('error')) return;
    const name = sessionCreationName.trim();
    if (!name) {
      setError('Enter a session name before creating the session.');
      return;
    }
    suppressSidebarAutoSelectRef.current = true;
    const nextSession = prependSessionAndPersistNow((prev) =>
      createStoredSession(
        getNextSessionIndex(prev),
        inputMode,
        name,
      ),
    );
    setActiveSessionId(nextSession.id);
    showSessionInputWorkspace(inputMode);
    resetSessionCreationForm();
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
    if (!ensureCanCreateDictationSession('error')) return;
    const result = dictationScriptValidation?.ok ? dictationScriptValidation : parseDictationScriptJson(dictationScriptJson);
    setDictationScriptValidation(result);
    if (!result.ok) {
      return;
    }

    const inputMode = mapDictationScriptInputModeToSession(result.script.inputMode);
    if (!inputMode) {
      setDictationScriptValidation({
        ok: false,
        script: null,
        errors: ['inputMode must be browser-tts.'],
      });
      return;
    }

    suppressSidebarAutoSelectRef.current = true;
    const nextSession = prependSessionAndPersistNow((prev) =>
      createSessionFromScript(result.script, getNextSessionIndex(prev), inputMode, { browserTtsVoices }),
    );
    setActiveSessionId(nextSession.id);
    showSessionInputWorkspace(inputMode);
    resetSessionCreationForm();
    setError('');
    setExportMessage('DictationScript session created and locked.');
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
    if (!ensureCanCreateDictationSession('openrouter')) return;
    const navigateToLeaderboard = options.navigateToLeaderboard ?? true;
    const generationOrigin = options.generationOrigin ?? 'openrouter';
    const inputMode = mapDictationScriptInputModeToSession(script.inputMode);
    if (!inputMode) {
      setOpenRouterError('Generated script inputMode must be browser-tts.');
      return;
    }

    suppressSidebarAutoSelectRef.current = true;
    const nextSession = prependSessionAndPersistNow((prev) => ({
      ...createSessionFromScript(script, getNextSessionIndex(prev), inputMode, { browserTtsVoices }),
      generationOrigin,
    }));
    setLeaderboardLanguageView(scriptLanguageToTtsLanguage(script.language));
    if (navigateToLeaderboard) {
      setActiveSessionId(nextSession.id);
      showLeaderboardWorkspace();
    }
    resetSessionCreationForm();
    setError('');
    setOpenRouterError('');
    setExportMessage('OpenRouter DictationScript session created and locked.');
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
