import { describe, expect, it } from 'vitest';
import {
  collectBrowserTtsEnvironmentFingerprint,
  getBrowserTtsEnvironmentId,
  hashBrowserUserAgent,
  normalizeBrowserTtsEnvironmentFingerprint,
} from '../src/inputs/browserTts/browserTtsEnvironment';

const navigatorRef = {
  userAgent: 'Mozilla/5.0 Dicta Test Browser/1.0',
  platform: 'Win32',
};

describe('browser TTS environment fingerprint', () => {
  it('hashes the user agent deterministically without storing the raw value', () => {
    const first = hashBrowserUserAgent(navigatorRef.userAgent);
    const second = hashBrowserUserAgent(navigatorRef.userAgent);

    expect(first).toBe(second);
    expect(first).not.toBe(navigatorRef.userAgent);
    expect(first).toMatch(/^[a-f0-9]{8}$/);
  });

  it('uses preloaded voices and does not call speechSynthesis.getVoices when voices are supplied', () => {
    let getVoicesCallCount = 0;
    const voices = [
      { lang: 'de-DE', voiceURI: 'de-local', name: 'Anna', localService: true },
      { lang: 'de-AT', voiceURI: 'de-remote', name: 'Anton', localService: false },
      { lang: 'en-US', voiceURI: 'en-local', name: 'English', localService: true },
    ];

    const fingerprint = collectBrowserTtsEnvironmentFingerprint({
      inputMode: 'browser-tts',
      language: 'de',
      selectedVoice: voices[0],
      voices,
      navigatorRef,
      speechSynthesis: {
        getVoices: () => {
          getVoicesCallCount += 1;
          return [];
        },
      },
      matchMedia: () => ({ matches: false }),
    });

    expect(getVoicesCallCount).toBe(0);
    expect(fingerprint).toMatchObject({
      engine: 'browser',
      platform: 'Win32',
      standalonePwa: false,
      voiceURI: 'de-local',
      voiceName: 'Anna',
      voiceLang: 'de-DE',
      localService: true,
      availableVoiceCount: 3,
      matchingVoiceCount: 2,
    });
    expect(fingerprint?.browserUserAgentHash).toBe(hashBrowserUserAgent(navigatorRef.userAgent));
  });

  it('handles asynchronously unavailable voices and preserves a selected voice URI when unresolved', () => {
    const fingerprint = collectBrowserTtsEnvironmentFingerprint({
      inputMode: 'browser-tts',
      language: 'fr',
      selectedVoiceURI: 'pending-fr-voice',
      navigatorRef,
      speechSynthesis: { getVoices: () => [] },
      matchMedia: () => ({ matches: false }),
    });

    expect(fingerprint).toMatchObject({
      voiceURI: 'pending-fr-voice',
      voiceName: null,
      voiceLang: null,
      localService: null,
      availableVoiceCount: 0,
      matchingVoiceCount: 0,
    });
  });

  it('resolves selected voice metadata from voiceURI when the selected voice object is not supplied', () => {
    const voices = [
      { lang: 'pt-BR', voiceURI: 'pt-br', name: 'Portuguese Brazil', localService: false },
      { lang: 'pt-PT', voiceURI: 'pt-pt', name: 'Portuguese Portugal', localService: true },
    ];

    const fingerprint = collectBrowserTtsEnvironmentFingerprint({
      inputMode: 'browser-tts',
      language: 'pt',
      selectedVoiceURI: 'pt-pt',
      voices,
      navigatorRef,
      matchMedia: () => ({ matches: true }),
    });

    expect(fingerprint).toMatchObject({
      standalonePwa: true,
      voiceURI: 'pt-pt',
      voiceName: 'Portuguese Portugal',
      voiceLang: 'pt-PT',
      localService: true,
      matchingVoiceCount: 2,
    });
  });

  it('returns null for non-browser-TTS input modes', () => {
    expect(
      collectBrowserTtsEnvironmentFingerprint({
        inputMode: 'kokoro',
        language: 'de',
        navigatorRef,
        voices: [{ lang: 'de-DE', voiceURI: 'de', name: 'German', localService: true }],
      }),
    ).toBeNull();
  });

  it('normalizes persisted fingerprints and creates stable environment ids', () => {
    const fingerprint = collectBrowserTtsEnvironmentFingerprint({
      inputMode: 'browser-tts',
      language: 'en',
      selectedVoice: { lang: 'en-US', voiceURI: 'en-local', name: 'English', localService: true },
      voices: [{ lang: 'en-US', voiceURI: 'en-local', name: 'English', localService: true }],
      navigatorRef,
      matchMedia: () => ({ matches: false }),
    });

    expect(fingerprint).not.toBeNull();
    const normalized = normalizeBrowserTtsEnvironmentFingerprint(JSON.parse(JSON.stringify(fingerprint)));
    expect(normalized).toEqual(fingerprint);
    expect(getBrowserTtsEnvironmentId(fingerprint!)).toBe(getBrowserTtsEnvironmentId(normalized!));
  });
});
