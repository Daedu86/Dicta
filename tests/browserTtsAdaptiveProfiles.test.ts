import { describe, expect, it } from 'vitest';
import {
  BROWSER_TTS_BASE_PROFILE,
  resolveBrowserTtsAdaptiveProfile,
} from '../src/inputs/browserTts/browserTtsAdaptiveProfiles';

describe('resolveBrowserTtsAdaptiveProfile', () => {
  it('returns base profile for French, Portuguese, and unknown languages', () => {
    expect(resolveBrowserTtsAdaptiveProfile('fr')).toEqual(BROWSER_TTS_BASE_PROFILE);
    expect(resolveBrowserTtsAdaptiveProfile('pt')).toEqual(BROWSER_TTS_BASE_PROFILE);
    expect(resolveBrowserTtsAdaptiveProfile('it')).toEqual(BROWSER_TTS_BASE_PROFILE);
  });

  it('returns ES profile values', () => {
    const profile = resolveBrowserTtsAdaptiveProfile('es');
    expect(profile.supportRateFloor).toBe(0.82);
    expect(profile.extremeSupportRateFloor).toBe(0.78);
    expect(profile.balancedFlowFloor).toBe(0.84);
    expect(profile.supportRateCeiling).toBe(0.92);
    expect(profile.unsafeBoundaryMinPauseMs).toBe(1200);
    expect(profile.minRecommendedRate).toBe(0.86);
    expect(profile.recommendationCalibrationEnabled).toBe(true);
  });

  it('returns EN profile values', () => {
    const profile = resolveBrowserTtsAdaptiveProfile('en');
    expect(profile.supportRateFloor).toBe(0.82);
    expect(profile.extremeSupportRateFloor).toBe(0.78);
    expect(profile.balancedFlowFloor).toBe(0.84);
    expect(profile.supportRateCeiling).toBe(0.92);
    expect(profile.unsafeBoundaryMinPauseMs).toBe(1200);
    expect(profile.minRecommendedRate).toBe(0.84);
    expect(profile.recommendationCalibrationEnabled).toBe(false);
  });

  it('returns DE conservative profile values', () => {
    const profile = resolveBrowserTtsAdaptiveProfile('de');
    expect(profile.supportRateFloor).toBe(0.8);
    expect(profile.extremeSupportRateFloor).toBe(0.78);
    expect(profile.balancedFlowFloor).toBe(0.82);
    expect(profile.supportRateCeiling).toBe(0.9);
    expect(profile.unsafeBoundaryMinPauseMs).toBe(1200);
    expect(profile.minRecommendedRate).toBe(0.8);
    expect(profile.recommendationCalibrationEnabled).toBe(false);
    expect(profile.germanShortBias.enabled).toBe(true);
  });
});
