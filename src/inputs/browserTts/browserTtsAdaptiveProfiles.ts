import { isSupportedLanguage, type SupportedLanguage } from '../../core/languages';

export type BrowserTtsCalibrationGate = {
  minAccuracy: number;
  maxStableLagSecAbs: number;
  maxP90AbsLagSec: number;
};

export type BrowserTtsSessionWarmupProfile = {
  enabled: boolean;
  chunkCount: number;
  playbackRate: number;
  pauseMs: number;
  phraseSize: 'short' | 'medium' | 'long';
  promotionMinAccuracy: number;
  promotionMaxLagSecAbs: number;
};

export type BrowserTtsAdaptivePauseProfile = {
  enabled: boolean;
  minPauseMs: number;
  maxPauseMs: number;
  lowAccuracyPauseMs: number;
  veryLowAccuracyPauseMs: number;
  lagBehindPauseMs: number;
  severeLagBehindPauseMs: number;
  progressBehindPauseMs: number;
  lowAccuracyThreshold: number;
  veryLowAccuracyThreshold: number;
  lagBehindSec: number;
  severeLagBehindSec: number;
  progressBehindRatio: number;
  historyLowAccuracyThreshold: number;
  historyHighLagSec: number;
};

export type BrowserTtsAdaptiveProfile = {
  supportRateFloor: number;
  extremeSupportRateFloor: number;
  balancedFlowFloor: number;
  supportRateCeiling: number;
  unsafeBoundaryMinPauseMs: number;
  minRecommendedRate: number;
  recommendationCalibrationEnabled: boolean;
  recommendationCalibrationGate?: BrowserTtsCalibrationGate;
  sessionWarmup: BrowserTtsSessionWarmupProfile;
  adaptivePause: BrowserTtsAdaptivePauseProfile;
  supportRecoveryAggressiveness: 'low' | 'medium' | 'high';
  phraseGrowthConservatism: 'low' | 'medium' | 'high';
  germanShortBias: {
    enabled: boolean;
    lagSecTrigger: number;
    accuracyPercentTrigger: number;
  };
};

export const BROWSER_TTS_BASE_PROFILE: BrowserTtsAdaptiveProfile = {
  supportRateFloor: 0.7,
  extremeSupportRateFloor: 0.7,
  balancedFlowFloor: 0.7,
  supportRateCeiling: 0.95,
  unsafeBoundaryMinPauseMs: 1800,
  minRecommendedRate: 0.7,
  recommendationCalibrationEnabled: false,
  sessionWarmup: {
    enabled: false,
    chunkCount: 0,
    playbackRate: 0.75,
    pauseMs: 2200,
    phraseSize: 'short',
    promotionMinAccuracy: 0.88,
    promotionMaxLagSecAbs: 0.8,
  },
  adaptivePause: {
    enabled: true,
    minPauseMs: 1800,
    maxPauseMs: 3600,
    lowAccuracyPauseMs: 2400,
    veryLowAccuracyPauseMs: 3000,
    lagBehindPauseMs: 2600,
    severeLagBehindPauseMs: 3400,
    progressBehindPauseMs: 2800,
    lowAccuracyThreshold: 0.84,
    veryLowAccuracyThreshold: 0.76,
    lagBehindSec: 1.5,
    severeLagBehindSec: 3.0,
    progressBehindRatio: 0.1,
    historyLowAccuracyThreshold: 0.82,
    historyHighLagSec: 2.0,
  },
  supportRecoveryAggressiveness: 'medium',
  phraseGrowthConservatism: 'medium',
  germanShortBias: {
    enabled: false,
    lagSecTrigger: 2.0,
    accuracyPercentTrigger: 82,
  },
};

export const BROWSER_TTS_ES_PROFILE: BrowserTtsAdaptiveProfile = {
  ...BROWSER_TTS_BASE_PROFILE,
  recommendationCalibrationEnabled: true,
  recommendationCalibrationGate: {
    minAccuracy: 0.92,
    maxStableLagSecAbs: 0.8,
    maxP90AbsLagSec: 1.5,
  },
};

export const BROWSER_TTS_EN_PROFILE: BrowserTtsAdaptiveProfile = {
  ...BROWSER_TTS_BASE_PROFILE,
  supportRateCeiling: 0.92,
  sessionWarmup: {
    enabled: true,
    chunkCount: 3,
    playbackRate: 0.72,
    pauseMs: 2400,
    phraseSize: 'short',
    promotionMinAccuracy: 0.88,
    promotionMaxLagSecAbs: 0.8,
  },
  adaptivePause: {
    ...BROWSER_TTS_BASE_PROFILE.adaptivePause,
    lowAccuracyThreshold: 0.88,
    lagBehindSec: 1.2,
    progressBehindRatio: 0.08,
    historyHighLagSec: 1.8,
  },
  recommendationCalibrationEnabled: false,
  supportRecoveryAggressiveness: 'high',
  phraseGrowthConservatism: 'high',
};

export const BROWSER_TTS_DE_PROFILE: BrowserTtsAdaptiveProfile = {
  ...BROWSER_TTS_BASE_PROFILE,
  supportRateCeiling: 0.9,
  recommendationCalibrationEnabled: false,
  supportRecoveryAggressiveness: 'low',
  phraseGrowthConservatism: 'high',
  germanShortBias: {
    enabled: true,
    lagSecTrigger: 2.0,
    accuracyPercentTrigger: 82,
  },
};

export const BROWSER_TTS_FR_PROFILE: BrowserTtsAdaptiveProfile = {
  ...BROWSER_TTS_BASE_PROFILE,
};

export const BROWSER_TTS_PT_PROFILE: BrowserTtsAdaptiveProfile = {
  ...BROWSER_TTS_BASE_PROFILE,
};

export const BROWSER_TTS_LANGUAGE_PROFILES: Record<SupportedLanguage, BrowserTtsAdaptiveProfile> = {
  en: BROWSER_TTS_EN_PROFILE,
  es: BROWSER_TTS_ES_PROFILE,
  de: BROWSER_TTS_DE_PROFILE,
  fr: BROWSER_TTS_FR_PROFILE,
  pt: BROWSER_TTS_PT_PROFILE,
};

export function resolveBrowserTtsAdaptiveProfile(language?: string): BrowserTtsAdaptiveProfile {
  const normalized = (language ?? '').trim().toLowerCase();
  return isSupportedLanguage(normalized)
    ? BROWSER_TTS_LANGUAGE_PROFILES[normalized]
    : BROWSER_TTS_BASE_PROFILE;
}
