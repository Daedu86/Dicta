import { describe, expect, it } from 'vitest';
import { buildBrowserTtsUtterancePerfMetadata } from '../src/app/browserTtsUtterancePerfMetadata';

describe('buildBrowserTtsUtterancePerfMetadata', () => {
  it('captures resolved voice metadata and counts matching voices for the active language', () => {
    const metadata = buildBrowserTtsUtterancePerfMetadata({
      playId: 7,
      chunkIndex: 3,
      phraseLengthWords: 5,
      phraseLengthChars: 31,
      language: 'de',
      pacingMode: 'balanced',
      voice: {
        lang: 'de-DE',
        name: 'Anna',
        voiceURI: 'anna-de',
      },
      sessionVoiceURI: 'session-fallback',
      availableVoices: [
        { lang: 'de-DE' },
        { lang: 'de-AT' },
        { lang: 'DE-CH' },
        { lang: 'en-US' },
      ],
    });

    expect(metadata).toEqual({
      playId: 7,
      chunkIndex: 3,
      phraseLengthWords: 5,
      phraseLengthChars: 31,
      language: 'de',
      pacingMode: 'balanced',
      voiceName: 'Anna',
      voiceURI: 'anna-de',
      voiceLang: 'de-DE',
      voiceResolved: true,
      availableVoiceCount: 4,
      matchingVoiceCount: 3,
    });
  });

  it('falls back to the persisted session voice URI when no active browser voice is resolved', () => {
    const metadata = buildBrowserTtsUtterancePerfMetadata({
      playId: 1,
      chunkIndex: 0,
      phraseLengthWords: 2,
      phraseLengthChars: 11,
      language: 'es',
      pacingMode: 'flow',
      voice: null,
      sessionVoiceURI: 'stored-es',
      availableVoices: [{ lang: 'es-ES' }, { lang: 'en-US' }],
    });

    expect(metadata.voiceName).toBeUndefined();
    expect(metadata.voiceURI).toBe('stored-es');
    expect(metadata.voiceLang).toBeUndefined();
    expect(metadata.voiceResolved).toBe(false);
    expect(metadata.availableVoiceCount).toBe(2);
    expect(metadata.matchingVoiceCount).toBe(1);
  });

  it('keeps voiceURI null when neither runtime nor session voice metadata exists', () => {
    const metadata = buildBrowserTtsUtterancePerfMetadata({
      playId: 1,
      chunkIndex: 0,
      phraseLengthWords: 2,
      phraseLengthChars: 11,
      language: 'fr',
      pacingMode: 'slow',
      voice: null,
      sessionVoiceURI: null,
      availableVoices: [],
    });

    expect(metadata.voiceURI).toBeNull();
    expect(metadata.voiceResolved).toBe(false);
    expect(metadata.availableVoiceCount).toBe(0);
    expect(metadata.matchingVoiceCount).toBe(0);
  });
});
