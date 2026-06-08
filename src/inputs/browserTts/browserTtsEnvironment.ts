import type { BrowserTtsEnvironmentFingerprint } from '../../types/dictation';
import { voicesForBrowserTtsLanguage, type BrowserTtsLanguage } from './browserTtsVoices';

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

  const navigatorRef = options.navigatorRef ?? getGlobalNavigator();
  const userAgent = navigatorRef?.userAgent ?? '';
  const platform = normalizeString(navigatorRef?.platform) ?? 'unknown';
  const voices = resolveVoices(options);
  const language = options.language;
  const selectedVoice =
    options.selectedVoice ??
    (options.selectedVoiceURI
      ? voices.find((voice) => voice.voiceURI === options.selectedVoiceURI) ?? null
      : null);
  const selectedVoiceURI = normalizeString(selectedVoice?.voiceURI) ?? normalizeString(options.selectedVoiceURI);
  const selectedVoiceName = normalizeString(selectedVoice?.name);
  const selectedVoiceLang = normalizeString(selectedVoice?.lang);
  const matchingVoiceCount = voicesForBrowserTtsLanguage(voicesWithRequiredFields(voices), language as BrowserTtsLanguage | null | undefined).length;

  return {
    engine: 'browser',
    browserUserAgentHash: hashBrowserUserAgent(userAgent),
    platform,
    standalonePwa: detectStandalonePwa(options.matchMedia, navigatorRef),
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
  ].join('\u001f'))}`;
}

export function hashBrowserUserAgent(userAgent: string): string {
  return fnv1a32Hex(userAgent);
}

function resolveVoices<TVoice extends BrowserTtsEnvironmentVoiceLike>(
  options: BrowserTtsEnvironmentOptions<TVoice>,
): readonly TVoice[] {
  if (Array.isArray(options.voices)) return options.voices;
  try {
    return options.speechSynthesis?.getVoices?.() ?? [];
  } catch {
    return [];
  }
}

function voicesWithRequiredFields<TVoice extends BrowserTtsEnvironmentVoiceLike>(
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

function detectStandalonePwa(
  matchMediaOverride: BrowserTtsEnvironmentMatchMedia | null | undefined,
  navigatorRef: BrowserTtsEnvironmentNavigatorLike | null | undefined,
): boolean {
  const matchMediaRef = matchMediaOverride ?? getGlobalMatchMedia();
  try {
    if (matchMediaRef?.('(display-mode: standalone)').matches === true) return true;
  } catch {
    // Ignore embedded browser matchMedia quirks.
  }
  return navigatorRef?.standalone === true;
}

function getGlobalNavigator(): BrowserTtsEnvironmentNavigatorLike | null {
  return typeof navigator === 'undefined' ? null : navigator;
}

function getGlobalMatchMedia(): BrowserTtsEnvironmentMatchMedia | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia.bind(window);
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNullableString(value: unknown): string | null {
  return normalizeString(value);
}

function normalizeCount(value: unknown): number {
  const count = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
}

function fnv1a32Hex(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
