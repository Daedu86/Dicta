import { describe, expect, it } from 'vitest';
import {
  calibrateBrowserTtsVoiceRate,
  DEFAULT_BROWSER_TTS_VOICE_CALIBRATION_PROFILE,
} from '../src/app/browserTtsVoiceCalibration';
import type { BrowserTtsEnvironmentFingerprint } from '../src/types/dictation';
import { createVoice } from './helpers/browserTtsUtteranceConfigurationFixtures';

function createEnvironment(
  overrides: Partial<BrowserTtsEnvironmentFingerprint> = {},
): BrowserTtsEnvironmentFingerprint {
  return {
    engine: 'browser',
    browserUserAgentHash: 'ua-hash',
    platform: 'Win32',
    standalonePwa: false,
    voiceURI: 'anna-de',
    voiceName: 'Anna',
    voiceLang: 'de-DE',
    localService: true,
    availableVoiceCount: 4,
    matchingVoiceCount: 2,
    ...overrides,
  };
}

describe('calibrateBrowserTtsVoiceRate', () => {
  it('keeps uncalibrated voices inside the safe Browser TTS rate envelope', () => {
    const result = calibrateBrowserTtsVoiceRate({
      requestedRate: 1.5,
      voice: createVoice({ name: 'Anna', lang: 'de-DE', voiceURI: 'anna-de' }),
      environment: createEnvironment(),
    });

    expect(result.effectiveRate).toBe(DEFAULT_BROWSER_TTS_VOICE_CALIBRATION_PROFILE.safeUncalibratedMaxRate);
    expect(result.rateLimited).toBe(true);
    expect(result.calibrationStatus).toBe('rate-capped');
    expect(result.reasonCodes).toContain('pace-unmeasured');
    expect(result.reasonCodes).toContain('rate-capped-to-safe-envelope');
  });

  it('allows a wider rate envelope when measured voice pace exists', () => {
    const result = calibrateBrowserTtsVoiceRate({
      requestedRate: 1.25,
      voice: createVoice({ name: 'Lucia', lang: 'es-ES', voiceURI: 'lucia-es' }),
      environment: createEnvironment({ voiceURI: 'lucia-es', voiceName: 'Lucia', voiceLang: 'es-ES' }),
      measuredWordsPerMinute: 165,
    });

    expect(result.effectiveRate).toBe(1.25);
    expect(result.rateLimited).toBe(false);
    expect(result.calibrationStatus).toBe('calibrated');
    expect(result.estimatedWordsPerMinute).toBe(206);
  });

  it('falls back to the session environment when no resolved SpeechSynthesisVoice exists', () => {
    const result = calibrateBrowserTtsVoiceRate({
      requestedRate: 0.85,
      voice: null,
      environment: createEnvironment({ voiceURI: 'session-voice', voiceName: 'Session Voice' }),
    });

    expect(result.voiceURI).toBe('session-voice');
    expect(result.voiceName).toBe('Session Voice');
    expect(result.calibrationStatus).toBe('uncalibrated');
  });

  it('marks unresolved voice environments without throwing', () => {
    const result = calibrateBrowserTtsVoiceRate({
      requestedRate: Number.NaN,
      voice: null,
      environment: null,
    });

    expect(result.effectiveRate).toBe(DEFAULT_BROWSER_TTS_VOICE_CALIBRATION_PROFILE.minRate);
    expect(result.voiceURI).toBeNull();
    expect(result.calibrationStatus).toBe('voice-unresolved');
    expect(result.reasonCodes).toContain('voice-unresolved');
  });
});
