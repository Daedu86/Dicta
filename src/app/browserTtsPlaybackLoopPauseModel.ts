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
}

export interface BrowserTtsPlaybackPauseResolution {
  pauseClass: BrowserTtsPlaybackPauseClass;
  pauseMs: number;
  source: 'v3-prosody' | 'fallback' | 'none';
}

export const DEFAULT_BROWSER_TTS_PLAYBACK_PAUSE_PROFILE: BrowserTtsPlaybackPauseProfile = {
  microPauseMs: 220,
  boundaryPauseMs: 520,
  sentencePauseMs: 900,
  recoveryPauseMs: 1400,
};

const PAUSE_LIMITS: Record<keyof BrowserTtsPlaybackPauseProfile, { min: number; max: number }> = {
  microPauseMs: { min: 180, max: 250 },
  boundaryPauseMs: { min: 350, max: 700 },
  sentencePauseMs: { min: 700, max: 1400 },
  recoveryPauseMs: { min: 1200, max: 2200 },
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

  switch (source.pauseClass) {
    case 'none':
      return { pauseClass: 'none', pauseMs: 0, source: 'v3-prosody' };
    case 'micro':
      return { pauseClass: 'micro', pauseMs: normalizedProfile.microPauseMs, source: 'v3-prosody' };
    case 'boundary':
      return { pauseClass: 'boundary', pauseMs: normalizedProfile.boundaryPauseMs, source: 'v3-prosody' };
    case 'sentence':
      return { pauseClass: 'sentence', pauseMs: normalizedProfile.sentencePauseMs, source: 'v3-prosody' };
    case 'recovery':
      return { pauseClass: 'recovery', pauseMs: normalizedProfile.recoveryPauseMs, source: 'v3-prosody' };
    default: {
      const fallbackPauseMs = Math.max(0, Math.round(source.fallbackPauseMs ?? 0));
      return {
        pauseClass: fallbackPauseMs > 0 ? 'boundary' : 'none',
        pauseMs: fallbackPauseMs,
        source: fallbackPauseMs > 0 ? 'fallback' : 'none',
      };
    }
  }
}
