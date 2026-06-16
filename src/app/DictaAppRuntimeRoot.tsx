import { useRef } from 'react';
import { useDictaLocalStorageImportRuntime } from './useDictaLocalStorageImportRuntime';
import { useSessionPersistenceRuntime } from './useSessionPersistenceRuntime';
import { useWorkspaceSessionRuntime } from './useWorkspaceSessionRuntime';
import { useWorkspaceNavigationEffects } from './useWorkspaceNavigationEffects';
import { useAdaptiveWorkspaceState } from './useAdaptiveWorkspaceState';
import { useAdaptiveWorkspaceRuntime } from './useAdaptiveWorkspaceRuntime';
import { useSessionCreationRuntime } from './useSessionCreationRuntime';
import { useTtsSessionRuntime } from './useTtsSessionRuntime';
import { useDictaRootFocusedTrainingRuntime } from './useDictaRootFocusedTrainingRuntime';
import { AppRouteRenderer } from './AppRouteRenderer';
import { useDictaUiPreferences } from './useDictaUiPreferences';
import { useDictaRootRouteCompositionRuntime } from './useDictaRootRouteCompositionRuntime';
import { useDictaAccessRuntime } from './useDictaAccessRuntime';
import { useDictaAppBootRuntime } from './useDictaAppBootRuntime';
import { useDictaRootOpenRouterRuntime } from './useDictaRootOpenRouterRuntime';
import { isMobileViewport } from './viewport';
import { formatSessionDate } from './sessionDateFormatters';
import { formatSessionStatus } from './sessionStatusFormatters';
import { formatSessionPlaybackDuration } from './sessionPlaybackDuration';

const LOCAL_DEV_FEATURES_AVAILABLE = import.meta.env.DEV;

