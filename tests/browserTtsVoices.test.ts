import { describe, expect, it } from 'vitest';
import {
  chooseDiverseBrowserTtsVoiceURIForSession,
  chooseRandomBrowserTtsVoiceURI,
  chooseRandomBrowserTtsVoiceURIForSession,
  resolveBrowserTtsSessionVoice,
  voicesForBrowserTtsLanguage,
  type BrowserTtsVoiceLike,
} from '../src/inputs/browserTts/browserTtsVoices';

const voices: BrowserTtsVoiceLike[] = [
  { lang: 'en-US', voiceURI: 'en-a' },
  { lang: 'en-GB', voiceURI: 'en-b' },
  { lang: 'es-ES', voiceURI: 'es-a' },
  { lang: 'de-DE', voiceURI: 'de-a' },
  { lang: 'fr-FR', voiceURI: 'fr-a' },
  { lang: 'fr-CA', voiceURI: 'fr-b' },
  { lang: 'pt-BR', voiceURI: 'pt-a' },
  { lang: 'pt-PT', voiceURI: 'pt-b' },
];

describe('Browser TTS voices', () => {
  it('filters voices by EN, ES, DE, FR, and PT language prefix', () => {
    expect(voicesForBrowserTtsLanguage(voices, 'en').map((voice) => voice.voiceURI)).toEqual(['en-a', 'en-b']);
    expect(voicesForBrowserTtsLanguage(voices, 'es').map((voice) => voice.voiceURI)).toEqual(['es-a']);
    expect(voicesForBrowserTtsLanguage(voices, 'de').map((voice) => voice.voiceURI)).toEqual(['de-a']);
    expect(voicesForBrowserTtsLanguage(voices, 'fr').map((voice) => voice.voiceURI)).toEqual(['fr-a', 'fr-b']);
    expect(voicesForBrowserTtsLanguage(voices, 'pt').map((voice) => voice.voiceURI)).toEqual(['pt-a', 'pt-b']);
  });

  it('chooses a random compatible voice URI for the session language', () => {
    expect(chooseRandomBrowserTtsVoiceURI(voices, 'en', () => 0)).toBe('en-a');
    expect(chooseRandomBrowserTtsVoiceURI(voices, 'en', () => 0.75)).toBe('en-b');
    expect(chooseRandomBrowserTtsVoiceURI(voices, 'es', () => 0.75)).toBe('es-a');
    expect(chooseRandomBrowserTtsVoiceURI(voices, 'fr', () => 0.75)).toBe('fr-b');
    expect(chooseRandomBrowserTtsVoiceURI(voices, 'pt', () => 0.75)).toBe('pt-b');
  });

  it('returns null when no compatible voices are available yet', () => {
    expect(chooseRandomBrowserTtsVoiceURI([], 'de', () => 0)).toBeNull();
    expect(resolveBrowserTtsSessionVoice([], 'de', null, () => 0)).toEqual({
      voice: null,
      voiceURI: null,
      usedFallback: false,
    });
  });

  it('assigns automatic voices only to Input #2 sessions', () => {
    expect(chooseRandomBrowserTtsVoiceURIForSession('input2', voices, 'en', () => 0)).toBe('en-a');
  });

  it('prefers the least-used compatible voice for Input #2 diversity', () => {
    expect(chooseDiverseBrowserTtsVoiceURIForSession('input2', voices, 'en', ['en-a'], () => 0)).toBe('en-b');
    expect(chooseDiverseBrowserTtsVoiceURIForSession('input2', voices, 'en', ['en-a', 'en-b'], () => 0)).toBe('en-a');
  });

  it('does not apply diverse Browser TTS voice selection to other inputs', () => {
  });

  it('uses the saved voice when it still exists on the current device', () => {
    const resolved = resolveBrowserTtsSessionVoice(voices, 'en', 'en-b', () => 0);
    expect(resolved.voice?.voiceURI).toBe('en-b');
    expect(resolved.voiceURI).toBe('en-b');
    expect(resolved.usedFallback).toBe(false);
  });

  it('falls back to a random compatible voice when the saved voice is missing', () => {
    const resolved = resolveBrowserTtsSessionVoice(voices, 'en', 'old-device-voice', () => 0);
    expect(resolved.voice?.voiceURI).toBe('en-a');
    expect(resolved.voiceURI).toBe('en-a');
    expect(resolved.usedFallback).toBe(true);
  });
});
