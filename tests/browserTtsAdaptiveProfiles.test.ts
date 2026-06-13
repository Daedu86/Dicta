import { describe, expect, it } from 'vitest';
import { SUPPORTED_LANGUAGES } from '../src/core/languages';
import {
  BROWSER_TTS_BASE_PROFILE,
  BROWSER_TTS_FR_PROFILE,
  BROWSER_TTS_LANGUAGE_PROFILES,
  BROWSER_TTS_PT_PROFILE,
  resolveBrowserTtsAdaptiveProfile,
} from '../src/inputs/browserTts/browserTtsAdaptiveProfiles';

describe('resolveBrowserTtsAdaptiveProfile', () => {
  it('defines an explicit profile for every supported language', () => {
    expect(Object.keys(BROWSER_TTS_LANGUAGE_PROFILES).sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
  });

  it('returns explicit base-equivalent profiles for French and Portuguese', () => {
    expect(resolveBrowserTtsAdaptiveProfile('fr')).toBe(BROWSER_TTS_FR_PROFILE);
    expect(resolveBrowserTtsAdaptiveProfile('pt')).toBe(BROWSER_TTS_PT_PROFILE);
    expect(BROWSER_TTS_FR_PROFILE).toEqual(BROWSER_TTS_BASE_PROFILE);
    expect(BROWSER_TTS_PT_PROFILE).toEqual(BROWSER_TTS_BASE_PROFILE);
  });

  it('returns base profile for unknown languages', () => {
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

  it('returns EN conservative listening-first profile values', () => {
    const profile = resolveBrowserTtsAdaptiveProfile('en');
    expect(profile.supportRateFloor).toBe(0.78);
    expect(profile.extremeSupportRateFloor).toBe(0.74);
    expect(profile.balancedFlowFloor).toBe(0.8);
    expect(profile.supportRateCeiling).toBe(0.88);
    expect(profile.unsafeBoundaryMinPauseMs).toBe(1200);
    expect(profile.minRecommendedRate).toBe(0.78);
    expect(profile.recommendationCalibrationEnabled).toBe(false);
    expect(profile.sessionWarmup.enabled).toBe(true);
    expect(profile.adaptivePause.maxPauseMs).toBe(3200);
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
