import { isSupportedLanguage } from '../core/languages';
import type { MetricsLanguageView, MetricsRangeView } from '../core/liveMetrics';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../core/storage/safeLocalStorage';

const LIVE_METRICS_LANGUAGE_KEY = 'dicta.liveMetricsLanguage.v1';
const LIVE_METRICS_RANGE_KEY = 'dicta.liveMetricsRange.v1';
const INSIGHTS_COLLAPSED_KEY = 'dicta.insightsCollapsed.v1';
const LEADERBOARD_LANGUAGE_KEY = 'dicta.leaderboardLanguage.v1';
const ADMIN_LANGUAGE_KEY = 'dicta.adminLanguage.v1';

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
