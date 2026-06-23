import type { useAdminWorkspaceProps } from './useAdminWorkspaceProps';
import type { useOpenRouterWorkspaceProps } from './useOpenRouterWorkspaceProps';

export type OpenRouterWorkspacePropsArgs = Parameters<typeof useOpenRouterWorkspaceProps>[0];
export type AdminWorkspacePropsArgs = Parameters<typeof useAdminWorkspaceProps>[0];

export type UseWorkspacePanelPropsRuntimeArgs = {
  effectiveOpenRouterDefaultModel: OpenRouterWorkspacePropsArgs['defaultModel'];
  assignedOpenRouterModel: OpenRouterWorkspacePropsArgs['assignedModel'];
  getAuthHeaders: OpenRouterWorkspacePropsArgs['getAuthHeaders'];
  setOpenRouterDefaultModel: OpenRouterWorkspacePropsArgs['setOpenRouterDefaultModel'];
  openRouterModels: OpenRouterWorkspacePropsArgs['models'];
  openRouterStatus: OpenRouterWorkspacePropsArgs['status'];
  openRouterError: OpenRouterWorkspacePropsArgs['error'];
  refreshOpenRouterModels: OpenRouterWorkspacePropsArgs['onRefreshModels'];
  showLeaderboardWorkspace: OpenRouterWorkspacePropsArgs['onBackToTraining'];
  showAdminWorkspace: AdminWorkspacePropsArgs['onOpenOverview'];
  showOpenRouterWorkspace: AdminWorkspacePropsArgs['onOpenOpenRouter'];

  sessions: OpenRouterWorkspacePropsArgs['sessions'];
  adaptiveBenchmarksByInputLanguage: OpenRouterWorkspacePropsArgs['benchmarks'];
  adaptiveSessionFeedbackByInputLanguage: OpenRouterWorkspacePropsArgs['sessionFeedbackByInputLanguage'];
  recentDictationSessionHints: OpenRouterWorkspacePropsArgs['recentDictationSessionHints'];
  selectedBenchmarkInputMode: OpenRouterWorkspacePropsArgs['defaultGenerateInputMode'];
  selectedBenchmarkLanguage: OpenRouterWorkspacePropsArgs['defaultGenerateLanguage'];
  directGenerationDurationMinutes: OpenRouterWorkspacePropsArgs['directGenerationDurationMinutes'];
  setDirectGenerationDurationMinutes: OpenRouterWorkspacePropsArgs['onChangeDirectGenerationDurationMinutes'];
  isOnline: OpenRouterWorkspacePropsArgs['isOnline'];
  openRouterOfflineTitle: OpenRouterWorkspacePropsArgs['openRouterOfflineTitle'];
  adaptiveOpenRouterBusy: OpenRouterWorkspacePropsArgs['adaptiveOpenRouterBusy'];
  topicOpenRouterBusy: OpenRouterWorkspacePropsArgs['topicOpenRouterBusy'];
  generateAdaptiveNextSessionFromOpenRouter: OpenRouterWorkspacePropsArgs['onGenerateAdaptiveDirectSession'];
  generateTopicNextSessionFromOpenRouter: OpenRouterWorkspacePropsArgs['onGenerateTopicDirectSession'];
  openRouterGenerateFocusRequest: OpenRouterWorkspacePropsArgs['focusGenerateRequest'];
  activeOpenRouterJobs: OpenRouterWorkspacePropsArgs['activeJobs'];
  openRouterJobNotifications: OpenRouterWorkspacePropsArgs['jobNotifications'];
  trainingGenerationNowMs: OpenRouterWorkspacePropsArgs['generationNowMs'];
  trackOpenRouterJob: OpenRouterWorkspacePropsArgs['onTrackJob'];
  createOpenRouterErrorSession: OpenRouterWorkspacePropsArgs['onCreateGenerationErrorSession'];

  adminSessions: AdminWorkspacePropsArgs['sessions'];
  adminStorageSummary: AdminWorkspacePropsArgs['summary'];
  adminFileInventory: AdminWorkspacePropsArgs['fileInventory'];
  adminFileInventoryError: AdminWorkspacePropsArgs['fileInventoryError'];
  exportMessage: AdminWorkspacePropsArgs['exportMessage'];
  supabaseSyncStatus: AdminWorkspacePropsArgs['syncStatus'];
  adminLanguageView: AdminWorkspacePropsArgs['languageView'];
  setAdminLanguageView: AdminWorkspacePropsArgs['onChangeLanguage'];
  importDictaLocalStorageSnapshot: AdminWorkspacePropsArgs['onImportLocalStorage'];
  appProfile: AdminWorkspacePropsArgs['appProfile'];
  visibleProfiles: AdminWorkspacePropsArgs['visibleProfiles'];
  adminProfileSessionCounts: AdminWorkspacePropsArgs['profileSessionCounts'];
  adminProfileFilter: AdminWorkspacePropsArgs['selectedProfileFilter'];
  setAdminProfileFilter: AdminWorkspacePropsArgs['onChangeProfileFilter'];
  updateAdminProfileAccess: AdminWorkspacePropsArgs['onUpdateProfileAccess'];
  adminRemoteStatus: AdminWorkspacePropsArgs['remoteAdminStatus'];
  setExportMessage: AdminWorkspacePropsArgs['setExportMessage'];
};
