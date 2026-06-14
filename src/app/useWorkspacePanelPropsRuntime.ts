import { useOpenRouterWorkspaceProps } from './useOpenRouterWorkspaceProps';
import { useAdminWorkspaceProps } from './useAdminWorkspaceProps';
import { useLeaderboardWorkspaceProps } from './useLeaderboardWorkspaceProps';
import {
  buildSessionPointsHelpText,
  computeSessionMaxPoints,
  formatSessionPointsForSession,
} from '../core/evaluation';
import { buildSessionScoreHelpText } from '../core/sessionScore';
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
} from '../core/languages';
import { Metric } from '../components/shared/Metric';
import { SessionDeviceIcon } from '../components/shared/SessionDeviceIcon';
import { formatSessionGenerationOrigin } from './sessionDisplayFormatters';
import { formatSessionDate } from './sessionDateFormatters';
import { formatLeaderboardSessionStatus } from './sessionLeaderboardFormatters';
import { formatSessionPlaybackDuration } from './sessionPlaybackDuration';
import { getSessionDisplayTitle } from './sessionDisplayTitle';
import { isSessionReadyForTraining } from './sessionTrainingReadiness';

type OpenRouterWorkspacePropsArgs = Parameters<typeof useOpenRouterWorkspaceProps>[0];
type AdminWorkspacePropsArgs = Parameters<typeof useAdminWorkspaceProps>[0];
type LeaderboardWorkspacePropsArgs = Parameters<typeof useLeaderboardWorkspaceProps>[0];

type UseWorkspacePanelPropsRuntimeArgs = {
  effectiveOpenRouterDefaultModel: OpenRouterWorkspacePropsArgs['defaultModel'];
  assignedOpenRouterModel: OpenRouterWorkspacePropsArgs['assignedModel'];
  getAuthHeaders: OpenRouterWorkspacePropsArgs['getAuthHeaders'];
  setOpenRouterDefaultModel: OpenRouterWorkspacePropsArgs['setOpenRouterDefaultModel'];
  openRouterModels: OpenRouterWorkspacePropsArgs['models'];
  openRouterStatus: OpenRouterWorkspacePropsArgs['status'];
  openRouterError: OpenRouterWorkspacePropsArgs['error'];
  refreshOpenRouterModels: OpenRouterWorkspacePropsArgs['onRefreshModels'];
  showLeaderboardWorkspace: OpenRouterWorkspacePropsArgs['onBackToTraining'];

  selectedBenchmarkProfile: OpenRouterWorkspacePropsArgs['exportProfile'];
  selectedSessionFeedback: OpenRouterWorkspacePropsArgs['exportSessionFeedback'];
  getBenchmarkActiveSessionStatus: OpenRouterWorkspacePropsArgs['getBenchmarkActiveSessionStatus'];
  adaptiveBenchmarksByInputLanguage: OpenRouterWorkspacePropsArgs['benchmarks'];
  adaptiveSessionFeedbackByInputLanguage: OpenRouterWorkspacePropsArgs['sessionFeedbackByInputLanguage'];
  setSelectedBenchmarkInputMode: OpenRouterWorkspacePropsArgs['setSelectedBenchmarkInputMode'];
  setSelectedBenchmarkLanguage: OpenRouterWorkspacePropsArgs['setSelectedBenchmarkLanguage'];
  setBenchmarkExportMessage: OpenRouterWorkspacePropsArgs['setBenchmarkExportMessage'];
  setSessionFeedbackMessage: OpenRouterWorkspacePropsArgs['setSessionFeedbackMessage'];
  selectedBenchmarkInputMode: OpenRouterWorkspacePropsArgs['defaultGenerateInputMode'];
  selectedBenchmarkLanguage: OpenRouterWorkspacePropsArgs['defaultGenerateLanguage'];
  openRouterGenerateFocusRequest: OpenRouterWorkspacePropsArgs['focusGenerateRequest'];
  activeOpenRouterJobs: OpenRouterWorkspacePropsArgs['activeJobs'];
  openRouterJobNotifications: OpenRouterWorkspacePropsArgs['jobNotifications'];
  trainingGenerationNowMs: OpenRouterWorkspacePropsArgs['generationNowMs'];
  trackOpenRouterJob: OpenRouterWorkspacePropsArgs['onTrackJob'];
  createOpenRouterErrorSession: OpenRouterWorkspacePropsArgs['onCreateGenerationErrorSession'];
  copySelectedBenchmarkJson: OpenRouterWorkspacePropsArgs['onCopyBenchmark'];
  downloadSelectedBenchmarkJson: OpenRouterWorkspacePropsArgs['onExportBenchmark'];
  copyBenchmarkWithDictationScriptPrompt: OpenRouterWorkspacePropsArgs['onCopyBenchmarkWithScriptPrompt'];
  copyBenchmarkFeedbackPrompt: OpenRouterWorkspacePropsArgs['onCopyBenchmarkFeedbackPrompt'];
  copyBenchmarkFeedbackJson: OpenRouterWorkspacePropsArgs['onCopyBenchmarkFeedback'];
  copySessionFeedbackJson: OpenRouterWorkspacePropsArgs['onCopySessionFeedback'];
  copyDictationScriptPrompt: OpenRouterWorkspacePropsArgs['onCopyScriptPrompt'];
  copyDictationScriptTemplate: OpenRouterWorkspacePropsArgs['onCopyScriptTemplate'];
  copyBenchmarkFeedbackPromptWithHumanFeedback: OpenRouterWorkspacePropsArgs['onCopyBenchmarkFeedbackPromptWithHumanFeedback'];

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

  leaderboard: LeaderboardWorkspacePropsArgs['leaderboard'];
  leaderboardSections: LeaderboardWorkspacePropsArgs['leaderboardSections'];
  leaderboardLanguageView: LeaderboardWorkspacePropsArgs['leaderboardLanguageView'];
  leaderboardExpanded: LeaderboardWorkspacePropsArgs['leaderboardExpanded'];
  leaderboardSectionExpanded: LeaderboardWorkspacePropsArgs['leaderboardSectionExpanded'];
  activeSessionId: LeaderboardWorkspacePropsArgs['activeSessionId'];
  setLeaderboardLanguageView: LeaderboardWorkspacePropsArgs['onChangeLeaderboardLanguageView'];
  setLeaderboardExpanded: LeaderboardWorkspacePropsArgs['setLeaderboardExpanded'];
  setLeaderboardSectionExpanded: LeaderboardWorkspacePropsArgs['setLeaderboardSectionExpanded'];
  openWorkspaceForSession: LeaderboardWorkspacePropsArgs['onOpenWorkspaceForSession'];
  openDashboardForSession: LeaderboardWorkspacePropsArgs['onOpenDashboardForSession'];
  deleteSession: LeaderboardWorkspacePropsArgs['onDeleteSession'];
};

