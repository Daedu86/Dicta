import type { BrowserTtsEnvironmentMatchMedia, BrowserTtsEnvironmentNavigatorLike } from '../inputs/browserTts/browserTtsEnvironment';
import type { BrowserTtsVoiceLike } from '../inputs/browserTts/browserTtsVoices';
import type { StoredSession, TtsLanguage } from './sessionTypes';

export type BrowserTtsEnvironmentRuntimeOptions<TVoice extends BrowserTtsVoiceLike> = {
  browserTtsVoices: readonly TVoice[];
  navigatorRef?: BrowserTtsEnvironmentNavigatorLike | null;
  matchMedia?: BrowserTtsEnvironmentMatchMedia | null;
};

export type CollectBrowserTtsSessionEnvironmentOptions<TVoice extends BrowserTtsVoiceLike> =
  BrowserTtsEnvironmentRuntimeOptions<TVoice> & {
    session: StoredSession | null | undefined;
    selectedVoice?: TVoice | null;
    selectedVoiceURI?: string | null;
  };

export type AttachBrowserTtsSessionEnvironmentOptions<TVoice extends BrowserTtsVoiceLike> =
  BrowserTtsEnvironmentRuntimeOptions<TVoice> & {
    session: StoredSession;
    selectedVoice?: TVoice | null;
    selectedVoiceURI?: string | null;
  };

export type AssignMissingBrowserTtsVoiceEnvironmentsOptions<TVoice extends BrowserTtsVoiceLike> =
  BrowserTtsEnvironmentRuntimeOptions<TVoice> & {
    sessions: readonly StoredSession[];
    random?: () => number;
  };

export type ResolveBrowserTtsVoiceForSessionOptions<TVoice extends BrowserTtsVoiceLike> = {
  session: StoredSession | null | undefined;
  browserTtsVoices: readonly TVoice[];
  language: TtsLanguage;
  random?: () => number;
};

export type ResolveBrowserTtsVoiceSessionUpdateOptions<TVoice extends BrowserTtsVoiceLike> =
  BrowserTtsEnvironmentRuntimeOptions<TVoice> & {
    session: StoredSession;
    language: TtsLanguage;
    nowIso?: () => string;
    random?: () => number;
  };
