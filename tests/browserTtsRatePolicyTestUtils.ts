import { expect } from 'vitest';
import {
  applyBrowserTtsMobilePacingFallback,
  applyBrowserTtsRuntimeRateFloor,
  buildBrowserTtsControlLagSample,
  isLikelyAndroidSpeechSynthesisRuntime,
  type BrowserTtsControlLagSample,
} from '../src/inputs/browserTts/browserTtsRatePolicy';
import {
  resolveBrowserTtsAdaptiveProfile,
  type BrowserTtsAdaptiveProfile,
} from '../src/inputs/browserTts/browserTtsAdaptiveProfiles';
import type { PacingDecision } from '../src/core/adaptive/types';

export const EN_BROWSER_TTS_PROFILE = resolveBrowserTtsAdaptiveProfile('en');
export const DE_BROWSER_TTS_PROFILE = resolveBrowserTtsAdaptiveProfile('de');

export const ANDROID_SAMSUNG_S22_CHROME_RUNTIME = {
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S901B) AppleWebKit/537.36 Chrome/123.0 Mobile Safari/537.36',
  platform: 'Linux armv8l',
  maxTouchPoints: 5,
} as const;

export const WINDOWS_DESKTOP_CHROME_RUNTIME = {
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0 Safari/537.36',
  platform: 'Win32',
  maxTouchPoints: 0,
} as const;

export const BASE_BROWSER_TTS_PACING_DECISION: PacingDecision = {
  mode: 'balanced',
  playbackRate: 1,
  pauseAfterPhraseMs: 750,
  shouldPauseNow: false,
  shouldReplayPhrase: false,
  boundaryStrictness: 'sentence',
  allowMidPhrasePause: false,
  deferPauseUntilSafeBoundary: false,
  replayRate: 0.9,
  nextPhraseSize: 'medium',
  reason: 'mode=balanced',
  lagScore: 0.5,
  accuracyScore: 0.8,
  hesitationScore: 0.8,
  confidenceScore: 0.5,
};

type RuntimeRateFloorParams = Parameters<typeof applyBrowserTtsRuntimeRateFloor>[0];

type RuntimeRateFloorCase = Omit<RuntimeRateFloorParams, 'profile'> & {
  profile?: BrowserTtsAdaptiveProfile;
  expectedRate: number;
};

export function expectBrowserTtsRuntimeRateFloor({
  expectedRate,
  profile = EN_BROWSER_TTS_PROFILE,
  ...params
}: RuntimeRateFloorCase): void {
  expect(applyBrowserTtsRuntimeRateFloor({
    ...params,
    profile,
  })).toBe(expectedRate);
}

type ControlLagParams = Parameters<typeof buildBrowserTtsControlLagSample>[0];

type ControlLagSampleCase = ControlLagParams & {
  expected: BrowserTtsControlLagSample;
};

export function expectBrowserTtsControlLagSample({
  expected,
  ...params
}: ControlLagSampleCase): void {
  const sample = buildBrowserTtsControlLagSample(params);

  expect(sample.rawLagSec).toBeCloseTo(expected.rawLagSec, 6);
  expect(sample.stableLagSec).toBeCloseTo(expected.stableLagSec, 6);
  expect(sample.isOutlier).toBe(expected.isOutlier);
  expect(sample.usedFallbackControlLag).toBe(expected.usedFallbackControlLag);
}

type BrowserTtsRuntime = Parameters<typeof isLikelyAndroidSpeechSynthesisRuntime>[0];

export function expectAndroidSpeechSynthesisRuntime(
  runtime: BrowserTtsRuntime,
  expected: boolean,
): void {
  expect(isLikelyAndroidSpeechSynthesisRuntime(runtime)).toBe(expected);
}

type MobileFallbackParams = Parameters<typeof applyBrowserTtsMobilePacingFallback>[0];

type MobilePacingFallbackCase = Omit<MobileFallbackParams, 'decision' | 'profile'> & {
  decision?: PacingDecision;
  profile?: BrowserTtsAdaptiveProfile;
};

export function applyBrowserTtsMobileFallbackCase({
  decision = BASE_BROWSER_TTS_PACING_DECISION,
  profile = EN_BROWSER_TTS_PROFILE,
  ...params
}: MobilePacingFallbackCase) {
  return applyBrowserTtsMobilePacingFallback({
    decision,
    profile,
    ...params,
  });
}