export function useWorkspacePanelPropsRuntime({
  effectiveOpenRouterDefaultModel,
  assignedOpenRouterModel,
  getAuthHeaders,
  setOpenRouterDefaultModel,
  openRouterModels,
  openRouterStatus,
  openRouterError,
  refreshOpenRouterModels,
  showLeaderboardWorkspace,

  selectedBenchmarkProfile,
  selectedSessionFeedback,
  getBenchmarkActiveSessionStatus,
  adaptiveBenchmarksByInputLanguage,
  adaptiveSessionFeedbackByInputLanguage,
  setSelectedBenchmarkInputMode,
  setSelectedBenchmarkLanguage,
  setBenchmarkExportMessage,
  setSessionFeedbackMessage,
  selectedBenchmarkInputMode,
  selectedBenchmarkLanguage,
  openRouterGenerateFocusRequest,
  activeOpenRouterJobs,
  openRouterJobNotifications,
  trainingGenerationNowMs,
  trackOpenRouterJob,
  createOpenRouterErrorSession,
  copySelectedBenchmarkJson,
  downloadSelectedBenchmarkJson,
  copyBenchmarkWithDictationScriptPrompt,
  copyBenchmarkFeedbackPrompt,
  copyBenchmarkFeedbackJson,
  copySessionFeedbackJson,
  copyDictationScriptPrompt,
  copyDictationScriptTemplate,
  copyBenchmarkFeedbackPromptWithHumanFeedback,

  adminSessions,
  adminStorageSummary,
  adminFileInventory,
  adminFileInventoryError,
  exportMessage,
  supabaseSyncStatus,
  adminLanguageView,
  setAdminLanguageView,
  importDictaLocalStorageSnapshot,
  appProfile,
  visibleProfiles,
  adminProfileSessionCounts,
  adminProfileFilter,
  setAdminProfileFilter,
  updateAdminProfileAccess,
  adminRemoteStatus,
  setExportMessage,

  leaderboard,
  leaderboardSections,
  leaderboardLanguageView,
  leaderboardExpanded,
  leaderboardSectionExpanded,
  activeSessionId,
  setLeaderboardLanguageView,
  setLeaderboardExpanded,
  setLeaderboardSectionExpanded,
  openWorkspaceForSession,
  openDashboardForSession,
  deleteSession,
}: UseWorkspacePanelPropsRuntimeArgs) {
  const openRouterWorkspaceProps = useOpenRouterWorkspaceProps({
    defaultModel: effectiveOpenRouterDefaultModel,
    assignedModel: assignedOpenRouterModel,
    getAuthHeaders,
    setOpenRouterDefaultModel,
    models: openRouterModels,
    status: openRouterStatus,
    error: openRouterError,
    onRefreshModels: refreshOpenRouterModels,
    onBackToTraining: showLeaderboardWorkspace,
    exportProfile: selectedBenchmarkProfile,
    exportSessionFeedback: selectedSessionFeedback,
    getBenchmarkActiveSessionStatus,
    benchmarks: adaptiveBenchmarksByInputLanguage,
    sessionFeedbackByInputLanguage: adaptiveSessionFeedbackByInputLanguage,
    setSelectedBenchmarkInputMode,
    setSelectedBenchmarkLanguage,
    setBenchmarkExportMessage,
    setSessionFeedbackMessage,
    defaultGenerateInputMode: selectedBenchmarkInputMode,
    defaultGenerateLanguage: selectedBenchmarkLanguage,
    focusGenerateRequest: openRouterGenerateFocusRequest,
    activeJobs: activeOpenRouterJobs,
    jobNotifications: openRouterJobNotifications,
    generationNowMs: trainingGenerationNowMs,
    onTrackJob: trackOpenRouterJob,
    onCreateGenerationErrorSession: createOpenRouterErrorSession,
    onCopyBenchmark: (profile) => void copySelectedBenchmarkJson(profile),
    onExportBenchmark: (profile) => downloadSelectedBenchmarkJson(profile),
    onCopyBenchmarkWithScriptPrompt: (profile) => void copyBenchmarkWithDictationScriptPrompt(profile),
    onCopyBenchmarkFeedbackPrompt: (profile, feedback) => void copyBenchmarkFeedbackPrompt(profile, feedback),
    onCopyBenchmarkFeedback: (profile, feedback) => void copyBenchmarkFeedbackJson(profile, feedback),
    onCopySessionFeedback: (profile, feedback) => void copySessionFeedbackJson(profile, feedback),
    onCopyScriptPrompt: (profile) => void copyDictationScriptPrompt(profile),
    onCopyScriptTemplate: (profile) => void copyDictationScriptTemplate(profile),
    onCopyBenchmarkFeedbackPromptWithHumanFeedback: (profile, feedback, humanFeedback) =>
      void copyBenchmarkFeedbackPromptWithHumanFeedback(profile, feedback, humanFeedback),
  });

  const adminWorkspaceProps = useAdminWorkspaceProps({
    sessions: adminSessions,
    summary: adminStorageSummary,
    fileInventory: adminFileInventory,
    fileInventoryError: adminFileInventoryError,
    exportMessage,
    syncStatus: supabaseSyncStatus,
    languageView: adminLanguageView,
    onChangeLanguage: setAdminLanguageView,
    onBackToTraining: showLeaderboardWorkspace,
    onImportLocalStorage: importDictaLocalStorageSnapshot,
    appProfile,
    visibleProfiles,
    profileSessionCounts: adminProfileSessionCounts,
    selectedProfileFilter: adminProfileFilter,
    onChangeProfileFilter: setAdminProfileFilter,
    onUpdateProfileAccess: updateAdminProfileAccess,
    getAuthHeaders,
    remoteAdminStatus: adminRemoteStatus,
    openRouterModels,
    openRouterModelStatus: openRouterStatus,
    openRouterModelError: openRouterError,
    onRefreshOpenRouterModels: refreshOpenRouterModels,
    setExportMessage,
  });

  const leaderboardWorkspaceProps = useLeaderboardWorkspaceProps({
    leaderboard,
    leaderboardSections,
    leaderboardLanguageView,
    leaderboardExpanded,
    leaderboardSectionExpanded,
    activeSessionId,
    supportedLanguages: SUPPORTED_LANGUAGES,
    languageLabels: LANGUAGE_LABELS,
    onChangeLeaderboardLanguageView: setLeaderboardLanguageView,
    setLeaderboardExpanded,
    setLeaderboardSectionExpanded,
    onOpenWorkspaceForSession: openWorkspaceForSession,
    onOpenDashboardForSession: openDashboardForSession,
    onDeleteSession: deleteSession,
    onBackToTraining: showLeaderboardWorkspace,
    formatLeaderboardSessionStatus,
    formatSessionGenerationOrigin,
    formatSessionPlaybackDuration,
    formatSessionDate,
    formatSessionPointsForSession,
    buildSessionScoreHelpText,
    buildSessionPointsHelpText,
    computeSessionMaxPoints,
    getSessionDisplayTitle,
    isSessionReadyForTraining,
    MetricComponent: Metric,
    SessionDeviceIconComponent: SessionDeviceIcon,
  });

  return {
    openRouterWorkspaceProps,
    adminWorkspaceProps,
    leaderboardWorkspaceProps,
  };
}