export function DictaAppRuntime() {
  const {
    perfDiagnosticsEnabled,
    sessionsState,
    trainingState,
    routing,
    theme,
    browserTts,
    refs,
  } = useDictaAppBootRuntime();
  const {
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
  } = sessionsState;
  const {
    difficulty,
    sessionStatus,
    error,
    setError,
    exportMessage,
    setExportMessage,
    ttsLanguage,
    ttsPracticeText,
    ttsStatus,
    ttsCurrentChunk,
    ttsPacingMode,
    trend,
  } = trainingState;
  const {
    workspaceMode,
    currentPath,
    dashboardSessionId,
    clearDashboardSession,
    navigateAppRoute,
    showWorkspaceMode,
    showLeaderboardWorkspace,
    showAdminWorkspace,
    showOpenRouterWorkspace,
    showAdaptiveWorkspace,
    showDashboardWorkspace,
    showSessionInputWorkspace,
  } = routing;
  const {
    themeMode,
    setThemeMode,
  } = theme;
  const {
    browserTtsVoices,
  } = browserTts;
  const {
    suppressSidebarAutoSelectRef,
  } = refs;
  const {
    syncConfig,
    supabaseClient,
    authSession,
    authLoading,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authError,
    authView,
    authNewPassword,
    setAuthNewPassword,
    authNewPasswordConfirm,
    setAuthNewPasswordConfirm,
    authMessage,
    authMessageTone,
    authBusy,
    appProfile,
    appProfileError,
    openRouterAccessState,
    openRouterAccessAllowed,
    openRouterAccessMessage,
    visibleProfiles,
    adminProfileFilter,
    setAdminProfileFilter,
    adminRemoteSessions,
    adminProfileSessionCounts,
    adminRemoteStatus,
    effectiveProfileId,
    isCurrentProfileAdmin,
    signInWithSupabase,
    showAuthView,
    requestSupabasePasswordReset,
    updateSupabasePassword,
    signOut,
    getAuthHeaders,
    setOpenRouterDefaultModel,
    openRouterModels,
    openRouterStatus,
    openRouterError,
    setOpenRouterError,
    assignedOpenRouterModel,
    effectiveOpenRouterDefaultModel,
    refreshOpenRouterModels,
    adminFileInventory,
    adminFileInventoryError,
    updateAdminProfileAccess,
  } = useDictaAccessRuntime({
    workspaceMode,
    localDevFeaturesAvailable: LOCAL_DEV_FEATURES_AVAILABLE,
  });
  const {
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
    adaptiveSectionExpanded,
    setAdaptiveSectionExpanded,
  } = useDictaUiPreferences();
  const {
    adaptiveSemanticDebug,
    setAdaptiveSemanticDebug,
    adaptiveBenchmarksByInputLanguage,
    setAdaptiveBenchmarksByInputLanguage,
    adaptiveBenchmarksRef,
    adaptiveSessionFeedbackByInputLanguage,
    setAdaptiveSessionFeedbackByInputLanguage,
    adaptiveSessionFeedbackRef,
    adaptiveBenchmarksFocusAnchor,
    setAdaptiveBenchmarksFocusAnchor,
    benchmarkExportMessage,
    setBenchmarkExportMessage,
    sessionFeedbackMessage,
    setSessionFeedbackMessage,
  } = useAdaptiveWorkspaceState();

  const resetOpenRouterJobsRuntimeRef = useRef<() => void>(() => undefined);
  const {
    localStorageReadyForEffectiveProfile,
    supabaseInitialSyncPending,
    supabaseSyncStatus,
    persistAndPushSessionsNow,
    prependSessionAndPersistNow,
    persistAndPushAdaptiveSessionFeedbackNow,
    deleteSessionAndSync,
    sessionQuotaStatus,
    ensureCanCreateDictationSession,
  } = useSessionPersistenceRuntime({
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    syncConfig,
    supabaseClient,
    effectiveProfileId,
    appProfile,
    adaptiveBenchmarks: adaptiveBenchmarksByInputLanguage,
    setAdaptiveBenchmarks: setAdaptiveBenchmarksByInputLanguage,
    adaptiveBenchmarksRef,
    adaptiveSessionFeedback: adaptiveSessionFeedbackByInputLanguage,
    setAdaptiveSessionFeedback: setAdaptiveSessionFeedbackByInputLanguage,
    adaptiveSessionFeedbackRef,
    setError,
    setOpenRouterError,
    setExportMessage,
    clearDashboardSession,
    resetOpenRouterJobsRuntime: () => resetOpenRouterJobsRuntimeRef.current(),
  });

  const {
    openRouterGenerateFocusRequest,
    setOpenRouterGenerateFocusRequest,
    sessionCreationMode,
    sessionCreationSource,
    changeSessionCreationSource,
    sessionCreationName,
    setSessionCreationName,
    dictationScriptJson,
    changeDictationScriptJson,
    dictationScriptValidation,
    cancelSessionCreation,
    createSessionWithMode,
    validateScriptImport,
    createSessionFromDictationScript,
    createSessionFromOpenRouterScript,
  } = useSessionCreationRuntime({
    browserTtsVoices,
    suppressSidebarAutoSelectRef,
    ensureCanCreateDictationSession,
    prependSessionAndPersistNow,
    showSessionInputWorkspace,
    showLeaderboardWorkspace,
    setActiveSessionId,
    setLeaderboardLanguageView,
    setError,
    setOpenRouterError,
    setExportMessage,
  });

  const ttsSessionRuntime = useTtsSessionRuntime({
    ttsPracticeText,
    sessions,
    activeSessionId,
    dashboardSessionId,
    difficulty,
    sessionStatus,
    browserTtsVoices,
    setSessions,
    ttsLanguage,
  });

  const {
    activeSession,
    dashboardSession,
    activeInputMode,
    activeInputWorkspaceMode,
    activeSessionFinished,
  } = ttsSessionRuntime;

  const {
    insightsDiagnosticInputMode,
    setInsightsDiagnosticInputMode,
    insightsDiagnosticMessage,
    setInsightsDiagnosticMessage,
    insightsDiagnosticFallbackReport,
    setInsightsDiagnosticFallbackReport,
    getAdaptiveController,
    selectedBenchmarkInputMode,
    setSelectedBenchmarkInputMode,
    selectedBenchmarkLanguage,
    setSelectedBenchmarkLanguage,
    getHistoricalPerformanceProfile,
    getBenchmarkSnapshot,
    recordAdaptiveBenchmark,
    beginAdaptiveSessionFeedback,
    recordPhrasePlaybackEvent,
    completeAdaptiveSessionFeedback,
    resetAdaptiveSessionFeedbackTracking,
    openAdaptiveExportsForActiveInput,
    openAdaptiveWorkspaceFromHeader,
  } = useAdaptiveWorkspaceRuntime({
    activeSession,
    activeSessionId,
    sessions,
    adaptiveBenchmarksByInputLanguage,
    setAdaptiveBenchmarksByInputLanguage,
    adaptiveBenchmarksRef,
    adaptiveSessionFeedbackByInputLanguage,
    setAdaptiveSessionFeedbackByInputLanguage,
    adaptiveSessionFeedbackRef,
    persistAndPushAdaptiveSessionFeedbackNow,
    localStorageReadyForEffectiveProfile,
    perfDiagnosticsEnabled,
    dictaLanguageView,
    setDictaLanguageView,
    showAdaptiveWorkspace,
    setAdaptiveBenchmarksFocusAnchor,
    setAdaptiveSectionExpanded,
    setBenchmarkExportMessage,
    setSessionFeedbackMessage,
    isMobileViewport,
  });
  useWorkspaceNavigationEffects({
    sessions,
    activeSession,
    activeSessionId,
    activeInputWorkspaceMode,
    workspaceMode,
    openRouterAccessState,
    openRouterAccessMessage,
    suppressSidebarAutoSelectRef,
    setActiveSessionId,
    setOpenRouterError,
    showLeaderboardWorkspace,
    showWorkspaceMode,
  });

  const {
    latestSession,
    activeTrainingSubmissionMeta,
    pendingSessions,
    pendingSyncSummary,
    recentDictationSessionHints,
    leaderboard,
    leaderboardSections,
    adminSessions,
    adminStorageSummary,
    lastSessionForLanguage,
    lastSessionScoreHelpText,
    languageTodaySummary,
    deleteSession,
    openDashboardForSession,
    openWorkspaceForSession,
  } = useWorkspaceSessionRuntime({
    sessions,
    activeSession,
    adaptiveBenchmarksByInputLanguage,
    adaptiveSessionFeedbackByInputLanguage,
    supabaseLastSyncedAt: supabaseSyncStatus.lastSyncedAt,
    leaderboardLanguageView,
    adminLanguageView,
    adminProfileFilter,
    adminRemoteSessions,
    metricsLanguageView,
    metricsRangeView,
    dashboardSessionId,
    workspaceMode,
    clearDashboardSession,
    showLeaderboardWorkspace,
    deleteSessionAndSync,
    setActiveSessionId,
    showDashboardWorkspace,
    showSessionInputWorkspace,
  });

  const {
    isOnline,
    openRouterOfflineTitle,
    createOpenRouterErrorSession,
    activeOpenRouterJobs,
    openRouterJobNotifications,
    openRouterJobStatus,
    trainingGenerationNotices,
    trainingGenerationNowMs,
    trackOpenRouterJob,
    directOpenRouterBusy,
    directIntermediateOpenRouterBusy,
    directAdvancedOpenRouterBusy,
    openOpenRouterGenerateForActiveInput,
    generateEasyNextSessionFromOpenRouter,
    generateIntermediateNextSessionFromOpenRouter,
    generateAdvancedNextSessionFromOpenRouter,
  } = useDictaRootOpenRouterRuntime({
    errorSessionActions: {
      ensureCanCreateDictationSession,
      suppressSidebarAutoSelectRef,
      prependSessionAndPersistNow,
      setLeaderboardLanguageView,
      setActiveSessionId,
      showLeaderboardWorkspace,
      setError,
      setOpenRouterError,
    },
    generatedScriptSettlement: {
      createSessionFromOpenRouterScript,
    },
    jobs: {
      localStorageReady: localStorageReadyForEffectiveProfile,
      openRouterAccessAllowed,
      getAuthHeaders,
      onOpenRouterError: setOpenRouterError,
    },
    access: {
      allowCustomSessionGeneration: isCurrentProfileAdmin || !syncConfig.authRequired,
      openRouterAccessAllowed,
      openRouterAccessMessage,
    },
    sessionContext: {
      sessions,
      activeSession,
      activeInputMode,
      dictaLanguageView,
      recentDictationSessionHints,
    },
    generation: {
      effectiveOpenRouterDefaultModel,
      getAuthHeaders,
      ensureCanCreateDictationSession,
    },
    adaptiveContext: {
      adaptiveBenchmarksByInputLanguage,
      adaptiveSessionFeedbackByInputLanguage,
    },
    presentationActions: {
      showOpenRouterWorkspace,
      setOpenRouterGenerateFocusRequest,
      setOpenRouterError,
      setSelectedBenchmarkInputMode,
      setSelectedBenchmarkLanguage,
      setBenchmarkExportMessage,
      setSessionFeedbackMessage,
    },
    resetOpenRouterJobsRuntimeRef,
  });

  const {
    focusedTrainingProps,
    getActiveTypingLanguage,
  } = useDictaRootFocusedTrainingRuntime({
    ttsSessionRuntime,
    ...sessionsState,
    ...trainingState,
    ...refs,
    ...browserTts,
    resetAdaptiveSessionFeedbackTracking,
    getHistoricalPerformanceProfile,
    getBenchmarkSnapshot,
    getAdaptiveController,
    beginAdaptiveSessionFeedback,
    recordPhrasePlaybackEvent,
    recordAdaptiveBenchmark,
    setAdaptiveSemanticDebug,
    completeAdaptiveSessionFeedback,
    adaptiveSemanticDebug,
    persistAndPushSessionsNow,
    supabaseSyncStatus,
    activeTrainingSubmissionMeta,
    pendingSessions,
    openWorkspaceForSession,
    deleteSession,
    pendingSyncSummary,
    allowCustomSessionGeneration: isCurrentProfileAdmin || !syncConfig.authRequired,
    openRouterAccessAllowed,
    effectiveOpenRouterDefaultModel,
    sessionQuotaStatus,
    openRouterJobStatus,
    openRouterError,
    isOnline,
    openRouterOfflineTitle,
    activeOpenRouterJobs,
    openRouterJobNotifications,
    trainingGenerationNotices,
    trainingGenerationNowMs,
    directOpenRouterBusy,
    directIntermediateOpenRouterBusy,
    directAdvancedOpenRouterBusy,
    generateEasyNextSessionFromOpenRouter,
    generateIntermediateNextSessionFromOpenRouter,
    generateAdvancedNextSessionFromOpenRouter,
    openOpenRouterGenerateForActiveInput,
  });

  const { importDictaLocalStorageSnapshot } = useDictaLocalStorageImportRuntime({
    setSessions,
    setActiveSessionId,
    clearDashboardSession,
    setAdaptiveBenchmarksByInputLanguage,
    setAdaptiveSessionFeedbackByInputLanguage,
    setDictaLanguageView,
    setOpenRouterDefaultModel,
    showLeaderboardWorkspace,
    setExportMessage,
  });

  const {
    adaptiveAdvancedDiagnosticsProps,
    adaptiveBenchmarkSectionProps,
    isFocusedTrainingRoute,
    openRouterWorkspaceProps,
    adminWorkspaceProps,
    leaderboardWorkspaceProps,
    appShellHeaderProps,
    authWorkspaceProps,
    sessionCreateCardProps,
    liveMetricsDockProps,
  } = useDictaRootRouteCompositionRuntime({
    adaptiveBenchmarksByInputLanguage,
    adaptiveSessionFeedbackByInputLanguage,
    adaptiveBenchmarksFocusAnchor,
    selectedBenchmarkInputMode,
    selectedBenchmarkLanguage,
    insightsDiagnosticInputMode,
    metricsLanguageView,
    latestSession,
    sessions,
    activeSession,
    activeSessionFinished,
    sessionStatus,
    getActiveTypingLanguage,
    setBenchmarkExportMessage,
    setExportMessage,
    setSessionFeedbackMessage,
    setInsightsDiagnosticFallbackReport,
    setInsightsDiagnosticMessage,
    adaptiveSectionExpanded,
    adaptiveSemanticDebug,
    setAdaptiveSectionExpanded,
    setSelectedBenchmarkInputMode,
    setSelectedBenchmarkLanguage,
    benchmarkExportMessage,
    sessionFeedbackMessage,
    formatSessionDate,
    currentPath,
    openAdaptiveExportsForActiveInput,
    effectiveOpenRouterDefaultModel,
    assignedOpenRouterModel,
    getAuthHeaders,
    setOpenRouterDefaultModel,
    openRouterModels,
    openRouterStatus,
    openRouterError,
    refreshOpenRouterModels,
    showLeaderboardWorkspace,
    openRouterGenerateFocusRequest,
    activeOpenRouterJobs,
    openRouterJobNotifications,
    trainingGenerationNowMs,
    trackOpenRouterJob,
    createOpenRouterErrorSession,
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
    themeMode,
    isOnline,
    openRouterAccessAllowed,
    isCurrentProfileAdmin,
    syncConfig,
    pendingSyncSummary,
    sessionQuotaStatus,
    navigateAppRoute,
    openAdaptiveWorkspaceFromHeader,
    showAdminWorkspace,
    showOpenRouterWorkspace,
    setThemeMode,
    signOut,
    authLoading,
    authView,
    authSession,
    appProfileError,
    localStorageReadyForEffectiveProfile,
    supabaseInitialSyncPending,
    effectiveProfileId,
    authEmail,
    authPassword,
    authNewPassword,
    authNewPasswordConfirm,
    authBusy,
    authMessage,
    authMessageTone,
    authError,
    perfDiagnosticsEnabled,
    signInWithSupabase,
    requestSupabasePasswordReset,
    updateSupabasePassword,
    showAuthView,
    setAuthEmail,
    setAuthPassword,
    setAuthNewPassword,
    setAuthNewPasswordConfirm,
    sessionCreationSource,
    sessionCreationName,
    dictationScriptJson,
    dictationScriptValidation,
    changeSessionCreationSource,
    setSessionCreationName,
    createSessionWithMode,
    changeDictationScriptJson,
    validateScriptImport,
    createSessionFromDictationScript,
    cancelSessionCreation,
    insightsCollapsed,
    metricsRangeView,
    trend,
    insightsDiagnosticMessage,
    insightsDiagnosticFallbackReport,
    workspaceMode,
    ttsCurrentChunk,
    ttsPacingMode,
    ttsStatus,
    lastSessionForLanguage,
    lastSessionScoreHelpText,
    languageTodaySummary,
    setMetricsLanguageView,
    setMetricsRangeView,
    setInsightsDiagnosticInputMode,
    setInsightsCollapsed,
    localDevFeaturesAvailable: LOCAL_DEV_FEATURES_AVAILABLE,
  });

  return (
    <AppRouteRenderer
      syncAuthRequired={syncConfig.authRequired}
      authLoading={authLoading}
      authView={authView}
      authSession={authSession}
      appProfile={appProfile}
      appProfileError={appProfileError}
      localStorageReadyForEffectiveProfile={localStorageReadyForEffectiveProfile}
      supabaseInitialSyncPending={supabaseInitialSyncPending}
      authWorkspaceProps={authWorkspaceProps}
      isFocusedTrainingRoute={isFocusedTrainingRoute}
      themeMode={themeMode}
      dictaLanguageView={dictaLanguageView}
      setDictaLanguageView={setDictaLanguageView}
      navigateAppRoute={navigateAppRoute}
      focusedTrainingProps={focusedTrainingProps}
      perfDiagnosticsEnabled={perfDiagnosticsEnabled}
      appShellHeaderProps={appShellHeaderProps}
      sessionCreationMode={sessionCreationMode}
      sessionCreateCardProps={sessionCreateCardProps}
      pendingSessions={pendingSessions}
      activeSessionId={activeSessionId}
      openWorkspaceForSession={openWorkspaceForSession}
      deleteSession={deleteSession}
      workspaceMode={workspaceMode}
      dashboardSession={dashboardSession}
      sessions={sessions}
      formatSessionStatus={formatSessionStatus}
      formatSessionDate={formatSessionDate}
      formatSessionPlaybackDuration={formatSessionPlaybackDuration}
      showLeaderboardWorkspace={showLeaderboardWorkspace}
      adaptiveAdvancedDiagnosticsProps={adaptiveAdvancedDiagnosticsProps}
      adaptiveBenchmarkSectionProps={adaptiveBenchmarkSectionProps}
      openRouterAccessState={openRouterAccessState}
      openRouterAccessMessage={openRouterAccessMessage}
      openRouterWorkspaceProps={openRouterWorkspaceProps}
      canAccessAdminWorkspace={isCurrentProfileAdmin || !syncConfig.authRequired}
      adminWorkspaceProps={adminWorkspaceProps}
      leaderboardWorkspaceProps={leaderboardWorkspaceProps}
      liveMetricsDockProps={liveMetricsDockProps}
    />
  );
}
