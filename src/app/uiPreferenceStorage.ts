import { isSupportedLanguage } from '../core/languages';
import type { MetricsLanguageView, MetricsRangeView } from '../core/liveMetrics';

const LIVE_METRICS_LANGUAGE_KEY = 'dicta.liveMetricsLanguage.v1';
const LIVE_METRICS_RANGE_KEY = 'dicta.liveMetricsRange.v1';
const INSIGHTS_COLLAPSED_KEY = 'dicta.insightsCollapsed.v1';
const LEADERBOARD_LANGUAGE_KEY = 'dicta.leaderboardLanguage.v1';
const ADMIN_LANGUAGE_KEY = 'dicta.adminLanguage.v1';

const METRICS_RANGE_VALUES: MetricsRangeView[] = ['today', 'week', 'twoWeeks', 'threeWeeks', 'month'];

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadPersistedDictaLanguageView(): MetricsLanguageView {
  if (!canUseLocalStorage()) {
    return 'de';
  }

  const savedValues = [
    window.localStorage.getItem(LIVE_METRICS_LANGUAGE_KEY),
    window.localStorage.getItem(LEADERBOARD_LANGUAGE_KEY),
    window.localStorage.getItem(ADMIN_LANGUAGE_KEY),
  ];

  return savedValues.find(isSupportedLanguage) ?? 'de';
}

export function persistDictaLanguageView(languageView: MetricsLanguageView): void {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(LIVE_METRICS_LANGUAGE_KEY, languageView);
  window.localStorage.setItem(LEADERBOARD_LANGUAGE_KEY, languageView);
  window.localStorage.setItem(ADMIN_LANGUAGE_KEY, languageView);
}

export function loadMetricsRangeView(): MetricsRangeView {
  if (!canUseLocalStorage()) {
    return 'today';
  }

  const saved = window.localStorage.getItem(LIVE_METRICS_RANGE_KEY);
  return METRICS_RANGE_VALUES.includes(saved as MetricsRangeView) ? (saved as MetricsRangeView) : 'today';
}

export function persistMetricsRangeView(metricsRangeView: MetricsRangeView): void {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(LIVE_METRICS_RANGE_KEY, metricsRangeView);
}

export function loadInsightsCollapsed(): boolean {
  if (!canUseLocalStorage()) {
    return false;
  }

  return window.localStorage.getItem(INSIGHTS_COLLAPSED_KEY) === 'true';
}

export function persistInsightsCollapsed(insightsCollapsed: boolean): void {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(INSIGHTS_COLLAPSED_KEY, String(insightsCollapsed));
}
