import { describe, expect, it } from 'vitest';

import {
  DEFAULT_BROWSER_TTS_PLAYBACK_PAUSE_PROFILE,
  normalizeBrowserTtsPlaybackPauseProfile,
  resolveBrowserTtsPlaybackPauseMs,
} from '../src/app/browserTtsPlaybackLoopPauseModel';

describe('browserTtsPlaybackLoopPauseModel', () => {
  it('maps V3 pause classes to separate runtime pause buckets', () => {
    expect(resolveBrowserTtsPlaybackPauseMs({ pauseClass: 'none' })).toEqual({
      pauseClass: 'none',
      pauseMs: 0,
      source: 'v3-prosody',
    });

    expect(resolveBrowserTtsPlaybackPauseMs({ pauseClass: 'micro' }).pauseMs).toBe(
      DEFAULT_BROWSER_TTS_PLAYBACK_PAUSE_PROFILE.microPauseMs,
    );
    expect(resolveBrowserTtsPlaybackPauseMs({ pauseClass: 'boundary' }).pauseMs).toBe(
      DEFAULT_BROWSER_TTS_PLAYBACK_PAUSE_PROFILE.boundaryPauseMs,
    );
    expect(resolveBrowserTtsPlaybackPauseMs({ pauseClass: 'sentence' }).pauseMs).toBe(
      DEFAULT_BROWSER_TTS_PLAYBACK_PAUSE_PROFILE.sentencePauseMs,
    );
    expect(resolveBrowserTtsPlaybackPauseMs({ pauseClass: 'recovery' }).pauseMs).toBe(
      DEFAULT_BROWSER_TTS_PLAYBACK_PAUSE_PROFILE.recoveryPauseMs,
    );
  });

  it('clamps custom pause profiles to the listening-safe envelope', () => {
    expect(
      normalizeBrowserTtsPlaybackPauseProfile({
        microPauseMs: 10,
        boundaryPauseMs: 10_000,
        sentencePauseMs: Number.NaN,
        recoveryPauseMs: 999_999,
      }),
    ).toEqual({
      microPauseMs: 180,
      boundaryPauseMs: 700,
      sentencePauseMs: 700,
      recoveryPauseMs: 2200,
    });
  });

  it('keeps legacy fallback pause behavior when V3 prosody is not available', () => {
    expect(resolveBrowserTtsPlaybackPauseMs({ fallbackPauseMs: 333 })).toEqual({
      pauseClass: 'boundary',
      pauseMs: 333,
      source: 'fallback',
    });

    expect(resolveBrowserTtsPlaybackPauseMs({ fallbackPauseMs: -10 })).toEqual({
      pauseClass: 'none',
      pauseMs: 0,
      source: 'none',
    });
  });
});
