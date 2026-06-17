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
import type {
  OpenRouterScriptCreationOptions,
  UseSessionCreationActionsOptions,
} from './sessionCreationActionsTypes';

type ResetSessionCreationForm = () => void;

type CreateSessionFromModeOptions = Pick<
  UseSessionCreationActionsOptions,
  | 'sessionCreationName'
  | 'suppressSidebarAutoSelectRef'
  | 'ensureCanCreateDictationSession'
  | 'prependSessionAndPersistNow'
  | 'showSessionInputWorkspace'
  | 'setActiveSessionId'
  | 'setError'
> & {
  resetSessionCreationForm: ResetSessionCreationForm;
};

type CreateSessionFromDictationScriptOptions = Pick<
  UseSessionCreationActionsOptions,
  | 'dictationScriptJson'
  | 'dictationScriptValidation'
  | 'browserTtsVoices'
  | 'suppressSidebarAutoSelectRef'
  | 'ensureCanCreateDictationSession'
  | 'prependSessionAndPersistNow'
  | 'showSessionInputWorkspace'
  | 'setActiveSessionId'
  | 'setDictationScriptValidation'
  | 'setError'
  | 'setExportMessage'
> & {
  resetSessionCreationForm: ResetSessionCreationForm;
};

type CreateSessionFromOpenRouterScriptOptions = Pick<
  UseSessionCreationActionsOptions,
  | 'browserTtsVoices'
  | 'suppressSidebarAutoSelectRef'
  | 'ensureCanCreateDictationSession'
  | 'prependSessionAndPersistNow'
  | 'showLeaderboardWorkspace'
  | 'setActiveSessionId'
  | 'setLeaderboardLanguageView'
  | 'setOpenRouterError'
  | 'setError'
  | 'setExportMessage'
> & {
  resetSessionCreationForm: ResetSessionCreationForm;
};

export function createSessionFromModeAction(
  inputMode: SessionInputMode,
  options: CreateSessionFromModeOptions,
): void {
  if (!options.ensureCanCreateDictationSession('error')) return;

  const name = options.sessionCreationName.trim();
  if (!name) {
    options.setError('Enter a session name before creating the session.');
    return;
  }

  options.suppressSidebarAutoSelectRef.current = true;
  const nextSession = options.prependSessionAndPersistNow((prev) =>
    createStoredSession(
      getNextSessionIndex(prev),
      inputMode,
      name,
    ),
  );
  options.setActiveSessionId(nextSession.id);
  options.showSessionInputWorkspace(inputMode);
  options.resetSessionCreationForm();
}

export function createSessionFromDictationScriptAction(
  options: CreateSessionFromDictationScriptOptions,
): void {
  if (!options.ensureCanCreateDictationSession('error')) return;

  const result = options.dictationScriptValidation?.ok
    ? options.dictationScriptValidation
    : parseDictationScriptJson(options.dictationScriptJson);
  options.setDictationScriptValidation(result);
  if (!result.ok) return;

  const inputMode = mapDictationScriptInputModeToSession(result.script.inputMode);
  if (!inputMode) {
    options.setDictationScriptValidation({
      ok: false,
      script: null,
      errors: ['inputMode must be browser-tts.'],
    });
    return;
  }

  options.suppressSidebarAutoSelectRef.current = true;
  const nextSession = options.prependSessionAndPersistNow((prev) =>
    createSessionFromScript(result.script, getNextSessionIndex(prev), inputMode, {
      browserTtsVoices: options.browserTtsVoices,
    }),
  );
  options.setActiveSessionId(nextSession.id);
  options.showSessionInputWorkspace(inputMode);
  options.resetSessionCreationForm();
  options.setError('');
  options.setExportMessage('DictationScript session created and locked.');
}

export function createSessionFromOpenRouterScriptAction(
  script: DictationScript,
  creationOptions: OpenRouterScriptCreationOptions,
  options: CreateSessionFromOpenRouterScriptOptions,
): void {
  if (!options.ensureCanCreateDictationSession('openrouter')) return;

  const navigateToLeaderboard = creationOptions.navigateToLeaderboard ?? true;
  const generationOrigin = creationOptions.generationOrigin ?? 'openrouter';
  const inputMode = mapDictationScriptInputModeToSession(script.inputMode);
  if (!inputMode) {
    options.setOpenRouterError('Generated script inputMode must be browser-tts.');
    return;
  }

  options.suppressSidebarAutoSelectRef.current = true;
  const nextSession = options.prependSessionAndPersistNow((prev) => ({
    ...createSessionFromScript(script, getNextSessionIndex(prev), inputMode, {
      browserTtsVoices: options.browserTtsVoices,
    }),
    generationOrigin,
  }));
  options.setLeaderboardLanguageView(scriptLanguageToTtsLanguage(script.language));
  if (navigateToLeaderboard) {
    options.setActiveSessionId(nextSession.id);
    options.showLeaderboardWorkspace();
  }
  options.resetSessionCreationForm();
  options.setError('');
  options.setOpenRouterError('');
  options.setExportMessage('OpenRouter DictationScript session created and locked.');
}
