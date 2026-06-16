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
    expect(profile.supportRateFloor).toBe(0.7);
    expect(profile.extremeSupportRateFloor).toBe(0.7);
    expect(profile.balancedFlowFloor).toBe(0.7);
    expect(profile.supportRateCeiling).toBe(0.95);
    expect(profile.unsafeBoundaryMinPauseMs).toBe(1800);
    expect(profile.minRecommendedRate).toBe(0.7);
    expect(profile.recommendationCalibrationEnabled).toBe(true);
    expect(profile.adaptivePause.minPauseMs).toBe(1800);
    expect(profile.adaptivePause.maxPauseMs).toBe(3600);
  });

  it('returns EN listening-first profile values with expanded pause/rate windows', () => {
    const profile = resolveBrowserTtsAdaptiveProfile('en');
    expect(profile.supportRateFloor).toBe(0.7);
    expect(profile.extremeSupportRateFloor).toBe(0.7);
    expect(profile.balancedFlowFloor).toBe(0.7);
    expect(profile.supportRateCeiling).toBe(0.92);
    expect(profile.unsafeBoundaryMinPauseMs).toBe(1800);
    expect(profile.minRecommendedRate).toBe(0.7);
    expect(profile.recommendationCalibrationEnabled).toBe(false);
    expect(profile.sessionWarmup.enabled).toBe(true);
    expect(profile.sessionWarmup.playbackRate).toBe(0.72);
    expect(profile.sessionWarmup.pauseMs).toBe(2400);
    expect(profile.adaptivePause.minPauseMs).toBe(1800);
    expect(profile.adaptivePause.maxPauseMs).toBe(3600);
  });

  it('returns DE conservative profile values inside the expanded global window', () => {
    const profile = resolveBrowserTtsAdaptiveProfile('de');
    expect(profile.supportRateFloor).toBe(0.7);
    expect(profile.extremeSupportRateFloor).toBe(0.7);
    expect(profile.balancedFlowFloor).toBe(0.7);
    expect(profile.supportRateCeiling).toBe(0.9);
    expect(profile.unsafeBoundaryMinPauseMs).toBe(1800);
    expect(profile.minRecommendedRate).toBe(0.7);
    expect(profile.recommendationCalibrationEnabled).toBe(false);
    expect(profile.adaptivePause.minPauseMs).toBe(1800);
    expect(profile.adaptivePause.maxPauseMs).toBe(3600);
    expect(profile.germanShortBias.enabled).toBe(true);
  });
});
