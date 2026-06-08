import type { SupportedLanguage } from '../../core/languages';

export type BrowserTtsVoiceLike = {
  lang: string;
  voiceURI: string;
  name?: string;
};

export type BrowserTtsLanguage = SupportedLanguage;
export type BrowserTtsSessionInputMode = 'input2' | string;

export type BrowserTtsVoiceResolution<TVoice extends BrowserTtsVoiceLike> = {
  voice: TVoice | null;
  voiceURI: string | null;
  usedFallback: boolean;
};

export function voicesForBrowserTtsLanguage<TVoice extends BrowserTtsVoiceLike>(
  voices: readonly TVoice[],
  language: BrowserTtsLanguage | null | undefined,
): TVoice[] {
  if (!language) return [];
  const prefix = language.toLowerCase();
  return voices.filter((voice) => voice.lang.toLowerCase().startsWith(prefix));
}

export function chooseRandomBrowserTtsVoiceURI<TVoice extends BrowserTtsVoiceLike>(
  voices: readonly TVoice[],
  language: BrowserTtsLanguage | null | undefined,
  random: () => number = Math.random,
): string | null {
  const candidates = voicesForBrowserTtsLanguage(voices, language);
  if (candidates.length === 0) return null;
  const index = Math.floor(clamp01(random()) * candidates.length);
  return candidates[Math.min(index, candidates.length - 1)]?.voiceURI ?? null;
}

export function chooseRandomBrowserTtsVoiceURIForSession<TVoice extends BrowserTtsVoiceLike>(
  inputMode: BrowserTtsSessionInputMode,
  voices: readonly TVoice[],
  language: BrowserTtsLanguage | null | undefined,
  random: () => number = Math.random,
): string | null {
  if (inputMode !== 'input2') return null;
  return chooseRandomBrowserTtsVoiceURI(voices, language, random);
}

export function chooseDiverseBrowserTtsVoiceURIForSession<TVoice extends BrowserTtsVoiceLike>(
  inputMode: BrowserTtsSessionInputMode,
  voices: readonly TVoice[],
  language: BrowserTtsLanguage | null | undefined,
  usedVoiceURIs: readonly (string | null | undefined)[],
  random: () => number = Math.random,
): string | null {
  if (inputMode !== 'input2') return null;
  const candidates = voicesForBrowserTtsLanguage(voices, language);
  if (candidates.length === 0) return null;

  const useCounts = new Map<string, number>();
  for (const voiceURI of usedVoiceURIs) {
    if (!voiceURI) continue;
    useCounts.set(voiceURI, (useCounts.get(voiceURI) ?? 0) + 1);
  }

  const leastUsedCount = Math.min(...candidates.map((voice) => useCounts.get(voice.voiceURI) ?? 0));
  const leastUsedCandidates = candidates.filter((voice) => (useCounts.get(voice.voiceURI) ?? 0) === leastUsedCount);
  const index = Math.floor(clamp01(random()) * leastUsedCandidates.length);
  return leastUsedCandidates[Math.min(index, leastUsedCandidates.length - 1)]?.voiceURI ?? null;
}

export function resolveBrowserTtsSessionVoice<TVoice extends BrowserTtsVoiceLike>(
  voices: readonly TVoice[],
  language: BrowserTtsLanguage | null | undefined,
  voiceURI: string | null | undefined,
  random: () => number = Math.random,
): BrowserTtsVoiceResolution<TVoice> {
  if (!language) {
    return { voice: null, voiceURI: null, usedFallback: false };
  }

  const candidates = voicesForBrowserTtsLanguage(voices, language);
  if (candidates.length === 0) {
    return { voice: null, voiceURI: voiceURI ?? null, usedFallback: false };
  }

  if (voiceURI) {
    const matchingVoice = candidates.find((voice) => voice.voiceURI === voiceURI);
    if (matchingVoice) {
      return { voice: matchingVoice, voiceURI: matchingVoice.voiceURI, usedFallback: false };
    }
  }

  const fallbackURI = chooseRandomBrowserTtsVoiceURI(candidates, language, random);
  const fallbackVoice = fallbackURI ? candidates.find((voice) => voice.voiceURI === fallbackURI) ?? null : null;
  return { voice: fallbackVoice, voiceURI: fallbackVoice?.voiceURI ?? null, usedFallback: Boolean(fallbackVoice) };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
