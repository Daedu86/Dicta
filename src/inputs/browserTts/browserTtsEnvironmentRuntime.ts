import { normalizeString } from './browserTtsEnvironmentUtils';
import type {
  BrowserTtsEnvironmentMatchMedia,
  BrowserTtsEnvironmentNavigatorLike,
  BrowserTtsEnvironmentOptions,
  BrowserTtsEnvironmentVoiceLike,
} from './browserTtsEnvironment';

export function resolveBrowserTtsEnvironmentVoices<TVoice extends BrowserTtsEnvironmentVoiceLike>(
  options: BrowserTtsEnvironmentOptions<TVoice>,
): readonly TVoice[] {
  if (Array.isArray(options.voices)) return options.voices;
  try {
    return options.speechSynthesis?.getVoices?.() ?? [];
  } catch {
    return [];
  }
}

export function voicesWithRequiredBrowserTtsFields<TVoice extends BrowserTtsEnvironmentVoiceLike>(
  voices: readonly TVoice[],
): Array<TVoice & { lang: string; voiceURI: string }> {
  return voices
    .map((voice) => {
      const lang = normalizeString(voice.lang);
      const voiceURI = normalizeString(voice.voiceURI);
      return lang && voiceURI ? { ...voice, lang, voiceURI } : null;
    })
    .filter((voice): voice is TVoice & { lang: string; voiceURI: string } => Boolean(voice));
}

export function detectStandaloneBrowserTtsPwa(
  matchMediaOverride: BrowserTtsEnvironmentMatchMedia | null | undefined,
  navigatorRef: BrowserTtsEnvironmentNavigatorLike | null | undefined,
): boolean {
  const matchMediaRef = matchMediaOverride ?? getGlobalBrowserTtsMatchMedia();
  try {
    if (matchMediaRef?.('(display-mode: standalone)').matches === true) return true;
  } catch {
    // Ignore embedded browser matchMedia quirks.
  }
  return navigatorRef?.standalone === true;
}

export function getGlobalBrowserTtsNavigator(): BrowserTtsEnvironmentNavigatorLike | null {
  return typeof navigator === 'undefined' ? null : navigator;
}

function getGlobalBrowserTtsMatchMedia(): BrowserTtsEnvironmentMatchMedia | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia.bind(window);
}
