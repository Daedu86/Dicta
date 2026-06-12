import { useCallback, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import type {
  BrowserTtsEnvironmentMatchMedia,
  BrowserTtsEnvironmentNavigatorLike,
} from '../inputs/browserTts/browserTtsEnvironment';
import type { StoredSession, TtsLanguage } from './sessionTypes';
import {
  assignMissingBrowserTtsVoiceEnvironments,
  attachBrowserTtsEnvironment as attachBrowserTtsEnvironmentForSession,
  collectBrowserTtsEnvironmentForSession as collectBrowserTtsEnvironmentForSessionValue,
  resolveBrowserTtsVoiceForSession as resolveBrowserTtsVoiceForSessionValue,
  resolveBrowserTtsVoiceSessionUpdate,
} from './browserTtsSessionEnvironment';

type BrowserTtsSessionEnvironmentRuntimeOptions = {
  activeSession: StoredSession | null;
  browserTtsVoices: readonly SpeechSynthesisVoice[];
  setSessions: Dispatch<SetStateAction<StoredSession[]>>;
  ttsLanguage: TtsLanguage;
};

export function useBrowserTtsSessionEnvironmentRuntime({
  activeSession,
  browserTtsVoices,
  setSessions,
  ttsLanguage,
}: BrowserTtsSessionEnvironmentRuntimeOptions) {
  useEffect(() => {
    if (browserTtsVoices.length === 0) return;

    setSessions((prev) =>
      assignMissingBrowserTtsVoiceEnvironments({
        sessions: prev,
        browserTtsVoices,
        navigatorRef: getBrowserNavigator(),
        matchMedia: getBrowserMatchMedia(),
      }),
    );
  }, [browserTtsVoices, setSessions]);

  const collectBrowserTtsEnvironmentForSession = useCallback(
    (
      session: StoredSession | null | undefined,
      selectedVoice: SpeechSynthesisVoice | null = null,
      selectedVoiceURI: string | null | undefined = session?.ttsVoiceURI,
    ) =>
      collectBrowserTtsEnvironmentForSessionValue({
        session,
        selectedVoice,
        selectedVoiceURI,
        browserTtsVoices,
        navigatorRef: getBrowserNavigator(),
        matchMedia: getBrowserMatchMedia(),
      }),
    [browserTtsVoices],
  );

  const attachBrowserTtsEnvironment = useCallback(
    (
      session: StoredSession,
      selectedVoice: SpeechSynthesisVoice | null = null,
      selectedVoiceURI: string | null | undefined = session.ttsVoiceURI,
    ) =>
      attachBrowserTtsEnvironmentForSession({
        session,
        selectedVoice,
        selectedVoiceURI,
        browserTtsVoices,
        navigatorRef: getBrowserNavigator(),
        matchMedia: getBrowserMatchMedia(),
      }),
    [browserTtsVoices],
  );

  const resolveBrowserTtsVoiceForSession = useCallback(
    (session: StoredSession | null | undefined, language: TtsLanguage = ttsLanguage) =>
      resolveBrowserTtsVoiceForSessionValue({
        session,
        browserTtsVoices,
        language,
      }),
    [browserTtsVoices, ttsLanguage],
  );

  const resolveActiveBrowserTtsVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!activeSession || activeSession.inputMode !== BROWSER_TTS_SESSION_INPUT_MODE) return null;

    const resolution = resolveBrowserTtsVoiceSessionUpdate({
      session: activeSession,
      browserTtsVoices,
      language: ttsLanguage,
      navigatorRef: getBrowserNavigator(),
      matchMedia: getBrowserMatchMedia(),
    });

    if (resolution.changed) {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSession.id ? resolution.nextSession : session,
        ),
      );
    }

    return resolution.voice;
  }, [activeSession, browserTtsVoices, setSessions, ttsLanguage]);

  return {
    collectBrowserTtsEnvironmentForSession,
    attachBrowserTtsEnvironment,
    resolveBrowserTtsVoiceForSession,
    resolveActiveBrowserTtsVoice,
  };
}

function getBrowserNavigator(): BrowserTtsEnvironmentNavigatorLike | null {
  return typeof window === 'undefined' ? null : window.navigator;
}

function getBrowserMatchMedia(): BrowserTtsEnvironmentMatchMedia | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia.bind(window);
}
