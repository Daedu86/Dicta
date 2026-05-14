import { describe, expect, it } from 'vitest';
import { applyBrowserTtsMobilePacingFallback, applyBrowserTtsRuntimeRateFloor, isLikelyAndroidSpeechSynthesisRuntime } from '../src/inputs/browserTts/browserTtsRatePolicy';
import { resolveBrowserTtsAdaptiveProfile } from '../src/inputs/browserTts/browserTtsAdaptiveProfiles';
import type { PacingDecision } from '../src/core/adaptive/types';

describe('applyBrowserTtsRuntimeRateFloor', () => {
  const enProfile = resolveBrowserTtsAdaptiveProfile('en');
  const deProfile = resolveBrowserTtsAdaptiveProfile('de');

  it('enforces balanced and flow floor at 0.84', () => {
    expect(applyBrowserTtsRuntimeRateFloor({
      mode: 'balanced',
      requestedRate: 0.82,
      lagSec: 1.2,
      accuracy: 0.9,
      profile: enProfile,
    })).toBe(0.84);
    expect(applyBrowserTtsRuntimeRateFloor({
      mode: 'flow',
      requestedRate: 0.8,
      lagSec: 0.2,
      accuracy: 0.97,
      profile: enProfile,
    })).toBe(0.84);
  });

  it('enforces support floor at 0.82 for normal support', () => {
    expect(applyBrowserTtsRuntimeRateFloor({
      mode: 'support',
      requestedRate: 0.79,
      lagSec: 2.8,
      accuracy: 0.84,
      profile: enProfile,
    })).toBe(0.82);
  });

  it('enforces extreme support floor at 0.78', () => {
    expect(applyBrowserTtsRuntimeRateFloor({
      mode: 'support',
      requestedRate: 0.75,
      lagSec: 4.4,
      accuracy: 0.72,
      profile: enProfile,
    })).toBe(0.78);
  });

  it('caps support-needed rate at 0.92', () => {
    expect(applyBrowserTtsRuntimeRateFloor({
      mode: 'support',
      requestedRate: 1.0,
      lagSec: 2.3,
      accuracy: 0.83,
      supportNeeded: true,
      profile: enProfile,
    })).toBe(0.92);
  });

  it('uses conservative DE profile values', () => {
    expect(applyBrowserTtsRuntimeRateFloor({
      mode: 'balanced',
      requestedRate: 0.8,
      lagSec: 0.4,
      accuracy: 0.95,
      profile: deProfile,
    })).toBe(0.82);
    expect(applyBrowserTtsRuntimeRateFloor({
      mode: 'support',
      requestedRate: 1.0,
      lagSec: 2.5,
      accuracy: 0.8,
      supportNeeded: true,
      profile: deProfile,
    })).toBe(0.9);
  });
});

describe('applyBrowserTtsMobilePacingFallback', () => {
  const enProfile = resolveBrowserTtsAdaptiveProfile('en');
  const baseDecision: PacingDecision = {
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

  it('detects Android mobile speech synthesis runtimes such as Samsung S22 Chrome', () => {
    expect(isLikelyAndroidSpeechSynthesisRuntime({
      userAgent: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S901B) AppleWebKit/537.36 Chrome/123.0 Mobile Safari/537.36',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
    })).toBe(true);
  });

  it('leaves desktop browser TTS decisions unchanged', () => {
    const result = applyBrowserTtsMobilePacingFallback({
      decision: baseDecision,
      lagSec: 2.1,
      accuracy: 0.86,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0 Safari/537.36',
      platform: 'Win32',
      maxTouchPoints: 0,
      profile: enProfile,
    });

    expect(result.mobileFallbackApplied).toBe(false);
    expect(result.decision).toBe(baseDecision);
  });

  it('converts Android lag pressure into short chunks and audible pauses when speech rate may be ignored', () => {
    const result = applyBrowserTtsMobilePacingFallback({
      decision: baseDecision,
      lagSec: 2.1,
      accuracy: 0.86,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S901B) AppleWebKit/537.36 Chrome/123.0 Mobile Safari/537.36',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
      profile: enProfile,
    });

    expect(result.mobileFallbackApplied).toBe(true);
    expect(result.decision.nextPhraseSize).toBe('short');
    expect(result.decision.shouldPauseNow).toBe(true);
    expect(result.decision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(1600);
    expect(result.decision.playbackRate).toBeLessThanOrEqual(enProfile.supportRateCeiling);
    expect(result.decision.reason).toContain('android-speech-rate-fallback');
  });
});
