export type BrowserTtsPlaybackPauseClass = 'none' | 'micro' | 'boundary' | 'sentence' | 'recovery';

export interface BrowserTtsPlaybackPauseProfile {
  microPauseMs: number;
  boundaryPauseMs: number;
  sentencePauseMs: number;
  recoveryPauseMs: number;
}

export interface BrowserTtsPlaybackPauseSource {
  pauseClass?: BrowserTtsPlaybackPauseClass;
  fallbackPauseMs?: number;
  controllerPauseMs?: number;
  extendWithControllerPause?: boolean;
}

export interface BrowserTtsPlaybackPauseResolution {
  pauseClass: BrowserTtsPlaybackPauseClass;
  pauseMs: number;
  source: 'v3-prosody' | 'fallback' | 'none';
}

export const DEFAULT_BROWSER_TTS_PLAYBACK_PAUSE_PROFILE: BrowserTtsPlaybackPauseProfile = {
  microPauseMs: 500,
  boundaryPauseMs: 900,
  sentencePauseMs: 1400,
  recoveryPauseMs: 2600,
};

export const MIN_BROWSER_TTS_CHUNK_PAUSE_MS = 500;
export const MAX_BROWSER_TTS_CHUNK_PAUSE_MS = 4000;

const PAUSE_LIMITS: Record<keyof BrowserTtsPlaybackPauseProfile, { min: number; max: number }> = {
  microPauseMs: { min: MIN_BROWSER_TTS_CHUNK_PAUSE_MS, max: MAX_BROWSER_TTS_CHUNK_PAUSE_MS },
  boundaryPauseMs: { min: MIN_BROWSER_TTS_CHUNK_PAUSE_MS, max: MAX_BROWSER_TTS_CHUNK_PAUSE_MS },
  sentencePauseMs: { min: MIN_BROWSER_TTS_CHUNK_PAUSE_MS, max: MAX_BROWSER_TTS_CHUNK_PAUSE_MS },
  recoveryPauseMs: { min: MIN_BROWSER_TTS_CHUNK_PAUSE_MS, max: MAX_BROWSER_TTS_CHUNK_PAUSE_MS },
};

function clampPauseMs(value: number, limit: { min: number; max: number }): number {
  if (!Number.isFinite(value)) {
    return limit.min;
  }

  return Math.min(limit.max, Math.max(limit.min, Math.round(value)));
}

export function normalizeBrowserTtsPlaybackPauseProfile(
  profile: Partial<BrowserTtsPlaybackPauseProfile> = {},
): BrowserTtsPlaybackPauseProfile {
  const merged = {
    ...DEFAULT_BROWSER_TTS_PLAYBACK_PAUSE_PROFILE,
    ...profile,
  };

  return {
    microPauseMs: clampPauseMs(merged.microPauseMs, PAUSE_LIMITS.microPauseMs),
    boundaryPauseMs: clampPauseMs(merged.boundaryPauseMs, PAUSE_LIMITS.boundaryPauseMs),
    sentencePauseMs: clampPauseMs(merged.sentencePauseMs, PAUSE_LIMITS.sentencePauseMs),
    recoveryPauseMs: clampPauseMs(merged.recoveryPauseMs, PAUSE_LIMITS.recoveryPauseMs),
  };
}

export function resolveBrowserTtsPlaybackPauseMs(
  source: BrowserTtsPlaybackPauseSource,
  profile?: Partial<BrowserTtsPlaybackPauseProfile>,
): BrowserTtsPlaybackPauseResolution {
  const normalizedProfile = normalizeBrowserTtsPlaybackPauseProfile(profile);
  const controllerPauseMs = clampOptionalPauseMs(source.controllerPauseMs);

  const withControllerPause = (
    pauseClass: BrowserTtsPlaybackPauseClass,
    pauseMs: number,
    resolutionSource: BrowserTtsPlaybackPauseResolution['source'],
  ): BrowserTtsPlaybackPauseResolution => ({
    pauseClass,
    pauseMs: source.extendWithControllerPause
      ? Math.max(pauseMs, controllerPauseMs)
      : pauseMs,
    source: resolutionSource,
  });

  switch (source.pauseClass) {
    case 'none':
      return { pauseClass: 'none', pauseMs: 0, source: 'v3-prosody' };
    case 'micro':
      return withControllerPause('micro', normalizedProfile.microPauseMs, 'v3-prosody');
    case 'boundary':
      return withControllerPause('boundary', normalizedProfile.boundaryPauseMs, 'v3-prosody');
    case 'sentence':
      return withControllerPause('sentence', normalizedProfile.sentencePauseMs, 'v3-prosody');
    case 'recovery':
      return withControllerPause('recovery', normalizedProfile.recoveryPauseMs, 'v3-prosody');
    default: {
      const fallbackPauseMs = clampOptionalPauseMs(source.fallbackPauseMs);
      return {
        pauseClass: fallbackPauseMs > 0 ? 'boundary' : 'none',
        pauseMs: fallbackPauseMs,
        source: fallbackPauseMs > 0 ? 'fallback' : 'none',
      };
    }
  }
}

function clampOptionalPauseMs(value: number | undefined): number {
  const rounded = Math.round(value ?? 0);
  if (!Number.isFinite(rounded) || rounded <= 0) return 0;
  return Math.min(MAX_BROWSER_TTS_CHUNK_PAUSE_MS, Math.max(MIN_BROWSER_TTS_CHUNK_PAUSE_MS, rounded));
}
