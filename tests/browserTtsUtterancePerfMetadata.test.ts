import { describe, expect, it } from 'vitest';
import { buildBrowserTtsUtterancePerfMetadata } from '../src/app/browserTtsUtterancePerfMetadata';

const expectedBaseCalibrationFields = {
  requestedRate: undefined,
  effectiveRate: undefined,
  estimatedWordsPerMinute: undefined,
  voiceCalibrationStatus: undefined,
  voiceRateLimited: undefined,
  voiceCalibrationReasonCodes: undefined,
};

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
      ...expectedBaseCalibrationFields,
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

  it('records calibrated Browser TTS rate metadata when provided by the runtime', () => {
    const metadata = buildBrowserTtsUtterancePerfMetadata({
      playId: 2,
      chunkIndex: 1,
      phraseLengthWords: 8,
      phraseLengthChars: 42,
      language: 'de',
      pacingMode: 'flow',
      voice: null,
      sessionVoiceURI: 'stored-de',
      availableVoices: [{ lang: 'de-DE' }],
      voiceCalibration: {
        voiceURI: 'calibrated-de',
        voiceName: 'Calibrated German',
        voiceLang: 'de-DE',
        localService: true,
        platform: 'Win32',
        requestedRate: 1.45,
        effectiveRate: 1.15,
        estimatedWordsPerMinute: 178,
        calibrationStatus: 'rate-capped',
        rateLimited: true,
        reasonCodes: ['pace-unmeasured', 'rate-capped-to-safe-envelope'],
      },
    });

    expect(metadata.voiceURI).toBe('calibrated-de');
    expect(metadata.voiceName).toBe('Calibrated German');
    expect(metadata.voiceLang).toBe('de-DE');
    expect(metadata.requestedRate).toBe(1.45);
    expect(metadata.effectiveRate).toBe(1.15);
    expect(metadata.estimatedWordsPerMinute).toBe(178);
    expect(metadata.voiceCalibrationStatus).toBe('rate-capped');
    expect(metadata.voiceRateLimited).toBe(true);
    expect(metadata.voiceCalibrationReasonCodes).toEqual([
      'pace-unmeasured',
      'rate-capped-to-safe-envelope',
    ]);
  });
});
