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

export function resolveBrowserTtsAdaptiveProfile(language?: string): BrowserTtsAdaptiveProfile {
  const normalized = (language ?? '').trim().toLowerCase();
  if (normalized === 'es') return BROWSER_TTS_ES_PROFILE;
  if (normalized === 'en') return BROWSER_TTS_EN_PROFILE;
  if (normalized === 'de') return BROWSER_TTS_DE_PROFILE;
  return BROWSER_TTS_BASE_PROFILE;
}
