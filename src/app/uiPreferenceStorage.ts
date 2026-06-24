import { isSupportedLanguage } from '../core/languages';
import type { MetricsLanguageView, MetricsRangeView } from '../core/liveMetrics';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../core/storage/safeLocalStorage';
import {
  DEFAULT_BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS,
  type BrowserTtsSafePauseGateSettings,
} from './browserTtsNextChunkScheduler';
import {
  OPEN_ROUTER_DIRECT_GENERATION_DEFAULT_DURATION,
  OPEN_ROUTER_DIRECT_GENERATION_DURATION_OPTIONS,
} from './openRouterDirectGenerationPresets';
import type { OpenRouterDurationMinutes } from '../core/adaptive/openRouterGenerationPrompt';

const LIVE_METRICS_LANGUAGE_KEY = 'dicta.liveMetricsLanguage.v1';
const LIVE_METRICS_RANGE_KEY = 'dicta.liveMetricsRange.v1';
const INSIGHTS_COLLAPSED_KEY = 'dicta.insightsCollapsed.v1';
const LEADERBOARD_LANGUAGE_KEY = 'dicta.leaderboardLanguage.v1';
const ADMIN_LANGUAGE_KEY = 'dicta.adminLanguage.v1';
const BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS_KEY = 'dicta.browserTtsSafePauseGateSettings.v1';
const OPEN_ROUTER_DIRECT_GENERATION_DURATION_KEY = 'dicta.openRouterDirectGenerationDuration.v1';

const METRICS_RANGE_VALUES: MetricsRangeView[] = ['today', 'tenDays', 'twentyDays'];

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadPersistedDictaLanguageView(): MetricsLanguageView {
  if (!canUseLocalStorage()) {
    return 'de';
  }

  const savedValues = [
    safeGetLocalStorageItem(LIVE_METRICS_LANGUAGE_KEY),
    safeGetLocalStorageItem(LEADERBOARD_LANGUAGE_KEY),
    safeGetLocalStorageItem(ADMIN_LANGUAGE_KEY),
  ];

  return savedValues.find(isSupportedLanguage) ?? 'de';
}

export function persistDictaLanguageView(languageView: MetricsLanguageView): void {
  if (!canUseLocalStorage()) {
    return;
  }

  safeSetLocalStorageItem(LIVE_METRICS_LANGUAGE_KEY, languageView);
  safeSetLocalStorageItem(LEADERBOARD_LANGUAGE_KEY, languageView);
  safeSetLocalStorageItem(ADMIN_LANGUAGE_KEY, languageView);
}

export function loadMetricsRangeView(): MetricsRangeView {
  if (!canUseLocalStorage()) {
    return 'today';
  }

  const saved = safeGetLocalStorageItem(LIVE_METRICS_RANGE_KEY);
  if (METRICS_RANGE_VALUES.includes(saved as MetricsRangeView)) return saved as MetricsRangeView;
  if (saved === 'week' || saved === 'twoWeeks') return 'tenDays';
  if (saved === 'threeWeeks' || saved === 'month') return 'twentyDays';
  return 'today';
}

export function persistMetricsRangeView(metricsRangeView: MetricsRangeView): void {
  if (!canUseLocalStorage()) {
    return;
  }

  safeSetLocalStorageItem(LIVE_METRICS_RANGE_KEY, metricsRangeView);
}

export function loadInsightsCollapsed(): boolean {
  if (!canUseLocalStorage()) {
    return false;
  }

  return safeGetLocalStorageItem(INSIGHTS_COLLAPSED_KEY) === 'true';
}

export function persistInsightsCollapsed(insightsCollapsed: boolean): void {
  if (!canUseLocalStorage()) {
    return;
  }

  safeSetLocalStorageItem(INSIGHTS_COLLAPSED_KEY, String(insightsCollapsed));
}

export function loadBrowserTtsSafePauseGateSettings(): BrowserTtsSafePauseGateSettings {
  if (!canUseLocalStorage()) {
    return DEFAULT_BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS;
  }

  const raw = safeGetLocalStorageItem(BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS_KEY);
  if (!raw) return DEFAULT_BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS;

  try {
    return normalizeBrowserTtsSafePauseGateSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS;
  }
}

export function persistBrowserTtsSafePauseGateSettings(settings: BrowserTtsSafePauseGateSettings): void {
  if (!canUseLocalStorage()) {
    return;
  }

  safeSetLocalStorageItem(
    BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS_KEY,
    JSON.stringify(normalizeBrowserTtsSafePauseGateSettings(settings)),
  );
}

export function loadOpenRouterDirectGenerationDurationMinutes(): OpenRouterDurationMinutes {
  if (!canUseLocalStorage()) {
    return OPEN_ROUTER_DIRECT_GENERATION_DEFAULT_DURATION;
  }

  return normalizeOpenRouterDirectGenerationDurationMinutes(
    safeGetLocalStorageItem(OPEN_ROUTER_DIRECT_GENERATION_DURATION_KEY),
  );
}

export function persistOpenRouterDirectGenerationDurationMinutes(durationMinutes: OpenRouterDurationMinutes): void {
  if (!canUseLocalStorage()) {
    return;
  }

  safeSetLocalStorageItem(
    OPEN_ROUTER_DIRECT_GENERATION_DURATION_KEY,
    String(normalizeOpenRouterDirectGenerationDurationMinutes(durationMinutes)),
  );
}

function normalizeBrowserTtsSafePauseGateSettings(value: unknown): BrowserTtsSafePauseGateSettings {
  const source = value && typeof value === 'object'
    ? value as Partial<BrowserTtsSafePauseGateSettings>
    : {};
  const completionGateMaxWaitMs = normalizeDelayMs(
    source.completionGateMaxWaitMs,
    DEFAULT_BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS.completionGateMaxWaitMs,
  );
  const minimumMentalRestMs = Math.min(
    completionGateMaxWaitMs,
    normalizeDelayMs(
      source.minimumMentalRestMs,
      DEFAULT_BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS.minimumMentalRestMs,
      { allowZero: true },
    ),
  );

  return {
    minimumMentalRestMs,
    completionGateMaxWaitMs,
  };
}

function normalizeDelayMs(
  value: unknown,
  fallback: number,
  options: { allowZero?: boolean } = {},
): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  const rounded = Math.round(numeric);
  if (!Number.isFinite(rounded)) return fallback;
  if (rounded > 0) return rounded;
  return options.allowZero && rounded === 0 ? 0 : fallback;
}

function normalizeOpenRouterDirectGenerationDurationMinutes(value: unknown): OpenRouterDurationMinutes {
  const numeric = typeof value === 'number' ? value : Number(value);
  const rounded = Math.round(numeric);
  return OPEN_ROUTER_DIRECT_GENERATION_DURATION_OPTIONS.includes(rounded as OpenRouterDurationMinutes)
    ? rounded as OpenRouterDurationMinutes
    : OPEN_ROUTER_DIRECT_GENERATION_DEFAULT_DURATION;
}
