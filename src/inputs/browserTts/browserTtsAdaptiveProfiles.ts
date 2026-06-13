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
  supportRateFloor: 0.82,
  extremeSupportRateFloor: 0.78,
  balancedFlowFloor: 0.84,
  supportRateCeiling: 0.92,
  unsafeBoundaryMinPauseMs: 1200,
  minRecommendedRate: 0.84,
  recommendationCalibrationEnabled: false,
  sessionWarmup: {
    enabled: false,
    chunkCount: 0,
    playbackRate: 0.82,
    pauseMs: 1200,
    phraseSize: 'short',
    promotionMinAccuracy: 0.88,
    promotionMaxLagSecAbs: 0.8,
  },
  adaptivePause: {
    enabled: true,
    minPauseMs: 1200,
    maxPauseMs: 2600,
    lowAccuracyPauseMs: 1600,
    veryLowAccuracyPauseMs: 2000,
    lagBehindPauseMs: 1700,
    severeLagBehindPauseMs: 2200,
    progressBehindPauseMs: 1800,
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
  minRecommendedRate: 0.86,
  recommendationCalibrationEnabled: true,
  recommendationCalibrationGate: {
    minAccuracy: 0.92,
    maxStableLagSecAbs: 0.8,
    maxP90AbsLagSec: 1.5,
  },
};

export const BROWSER_TTS_EN_PROFILE: BrowserTtsAdaptiveProfile = {
  ...BROWSER_TTS_BASE_PROFILE,
  supportRateFloor: 0.78,
  extremeSupportRateFloor: 0.74,
  balancedFlowFloor: 0.8,
  supportRateCeiling: 0.88,
  minRecommendedRate: 0.78,
  sessionWarmup: {
    enabled: true,
    chunkCount: 3,
    playbackRate: 0.78,
    pauseMs: 1800,
    phraseSize: 'short',
    promotionMinAccuracy: 0.88,
    promotionMaxLagSecAbs: 0.8,
  },
  adaptivePause: {
    enabled: true,
    minPauseMs: 1600,
    maxPauseMs: 3200,
    lowAccuracyPauseMs: 2200,
    veryLowAccuracyPauseMs: 2600,
    lagBehindPauseMs: 2200,
    severeLagBehindPauseMs: 2800,
    progressBehindPauseMs: 2400,
    lowAccuracyThreshold: 0.88,
    veryLowAccuracyThreshold: 0.76,
    lagBehindSec: 1.2,
    severeLagBehindSec: 3.0,
    progressBehindRatio: 0.08,
    historyLowAccuracyThreshold: 0.82,
    historyHighLagSec: 1.8,
  },
  recommendationCalibrationEnabled: false,
  supportRecoveryAggressiveness: 'high',
  phraseGrowthConservatism: 'high',
};

export const BROWSER_TTS_DE_PROFILE: BrowserTtsAdaptiveProfile = {
  ...BROWSER_TTS_BASE_PROFILE,
  supportRateFloor: 0.8,
  extremeSupportRateFloor: 0.78,
  balancedFlowFloor: 0.82,
  supportRateCeiling: 0.9,
  unsafeBoundaryMinPauseMs: 1200,
  minRecommendedRate: 0.8,
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
