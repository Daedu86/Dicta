import { isSupportedLanguage, type SupportedLanguage } from '../languages';
import type { LanguageCode } from './types';
import type { LanguageAdaptiveCalibration } from './continuousAdaptiveListeningTypes';

const NEUTRAL_CALIBRATION: Omit<LanguageAdaptiveCalibration, 'language'> = {
  playbackRateFloor: 0.6,
  playbackRateCeiling: 1.3,
  pauseMsFloor: 100,
  pauseMsCeiling: 4000,
  comfortableWpmRange: [30, 72],
  lagToleranceRange: [0.7, 2.4],
  perceptualPauseBias: 0,
  phraseLengthBias: 0,
  boundaryStrictnessBias: 0,
  semanticLoadBias: 0,
  minPerceptualPauseMs: 1500,
  benchmarkMinSemanticCompleteness: 0.7,
  sessionInsightMinSemanticCompleteness: 0.55,
  reliableRawLagRange: [-8, 8],
};

export const LANGUAGE_ADAPTIVE_CALIBRATIONS: Record<SupportedLanguage, LanguageAdaptiveCalibration> = {
  en: { ...NEUTRAL_CALIBRATION, language: 'en' },
  es: { ...NEUTRAL_CALIBRATION, language: 'es' },
  de: { ...NEUTRAL_CALIBRATION, language: 'de' },
  fr: { ...NEUTRAL_CALIBRATION, language: 'fr' },
  pt: { ...NEUTRAL_CALIBRATION, language: 'pt' },
};

export function resolveLanguageAdaptiveCalibration(language?: string | null): LanguageAdaptiveCalibration {
  const normalized = (language ?? '').trim().toLowerCase();
  if (isSupportedLanguage(normalized)) {
    return LANGUAGE_ADAPTIVE_CALIBRATIONS[normalized];
  }

  return {
    ...NEUTRAL_CALIBRATION,
    language: (normalized || 'unknown') as LanguageCode,
  };
}
