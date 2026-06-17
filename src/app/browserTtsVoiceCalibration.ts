import type { BrowserTtsEnvironmentFingerprint } from '../types/dictation';

export type BrowserTtsVoiceCalibrationStatus =
  | 'voice-unresolved'
  | 'uncalibrated'
  | 'rate-capped'
  | 'calibrated';

export interface BrowserTtsVoiceCalibrationProfile {
  minRate: number;
  safeUncalibratedMaxRate: number;
  calibratedMaxRate: number;
  baselineWordsPerMinute: number;
}

export interface BrowserTtsVoiceCalibrationInput {
  requestedRate: number;
  voice: SpeechSynthesisVoice | null;
  environment: BrowserTtsEnvironmentFingerprint | null;
  measuredWordsPerMinute?: number | null;
  profile?: Partial<BrowserTtsVoiceCalibrationProfile>;
}

export interface BrowserTtsVoiceCalibrationResult {
  voiceURI: string | null;
  voiceName: string | null;
  voiceLang: string | null;
  localService: boolean | null;
  platform: string | null;
  requestedRate: number;
  effectiveRate: number;
  estimatedWordsPerMinute: number;
  calibrationStatus: BrowserTtsVoiceCalibrationStatus;
  rateLimited: boolean;
  reasonCodes: string[];
}

export const DEFAULT_BROWSER_TTS_VOICE_CALIBRATION_PROFILE: BrowserTtsVoiceCalibrationProfile = {
  minRate: 0.6,
  safeUncalibratedMaxRate: 1.15,
  calibratedMaxRate: 1.3,
  baselineWordsPerMinute: 155,
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function resolveProfile(
  overrides: Partial<BrowserTtsVoiceCalibrationProfile> | undefined,
): BrowserTtsVoiceCalibrationProfile {
  return {
    ...DEFAULT_BROWSER_TTS_VOICE_CALIBRATION_PROFILE,
    ...overrides,
  };
}

function resolveVoiceURI(
  voice: SpeechSynthesisVoice | null,
  environment: BrowserTtsEnvironmentFingerprint | null,
): string | null {
  return voice?.voiceURI ?? environment?.voiceURI ?? null;
}

export function calibrateBrowserTtsVoiceRate({
  requestedRate,
  voice,
  environment,
  measuredWordsPerMinute = null,
  profile: profileOverrides,
}: BrowserTtsVoiceCalibrationInput): BrowserTtsVoiceCalibrationResult {
  const profile = resolveProfile(profileOverrides);
  const hasMeasuredPace = measuredWordsPerMinute !== null && Number.isFinite(measuredWordsPerMinute);
  const maxRate = hasMeasuredPace ? profile.calibratedMaxRate : profile.safeUncalibratedMaxRate;
  const effectiveRate = clamp(requestedRate, profile.minRate, maxRate);
  const rateLimited = effectiveRate !== requestedRate;
  const estimatedWordsPerMinute = Math.round(
    hasMeasuredPace
      ? measuredWordsPerMinute * effectiveRate
      : profile.baselineWordsPerMinute * effectiveRate,
  );
  const voiceURI = resolveVoiceURI(voice, environment);
  const reasonCodes: string[] = [];

  if (!voiceURI) reasonCodes.push('voice-unresolved');
  if (!hasMeasuredPace) reasonCodes.push('pace-unmeasured');
  if (rateLimited) reasonCodes.push('rate-capped-to-safe-envelope');

  const calibrationStatus: BrowserTtsVoiceCalibrationStatus = !voiceURI
    ? 'voice-unresolved'
    : rateLimited
      ? 'rate-capped'
      : hasMeasuredPace
        ? 'calibrated'
        : 'uncalibrated';

  return {
    voiceURI,
    voiceName: voice?.name ?? environment?.voiceName ?? null,
    voiceLang: voice?.lang ?? environment?.voiceLang ?? null,
    localService: voice?.localService ?? environment?.localService ?? null,
    platform: environment?.platform ?? null,
    requestedRate,
    effectiveRate,
    estimatedWordsPerMinute,
    calibrationStatus,
    rateLimited,
    reasonCodes,
  };
}
