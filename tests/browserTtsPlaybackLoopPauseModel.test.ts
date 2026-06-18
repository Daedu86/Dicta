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
      microPauseMs: 500,
      boundaryPauseMs: 4000,
      sentencePauseMs: 500,
      recoveryPauseMs: 4000,
    });
  });

  it('clamps legacy fallback pauses into the perceptible chunk-pause envelope', () => {
    expect(resolveBrowserTtsPlaybackPauseMs({ fallbackPauseMs: 333 })).toEqual({
      pauseClass: 'boundary',
      pauseMs: 500,
      source: 'fallback',
    });

    expect(resolveBrowserTtsPlaybackPauseMs({ fallbackPauseMs: -10 })).toEqual({
      pauseClass: 'none',
      pauseMs: 0,
      source: 'none',
    });
  });

  it('does not let a V3 pause bucket shorten support or recovery controller pauses', () => {
    expect(
      resolveBrowserTtsPlaybackPauseMs({
        pauseClass: 'boundary',
        controllerPauseMs: 3200,
        extendWithControllerPause: true,
      }),
    ).toEqual({
      pauseClass: 'boundary',
      pauseMs: 3200,
      source: 'v3-prosody',
    });
  });
});
