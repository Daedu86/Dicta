import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { InputMode } from '../core/adaptive/types';
import type { ActiveOpenRouterJob } from '../core/openRouterJobs';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import {
  shouldCreatePersistentGenerationErrorSession,
} from '../components/openrouter/openRouterViewHelpers';
import type {
  BenchmarkLanguageButton,
} from '../components/openrouter/types';
import {
  createGeneratedErrorSession,
  getNextSessionIndex,
} from './sessionFactory';
import {
  mapDictationScriptInputModeToSession,
} from './sessionRestoreGuards';
import type { StoredSession } from './sessionTypes';
import type { SessionQuotaMessageTarget } from './useSessionQuotaActions';

type CreateOpenRouterErrorSessionArgs = {
  slotLabel: string;
  inputMode: InputMode;
  language: BenchmarkLanguageButton;
  message: string;
};

type CreateOpenRouterErrorSessionOptions = {
  navigateToLeaderboard?: boolean;
};

type UseOpenRouterErrorSessionActionsArgs = {
  ensureCanCreateDictationSession: (messageTarget?: SessionQuotaMessageTarget) => boolean;
  suppressSidebarAutoSelectRef: MutableRefObject<boolean>;
  prependSessionAndPersistNow: (
    createNextSession: (previousSessions: StoredSession[]) => StoredSession,
  ) => StoredSession;
  setLeaderboardLanguageView: (language: BenchmarkLanguageButton) => void;
  setActiveSessionId: (sessionId: string) => void;
  showLeaderboardWorkspace: () => void;
  setError: (message: string) => void;
  setOpenRouterError: (message: string) => void;
};

export function useOpenRouterErrorSessionActions({
  ensureCanCreateDictationSession,
  suppressSidebarAutoSelectRef,
  prependSessionAndPersistNow,
  setLeaderboardLanguageView,
  setActiveSessionId,
  showLeaderboardWorkspace,
  setError,
  setOpenRouterError,
}: UseOpenRouterErrorSessionActionsArgs) {
  const createOpenRouterErrorSession = useCallback(({
    slotLabel,
    inputMode,
    language,
    message,
  }: CreateOpenRouterErrorSessionArgs, options: CreateOpenRouterErrorSessionOptions = {}): void => {
    if (!ensureCanCreateDictationSession('openrouter')) return;

    const navigateToLeaderboard = options.navigateToLeaderboard ?? true;
    const sessionInputMode = mapDictationScriptInputModeToSession(inputMode) ?? BROWSER_TTS_SESSION_INPUT_MODE;

    suppressSidebarAutoSelectRef.current = true;

    const nextSession = prependSessionAndPersistNow((prev) =>
      createGeneratedErrorSession({
        index: getNextSessionIndex(prev),
        inputMode: sessionInputMode,
        language,
        name: `${slotLabel} generation error`,
        message,
      }),
    );

    setLeaderboardLanguageView(language);

    if (navigateToLeaderboard) {
      setActiveSessionId(nextSession.id);
      showLeaderboardWorkspace();
    }

    setError('');
    setOpenRouterError(message);
  }, [
    ensureCanCreateDictationSession,
    prependSessionAndPersistNow,
    setActiveSessionId,
    setError,
    setLeaderboardLanguageView,
    setOpenRouterError,
    showLeaderboardWorkspace,
    suppressSidebarAutoSelectRef,
  ]);

  const createCustomOpenRouterErrorSessionForJob = useCallback((
    trackedJob: ActiveOpenRouterJob,
    message: string,
  ): void => {
    if (trackedJob.origin !== 'custom-workspace' || !shouldCreatePersistentGenerationErrorSession(message)) return;

    createOpenRouterErrorSession({
      slotLabel: trackedJob.slotLabel,
      inputMode: trackedJob.inputMode,
      language: trackedJob.language as BenchmarkLanguageButton,
      message,
    }, { navigateToLeaderboard: false });
  }, [createOpenRouterErrorSession]);

  return {
    createOpenRouterErrorSession,
    createCustomOpenRouterErrorSessionForJob,
  };
}
