import { useActiveSessionDerivedRuntime } from './useActiveSessionDerivedRuntime';
import { useBrowserTtsSessionEnvironmentRuntime } from './useBrowserTtsSessionEnvironmentRuntime';
import { useTtsRuntimeRefs } from './useTtsRuntimeRefs';

type UseTtsSessionRuntimeOptions =
  Parameters<typeof useActiveSessionDerivedRuntime>[0] &
  Parameters<typeof useTtsRuntimeRefs>[0] &
  Omit<Parameters<typeof useBrowserTtsSessionEnvironmentRuntime>[0], 'activeSession'>;

export function useTtsSessionRuntime(options: UseTtsSessionRuntimeOptions) {
  const ttsRuntimeRefs = useTtsRuntimeRefs({
    ttsPracticeText: options.ttsPracticeText,
  });

  const activeSessionRuntime = useActiveSessionDerivedRuntime({
    sessions: options.sessions,
    activeSessionId: options.activeSessionId,
    dashboardSessionId: options.dashboardSessionId,
    difficulty: options.difficulty,
    sessionStatus: options.sessionStatus,
  });

  const browserTtsSessionEnvironment = useBrowserTtsSessionEnvironmentRuntime({
    activeSession: activeSessionRuntime.activeSession,
    browserTtsVoices: options.browserTtsVoices,
    setSessions: options.setSessions,
    ttsLanguage: options.ttsLanguage,
  });

  return {
    ...ttsRuntimeRefs,
    ...activeSessionRuntime,
    ...browserTtsSessionEnvironment,
  };
}
