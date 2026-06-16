import { normalizeBenchmarkLanguage } from './adaptiveBenchmarkLanguage';

export const BROWSER_TTS_DE_MAX_RATE_MARGIN = 0.01;
export const BROWSER_TTS_DE_MIN_CONFIDENT_SAMPLES = 30;
export const BROWSER_TTS_DE_RAW_LAG_MIN_SEC = -2;
export const BROWSER_TTS_DE_RAW_LAG_MAX_SEC = 8;
export const BROWSER_TTS_DE_LOW_CONFIDENCE_RATE_RANGE: [number, number] = [0.95, 1];
export const BROWSER_TTS_DE_CONSERVATIVE_PAUSE_MS = 1200;
export const BROWSER_TTS_DE_RECENT_PRESSURE_SAMPLE_COUNT = 5;
export const BROWSER_TTS_DE_CLEAN_RECENT_MIN_COUNT = 3;
export const BROWSER_TTS_DE_CLEAN_RECENT_MIN_ACCURACY = 0.84;
export const BROWSER_TTS_DE_CLEAN_RECENT_MAX_ABS_LAG_SEC = 2;
export const BROWSER_TTS_DE_PRESSURE_TIMELINE_WINDOW = 60;

export function isBrowserTtsDe(inputMode: string | null | undefined, language?: string | null): boolean {
  return inputMode === 'browser-tts' && normalizeBenchmarkLanguage(language).toLowerCase() === 'de';
}

export function normalizeAccuracy(value: number): number {
  return value > 1 ? clamp01(value / 100) : clamp01(value);
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
