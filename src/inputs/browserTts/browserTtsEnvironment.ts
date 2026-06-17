import type { BrowserTtsEnvironmentFingerprint } from '../../types/dictation';
import { voicesForBrowserTtsLanguage, type BrowserTtsLanguage } from './browserTtsVoices';
import {
  detectStandaloneBrowserTtsPwa,
  getGlobalBrowserTtsNavigator,
  resolveBrowserTtsEnvironmentVoices,
  voicesWithRequiredBrowserTtsFields,
} from './browserTtsEnvironmentRuntime';
import {
  fnv1a32Hex,
  normalizeCount,
  normalizeNullableString,
  normalizeString,
} from './browserTtsEnvironmentUtils';

const BROWSER_TTS_ENVIRONMENT_ID_SEPARATOR = String.fromCharCode(31);

type BrowserTtsEnvironmentInputMode = 'browser-tts';

export type BrowserTtsEnvironmentVoiceLike = {
  lang?: string;
  voiceURI?: string;
  name?: string;
  localService?: boolean;
};

export type BrowserTtsEnvironmentNavigatorLike = {
  userAgent?: string;
  platform?: string;
  standalone?: boolean;
};

export type BrowserTtsEnvironmentSpeechSynthesisLike<TVoice extends BrowserTtsEnvironmentVoiceLike> = {
  getVoices?: () => readonly TVoice[];
};

export type BrowserTtsEnvironmentMatchMedia = (query: string) => { matches?: boolean };

export type BrowserTtsEnvironmentOptions<TVoice extends BrowserTtsEnvironmentVoiceLike = BrowserTtsEnvironmentVoiceLike> = {
  inputMode?: BrowserTtsEnvironmentInputMode;
  language?: BrowserTtsLanguage | string | null;
  selectedVoice?: TVoice | null;
  selectedVoiceURI?: string | null;
  voices?: readonly TVoice[] | null;
  navigatorRef?: BrowserTtsEnvironmentNavigatorLike | null;
  speechSynthesis?: BrowserTtsEnvironmentSpeechSynthesisLike<TVoice> | null;
  matchMedia?: BrowserTtsEnvironmentMatchMedia | null;
};

export function collectBrowserTtsEnvironmentFingerprint<TVoice extends BrowserTtsEnvironmentVoiceLike>(
  options: BrowserTtsEnvironmentOptions<TVoice> = {},
): BrowserTtsEnvironmentFingerprint | null {
  if (options.inputMode && options.inputMode !== 'browser-tts') return null;

  const navigatorRef = options.navigatorRef ?? getGlobalBrowserTtsNavigator();
  const userAgent = navigatorRef?.userAgent ?? '';
  const platform = normalizeString(navigatorRef?.platform) ?? 'unknown';
  const voices = resolveBrowserTtsEnvironmentVoices(options);
  const language = options.language;
  const selectedVoice =
    options.selectedVoice ??
    (options.selectedVoiceURI
      ? voices.find((voice) => voice.voiceURI === options.selectedVoiceURI) ?? null
      : null);
  const selectedVoiceURI = normalizeString(selectedVoice?.voiceURI) ?? normalizeString(options.selectedVoiceURI);
  const selectedVoiceName = normalizeString(selectedVoice?.name);
  const selectedVoiceLang = normalizeString(selectedVoice?.lang);
  const matchingVoiceCount = voicesForBrowserTtsLanguage(
    voicesWithRequiredBrowserTtsFields(voices),
    language as BrowserTtsLanguage | null | undefined,
  ).length;

  return {
    engine: 'browser',
    browserUserAgentHash: hashBrowserUserAgent(userAgent),
    platform,
    standalonePwa: detectStandaloneBrowserTtsPwa(options.matchMedia, navigatorRef),
    voiceURI: selectedVoiceURI,
    voiceName: selectedVoiceName,
    voiceLang: selectedVoiceLang,
    localService: typeof selectedVoice?.localService === 'boolean' ? selectedVoice.localService : null,
    availableVoiceCount: voices.length,
    matchingVoiceCount,
  };
}

export function normalizeBrowserTtsEnvironmentFingerprint(value: unknown): BrowserTtsEnvironmentFingerprint | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Partial<BrowserTtsEnvironmentFingerprint>;
  if (record.engine !== 'browser') return null;
  const browserUserAgentHash = normalizeString(record.browserUserAgentHash);
  if (!browserUserAgentHash) return null;
  const platform = normalizeString(record.platform) ?? 'unknown';
  const availableVoiceCount = normalizeCount(record.availableVoiceCount);
  const matchingVoiceCount = normalizeCount(record.matchingVoiceCount);
  return {
    engine: 'browser',
    browserUserAgentHash,
    platform,
    standalonePwa: record.standalonePwa === true,
    voiceURI: normalizeNullableString(record.voiceURI),
    voiceName: normalizeNullableString(record.voiceName),
    voiceLang: normalizeNullableString(record.voiceLang),
    localService: typeof record.localService === 'boolean' ? record.localService : null,
    availableVoiceCount,
    matchingVoiceCount,
  };
}

export function getBrowserTtsEnvironmentId(environment: BrowserTtsEnvironmentFingerprint): string {
  return `browser-${fnv1a32Hex([
    environment.engine,
    environment.browserUserAgentHash,
    environment.platform,
    environment.standalonePwa ? 'standalone' : 'browser-tab',
    environment.voiceURI ?? '',
    environment.voiceName ?? '',
    environment.voiceLang ?? '',
    environment.localService === null ? 'unknown-service' : environment.localService ? 'local' : 'remote',
  ].join(BROWSER_TTS_ENVIRONMENT_ID_SEPARATOR))}`;
}

export function hashBrowserUserAgent(userAgent: string): string {
  return fnv1a32Hex(userAgent);
}
