import { describe, expect, it } from 'vitest';
import {
  ANDROID_SAMSUNG_S22_CHROME_RUNTIME,
  BASE_BROWSER_TTS_PACING_DECISION,
  DE_BROWSER_TTS_PROFILE,
  EN_BROWSER_TTS_PROFILE,
  WINDOWS_DESKTOP_CHROME_RUNTIME,
  applyBrowserTtsMobileFallbackCase,
  expectAndroidSpeechSynthesisRuntime,
  expectBrowserTtsControlLagSample,
  expectBrowserTtsRuntimeRateFloor,
} from './browserTtsRatePolicyTestUtils';

describe('applyBrowserTtsRuntimeRateFloor', () => {
  it('enforces EN balanced and flow floor at 0.80', () => {
    expectBrowserTtsRuntimeRateFloor({
      mode: 'balanced',
      requestedRate: 0.78,
      lagSec: 1.2,
      accuracy: 0.9,
      expectedRate: 0.8,
    });
    expectBrowserTtsRuntimeRateFloor({
      mode: 'flow',
      requestedRate: 0.78,
      lagSec: 0.2,
      accuracy: 0.97,
      expectedRate: 0.8,
    });
  });

  it('enforces EN support floor at 0.78 for normal support', () => {
    expectBrowserTtsRuntimeRateFloor({
      mode: 'support',
      requestedRate: 0.76,
      lagSec: 2.8,
      accuracy: 0.84,
      expectedRate: 0.78,
    });
  });

  it('enforces EN extreme support floor at 0.74', () => {
    expectBrowserTtsRuntimeRateFloor({
      mode: 'support',
      requestedRate: 0.72,
      lagSec: 4.4,
      accuracy: 0.72,
      expectedRate: 0.74,
    });
  });

  it('caps EN support-needed rate at 0.88', () => {
    expectBrowserTtsRuntimeRateFloor({
      mode: 'support',
      requestedRate: 1.0,
      lagSec: 2.3,
      accuracy: 0.83,
      supportNeeded: true,
      expectedRate: 0.88,
    });
  });

  it('uses conservative DE profile values', () => {
    expectBrowserTtsRuntimeRateFloor({
      mode: 'balanced',
      requestedRate: 0.8,
      lagSec: 0.4,
      accuracy: 0.95,
      profile: DE_BROWSER_TTS_PROFILE,
      expectedRate: 0.82,
    });
    expectBrowserTtsRuntimeRateFloor({
      mode: 'support',
      requestedRate: 1.0,
      lagSec: 2.5,
      accuracy: 0.8,
      supportNeeded: true,
      profile: DE_BROWSER_TTS_PROFILE,
      expectedRate: 0.9,
    });
  });
});

describe('buildBrowserTtsControlLagSample', () => {
  it('keeps raw DE lag around 5 seconds diagnostic but avoids sentinel control lag', () => {
    expectBrowserTtsControlLagSample({
      rawLagSec: 5.3,
      language: 'de',
      previousValidControlLagSec: 1.2,
      expected: {
        rawLagSec: 5.3,
        stableLagSec: 4.99,
        isOutlier: true,
        usedFallbackControlLag: false,
      },
    });
  });

  it('falls back for extreme DE raw lag while preserving the diagnostic raw value', () => {
    expectBrowserTtsControlLagSample({
      rawLagSec: -36.48,
      language: 'de',
      previousValidControlLagSec: 1.4,
      expected: {
        rawLagSec: -36.48,
        stableLagSec: 1.4,
        isOutlier: true,
        usedFallbackControlLag: true,
      },
    });
  });

  it('uses neutral DE fallback when there is no prior valid control lag', () => {
    expectBrowserTtsControlLagSample({
      rawLagSec: 12.8,
      language: 'de',
      expected: {
        rawLagSec: 12.8,
        stableLagSec: 0,
        isOutlier: true,
        usedFallbackControlLag: true,
      },
    });
  });

  it('leaves non-DE lag stabilization unchanged', () => {
    for (const language of ['en', 'es', 'fr', 'pt'] as const) {
      expectBrowserTtsControlLagSample({
        rawLagSec: 24.16,
        language,
        previousValidControlLagSec: 1.4,
        expected: {
          rawLagSec: 24.16,
          stableLagSec: 5,
          isOutlier: true,
          usedFallbackControlLag: false,
        },
      });
    }
  });
});

describe('applyBrowserTtsMobilePacingFallback', () => {
  it('detects Android mobile speech synthesis runtimes such as Samsung S22 Chrome', () => {
    expectAndroidSpeechSynthesisRuntime(ANDROID_SAMSUNG_S22_CHROME_RUNTIME, true);
  });

  it('leaves desktop browser TTS decisions unchanged', () => {
    const result = applyBrowserTtsMobileFallbackCase({
      lagSec: 2.1,
      accuracy: 0.86,
      ...WINDOWS_DESKTOP_CHROME_RUNTIME,
    });

    expect(result.mobileFallbackApplied).toBe(false);
    expect(result.decision).toBe(BASE_BROWSER_TTS_PACING_DECISION);
  });

  it('converts Android lag pressure into short chunks and audible pauses when speech rate may be ignored', () => {
    const result = applyBrowserTtsMobileFallbackCase({
      lagSec: 2.1,
      accuracy: 0.86,
      ...ANDROID_SAMSUNG_S22_CHROME_RUNTIME,
    });

    expect(result.mobileFallbackApplied).toBe(true);
    expect(result.decision.nextPhraseSize).toBe('short');
    expect(result.decision.shouldPauseNow).toBe(true);
    expect(result.decision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(1600);
    expect(result.decision.playbackRate).toBeLessThanOrEqual(EN_BROWSER_TTS_PROFILE.supportRateCeiling);
    expect(result.decision.reason).toContain('android-speech-rate-fallback');
  });
});
