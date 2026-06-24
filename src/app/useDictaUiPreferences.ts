import { useEffect, useState } from 'react';
import type {
  MetricsLanguageView,
  MetricsRangeView,
} from '../core/liveMetrics';
import {
  DEFAULT_LEADERBOARD_SECTION_EXPANDED,
  type LeaderboardSectionId,
} from './leaderboardSections';
import {
  loadBrowserTtsSafePauseGateSettings,
  loadInsightsCollapsed,
  loadMetricsRangeView,
  loadOpenRouterDirectGenerationDurationMinutes,
  loadPersistedDictaLanguageView,
  persistBrowserTtsSafePauseGateSettings,
  persistDictaLanguageView,
  persistInsightsCollapsed,
  persistMetricsRangeView,
  persistOpenRouterDirectGenerationDurationMinutes,
} from './uiPreferenceStorage';

export function useDictaUiPreferences() {
  const [dictaLanguageView, setDictaLanguageView] = useState<MetricsLanguageView>(() =>
    loadPersistedDictaLanguageView(),
  );
  const metricsLanguageView = dictaLanguageView;
  const leaderboardLanguageView = dictaLanguageView;
  const adminLanguageView = dictaLanguageView;
  const setMetricsLanguageView = setDictaLanguageView;
  const setLeaderboardLanguageView = setDictaLanguageView;
  const setAdminLanguageView = setDictaLanguageView;

  const [insightsCollapsed, setInsightsCollapsed] = useState<boolean>(() => loadInsightsCollapsed());
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(true);
  const [leaderboardSectionExpanded, setLeaderboardSectionExpanded] = useState<Record<LeaderboardSectionId, boolean>>(
    () => ({ ...DEFAULT_LEADERBOARD_SECTION_EXPANDED }),
  );
  const [metricsRangeView, setMetricsRangeView] = useState<MetricsRangeView>(() => loadMetricsRangeView());
  const [browserTtsSafePauseGateSettings, setBrowserTtsSafePauseGateSettings] = useState(() =>
    loadBrowserTtsSafePauseGateSettings(),
  );
  const [openRouterDirectGenerationDurationMinutes, setOpenRouterDirectGenerationDurationMinutes] = useState(() =>
    loadOpenRouterDirectGenerationDurationMinutes(),
  );

  useEffect(() => {
    persistDictaLanguageView(dictaLanguageView);
  }, [dictaLanguageView]);

  useEffect(() => {
    persistMetricsRangeView(metricsRangeView);
  }, [metricsRangeView]);

  useEffect(() => {
    persistInsightsCollapsed(insightsCollapsed);
  }, [insightsCollapsed]);

  useEffect(() => {
    persistBrowserTtsSafePauseGateSettings(browserTtsSafePauseGateSettings);
  }, [browserTtsSafePauseGateSettings]);

  useEffect(() => {
    persistOpenRouterDirectGenerationDurationMinutes(openRouterDirectGenerationDurationMinutes);
  }, [openRouterDirectGenerationDurationMinutes]);

  return {
    dictaLanguageView,
    setDictaLanguageView,
    metricsLanguageView,
    leaderboardLanguageView,
    adminLanguageView,
    setMetricsLanguageView,
    setLeaderboardLanguageView,
    setAdminLanguageView,
    insightsCollapsed,
    setInsightsCollapsed,
    leaderboardExpanded,
    setLeaderboardExpanded,
    leaderboardSectionExpanded,
    setLeaderboardSectionExpanded,
    metricsRangeView,
    setMetricsRangeView,
    browserTtsSafePauseGateSettings,
    setBrowserTtsSafePauseGateSettings,
    openRouterDirectGenerationDurationMinutes,
    setOpenRouterDirectGenerationDurationMinutes,
  };
}
