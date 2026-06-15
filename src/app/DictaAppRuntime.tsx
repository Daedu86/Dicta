import { useRef, useState } from 'react';
import { useAuthProfileRuntime } from './useAuthProfileRuntime';
import { useThemeModeRuntime } from './useThemeModeRuntime';
import { useOnlineStatus } from './useOnlineStatus';
import { useOpenRouterModelRuntime } from './useOpenRouterModelRuntime';
import { useDictaLocalStorageImportRuntime } from './useDictaLocalStorageImportRuntime';
import { useAdaptiveWorkspaceRouteRuntime } from './useAdaptiveWorkspaceRouteRuntime';
import { useSessionPersistenceRuntime } from './useSessionPersistenceRuntime';
import { useAdminProfileAccessActions } from './useAdminProfileAccessActions';
import { useAdminFileInventory } from './useAdminFileInventory';
import { useWorkspaceSessionRuntime } from './useWorkspaceSessionRuntime';
import { useWorkspaceNavigationEffects } from './useWorkspaceNavigationEffects';
import { useOpenRouterGenerationRuntime } from './useOpenRouterGenerationRuntime';
import { useOpenRouterErrorSessionActions } from './useOpenRouterErrorSessionActions';
import { useAdaptiveWorkspaceState } from './useAdaptiveWorkspaceState';
import { useAdaptiveWorkspaceRuntime } from './useAdaptiveWorkspaceRuntime';
import { useAppPerfDiagnosticsRuntime } from './useAppPerfDiagnosticsRuntime';
import { useDictaSupabaseRuntime } from './useDictaSupabaseRuntime';
import { useSessionCreationRuntime } from './useSessionCreationRuntime';
import { useTtsSessionRuntime } from './useTtsSessionRuntime';
import { useFocusedTrainingRuntime } from './useFocusedTrainingRuntime';
import { useAppPresentationRuntime } from './useAppPresentationRuntime';
import { useTrainingRuntimeState } from './useTrainingRuntimeState';
import { perfDiagnostics } from '../core/perfDiagnostics';
import { AppRouteRenderer } from './AppRouteRenderer';
import {
  buildGeneratedTrainingSessionNotification,
  showGeneratedTrainingSessionNotification,
  } from '../core/trainingNotifications';
import { useWorkspaceRouting } from './useWorkspaceRouting';
import { useOpenRouterJobsRuntime } from './useOpenRouterJobsRuntime';
import { useDictaUiPreferences } from './useDictaUiPreferences';
import { isMobileViewport } from './viewport';
import { useBrowserTtsRuntime } from './useBrowserTtsRuntime';
import { formatSessionDate } from './sessionDateFormatters';
import { formatSessionStatus } from './sessionStatusFormatters';
import { formatSessionPlaybackDuration } from './sessionPlaybackDuration';
import {
  mapSessionInputMode,
  } from './appRuntimeHelpers';
import { loadSessions } from './sessionStorage';
import type { StoredSession } from './sessionTypes';

const LOCAL_DEV_FEATURES_AVAILABLE = import.meta.env.DEV;

export function DictaAppRuntime() {
  const perfDiagnosticsEnabled = useAppPerfDiagnosticsRuntime();
  const [sessions, setSessions] = useState<StoredSession[]>(() => loadSessions());
  const [activeSessionId, setActiveSessionId] = useState<string>(() => loadSessions()[0]?.id ?? '');
  const {
    difficulty,
    setDifficulty,
    sessionStatus,
    setSessionStatus,
    controllerState,
    setControllerState,
    rate,
    setRate,
    lagSec,
    setLagSec,
    lagWords,
    setLagWords,
    wpm,
    setWpm,
    accuracy,
    setAccuracy,
    trend,
    setTrend,
    running,
    setRunning,
    error,
    setError,
    exportMessage,
    setExportMessage,
    trainingSubmitMessage,
    setTrainingSubmitMessage,
    inputSettingsLocked,
    setInputSettingsLocked,
    ttsText,
    setTtsText,
    ttsLanguage,
    setTtsLanguage,
    ttsPracticeText,
    setTtsPracticeText,
    ttsStatus,
    setTtsStatus,
    ttsCurrentChunk,
    setTtsCurrentChunk,
    ttsPlayerProgressTick,
    setTtsPlayerProgressTick,
    ttsPacingMode,
    setTtsPacingMode,
    ttsSpeechRate,
    setTtsSpeechRate,
  } = useTrainingRuntimeState();
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
  } = useWorkspaceRouting();
  const { themeMode, setThemeMode } = useThemeModeRuntime();
  const {
    browserTtsVoices,
    isBrowserTtsSupported,
    speakBrowserTts,
    resumeBrowserTts,
    cancelBrowserTts,
  } = useBrowserTtsRuntime();
  const suppressSidebarAutoSelectRef = useRef(false);
  const hydratingSessionIdRef = useRef<string | null>(null);
  const allowFinishedSessionResetRef = useRef<string | null>(null);
  const {
    adminFileInventory,
    adminFileInventoryError,
  } = useAdminFileInventory({
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
  const {
    syncConfig,
    supabaseClient,
  } = useDictaSupabaseRuntime();
  const {
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
    setAppProfile,
    appProfileError,
    openRouterAccessState,
    openRouterAccessAllowed,
    openRouterAccessMessage,
    visibleProfiles,
    setVisibleProfiles,
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
  } = useAuthProfileRuntime({
    syncConfig,
    supabaseClient,
  });
  const {
    setOpenRouterDefaultModel,
    openRouterModels,
    openRouterStatus,
    openRouterError,
    setOpenRouterError,
    assignedOpenRouterModel,
    effectiveOpenRouterDefaultModel,
    refreshOpenRouterModels,
  } = useOpenRouterModelRuntime({
    syncConfig,
    appProfile,
    getAuthHeaders,
  });

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

  const {
    createOpenRouterErrorSession,
    createCustomOpenRouterErrorSessionForJob,
  } = useOpenRouterErrorSessionActions({
    ensureCanCreateDictationSession,
    suppressSidebarAutoSelectRef,
    prependSessionAndPersistNow,
    setLeaderboardLanguageView,
    setActiveSessionId,
    showLeaderboardWorkspace,
    setError,
    setOpenRouterError,
  });
  const {
    activeOpenRouterJobs,
    openRouterJobNotifications,
    openRouterJobStatus,
    trainingGenerationNotices,
    trainingGenerationNowMs,
    trackOpenRouterJob,
    recordOpenRouterGenerationFailure,
    resetOpenRouterJobsRuntime,
  } = useOpenRouterJobsRuntime({
    localStorageReady: localStorageReadyForEffectiveProfile,
    openRouterAccessAllowed,
    getAuthHeaders,
    onOpenRouterError: setOpenRouterError,
    onCreateGenerationErrorSession: createCustomOpenRouterErrorSessionForJob,
    onGeneratedScript: (script, trackedJob) => {
      createSessionFromOpenRouterScript(script, { navigateToLeaderboard: false, generationOrigin: 'openrouter' });
      void showGeneratedTrainingSessionNotification(buildGeneratedTrainingSessionNotification(script, trackedJob));
    },
  });
  resetOpenRouterJobsRuntimeRef.current = resetOpenRouterJobsRuntime;
  const isOnline = useOnlineStatus();
  const {
    previousLagRef,
    previousAccuracyRef,
    ttsPracticeLiveTextRef,
    ttsUtteranceRef,
    telemetryRef,
    ttsStartedAtMsRef,
    ttsChunkStartMsRef,
    ttsChunkStartWordIndexRef,
    ttsChunkWordCountRef,
    ttsCompletedSourceWordsRef,
    ttsPausedAtWordIndexRef,
    ttsLagOutlierCountRef,
    ttsLastValidControlLagSecRef,
    ttsUnsafeChunkCountRef,
    ttsChunkAccuracyWindowRef,
    ttsLastAccuracySnapshotRef,
    ttsLastControllerActionRef,
    applyTtsPerformanceSampleRef,
    stopTtsPlaybackRef,
    ttsSemanticPhraseAdvanceCountRef,
    ttsSemanticPhraseReplayCountRef,
    ttsLiveSignalRef,
    ttsUiLastPublishedAtRef,
    ttsPublishedUiRef,
    config,
    activeSession,
    dashboardSession,
    activeInputMode,
    activeInputLabel,
    activeInputWorkspaceMode,
    activeSessionFinished,
    ttsPlaybackProfile,
    collectBrowserTtsEnvironmentForSession,
    resolveBrowserTtsVoiceForSession,
    resolveActiveBrowserTtsVoice,
  } = useTtsSessionRuntime({
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
  const openRouterOfflineTitle = isOnline ? '' : 'Needs internet. Local practice still works offline and results stay on this device.';
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
    updateAdminProfileAccess,
  } = useAdminProfileAccessActions({
    getAuthHeaders,
    appProfile,
    setAppProfile,
    setVisibleProfiles,
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
    directOpenRouterBusy,
    directIntermediateOpenRouterBusy,
    directAdvancedOpenRouterBusy,
    expressEasyOpenRouterBusy,
    expressIntermediateOpenRouterBusy,
    expressAdvancedOpenRouterBusy,
    openOpenRouterGenerateForActiveInput,
    generateEasyNextSessionFromOpenRouter,
    generateIntermediateNextSessionFromOpenRouter,
    generateAdvancedNextSessionFromOpenRouter,
    generateExpressEasyNextSessionFromOpenRouter,
    generateExpressIntermediateNextSessionFromOpenRouter,
    generateExpressAdvancedNextSessionFromOpenRouter,
  } = useOpenRouterGenerationRuntime({
    access: {
      allowCustomSessionGeneration: isCurrentProfileAdmin || !syncConfig.authRequired,
      openRouterAccessAllowed,
      openRouterAccessMessage,
      isOnline,
    },
    sessionContext: {
      sessions,
      activeSession,
      fallbackInputMode: mapSessionInputMode(activeInputMode),
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
    jobActions: {
      trackOpenRouterJob,
      recordOpenRouterGenerationFailure,
      createOpenRouterErrorSession,
    },
  });

  const {
    focusedTrainingProps,
    getActiveTypingLanguage,
  } = useFocusedTrainingRuntime({
    activeInputMode,
    ttsText,
    ttsPracticeText,
    lagSec,
    wpm,
    rate,
    activeSessionFinished,
    ttsStatus,
    config,
    applyTtsPerformanceSampleRef,
    setTtsPlayerProgressTick,
    sessions,
    setSessions,
    activeSession,
    activeSessionId,
    difficulty,
    inputSettingsLocked,
    ttsLanguage,
    sessionStatus,
    controllerState,
    running,
    lagWords,
    accuracy,
    trend,
    hydratingSessionIdRef,
    allowFinishedSessionResetRef,
    ttsPracticeLiveTextRef,
    ttsUiLastPublishedAtRef,
    ttsPublishedUiRef,
    telemetryRef,
    previousLagRef,
    previousAccuracyRef,
    ttsStartedAtMsRef,
    ttsChunkStartMsRef,
    ttsChunkStartWordIndexRef,
    ttsChunkWordCountRef,
    ttsCompletedSourceWordsRef,
    ttsLagOutlierCountRef,
    ttsLastControllerActionRef,
    setDifficulty,
    setInputSettingsLocked,
    setTtsLanguage,
    setTtsPracticeText,
    setSessionStatus,
    setTtsText,
    setTtsStatus,
    setTtsCurrentChunk,
    setTtsPacingMode,
    setTtsSpeechRate,
    setRunning,
    setRate,
    setLagSec,
    setLagWords,
    setWpm,
    setAccuracy,
    setTrend,
    setControllerState,
    setExportMessage,
    setError,
    setTrainingSubmitMessage,
    resetAdaptiveSessionFeedbackTracking,
    ttsSpeechRate,
    ttsPacingMode,
    browserTtsVoices,
    ttsPlaybackProfile,
    perfDiagnostics,
    stopTtsPlaybackRef,
    ttsPausedAtWordIndexRef,
    ttsLastValidControlLagSecRef,
    ttsLiveSignalRef,
    ttsUnsafeChunkCountRef,
    ttsChunkAccuracyWindowRef,
    ttsLastAccuracySnapshotRef,
    ttsUtteranceRef,
    ttsSemanticPhraseAdvanceCountRef,
    ttsSemanticPhraseReplayCountRef,
    isBrowserTtsSupported,
    speakBrowserTts,
    resolveActiveBrowserTtsVoice,
    collectBrowserTtsEnvironmentForSession,
    getHistoricalPerformanceProfile,
    getBenchmarkSnapshot,
    getAdaptiveController,
    beginAdaptiveSessionFeedback,
    recordPhrasePlaybackEvent,
    recordAdaptiveBenchmark,
    setAdaptiveSemanticDebug,
    cancelBrowserTts,
    resumeBrowserTts,
    resolveBrowserTtsVoiceForSession,
    persistAndPushSessionsNow,
    completeAdaptiveSessionFeedback,
    activeTrainingSubmissionMeta,
    activeInputLabel,
    error,
    trainingSubmitMessage,
    exportMessage,
    openRouterJobStatus,
    openRouterError,
    adaptiveSemanticDebug,
    ttsPlayerProgressTick,
    pendingSessions,
    openWorkspaceForSession,
    deleteSession,
    supabaseSyncStatus,
    pendingSyncSummary,
    allowCustomSessionGeneration: isCurrentProfileAdmin || !syncConfig.authRequired,
    openRouterAccessAllowed,
    isOnline,
    effectiveOpenRouterDefaultModel,
    sessionQuotaStatus,
    openRouterOfflineTitle,
    activeOpenRouterJobs,
    openRouterJobNotifications,
    trainingGenerationNotices,
    trainingGenerationNowMs,
    directOpenRouterBusy,
    directIntermediateOpenRouterBusy,
    directAdvancedOpenRouterBusy,
    expressEasyOpenRouterBusy,
    expressIntermediateOpenRouterBusy,
    expressAdvancedOpenRouterBusy,
    generateEasyNextSessionFromOpenRouter,
    generateIntermediateNextSessionFromOpenRouter,
    generateAdvancedNextSessionFromOpenRouter,
    generateExpressEasyNextSessionFromOpenRouter,
    generateExpressIntermediateNextSessionFromOpenRouter,
    generateExpressAdvancedNextSessionFromOpenRouter,
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
    selectedBenchmarkProfile,
    selectedSessionFeedback,
    insightsDiagnosticInputOptions,
    getBenchmarkActiveSessionStatus,
    copySelectedBenchmarkJson,
    downloadSelectedBenchmarkJson,
    copyDictationScriptPrompt,
    copyBenchmarkWithDictationScriptPrompt,
    copyDictationScriptTemplate,
    copySessionFeedbackJson,
    copyBenchmarkFeedbackJson,
    copyInsightsDiagnosticPackage,
    selectInsightsDiagnosticFallbackReport,
    copyBenchmarkFeedbackPrompt,
    copyBenchmarkFeedbackPromptWithHumanFeedback,
    adaptiveAdvancedDiagnosticsProps,
    adaptiveBenchmarkSectionProps,
  } = useAdaptiveWorkspaceRouteRuntime({
    presentation: {
      adaptiveBenchmarksByInputLanguage,
      adaptiveSessionFeedbackByInputLanguage,
      selectedBenchmarkInputMode,
      selectedBenchmarkLanguage,
      insightsDiagnosticInputMode,
      metricsLanguageView,
      latestSession,
    },
    exportActions: {
      sessions,
      activeSession,
      activeSessionFinished,
      sessionStatus,
      getActiveTypingLanguage,
      insightsDiagnosticInputMode,
      metricsLanguageView,
      setBenchmarkExportMessage,
      setExportMessage,
      setSessionFeedbackMessage,
      setInsightsDiagnosticFallbackReport,
      setInsightsDiagnosticMessage,
    },
    diagnostics: {
      adaptiveSectionExpanded,
      latestSession,
      selectedBenchmarkInputMode,
      adaptiveSemanticDebug,
      mapSessionInputMode,
      setAdaptiveSectionExpanded,
      setSelectedBenchmarkInputMode,
      setBenchmarkExportMessage,
      setSessionFeedbackMessage,
    },
    benchmark: {
      adaptiveBenchmarksByInputLanguage,
      adaptiveSectionExpanded,
      adaptiveBenchmarksFocusAnchor,
      selectedBenchmarkInputMode,
      selectedBenchmarkLanguage,
      benchmarkExportMessage,
      sessionFeedbackMessage,
      formatSessionDate,
      setAdaptiveSectionExpanded,
      setSelectedBenchmarkInputMode,
      setSelectedBenchmarkLanguage,
      setBenchmarkExportMessage,
      setSessionFeedbackMessage,
    },
  });
  const isFocusedTrainingRoute = currentPath === '/training' || currentPath === '/training/';

  void openAdaptiveExportsForActiveInput;

  const {
    openRouterWorkspaceProps,
    adminWorkspaceProps,
    leaderboardWorkspaceProps,
    appShellHeaderProps,
    authWorkspaceProps,
    sessionCreateCardProps,
    liveMetricsDockProps,
  } = useAppPresentationRuntime({
    workspacePanels: {
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
    },
    appShellHeader: {
      themeMode,
      isOnline,
      openRouterAccessAllowed,
      effectiveOpenRouterDefaultModel,
      isCurrentProfileAdmin,
      authRequired: syncConfig.authRequired,
      supabaseSyncStatus,
      pendingSyncSummary,
      appProfile,
      sessionQuotaStatus,
      showLeaderboardWorkspace,
      navigateAppRoute,
      openAdaptiveWorkspaceFromHeader,
      showAdminWorkspace,
      showOpenRouterWorkspace,
      setThemeMode,
      signOut,
    },
    authWorkspace: {
      themeMode,
      authLoading,
      authView,
      authSession,
      appProfile,
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
      signOut,
      showAuthView,
      setAuthEmail,
      setAuthPassword,
      setAuthNewPassword,
      setAuthNewPasswordConfirm,
    },
    sessionCreateCard: {
      sessionCreationSource,
      sessionCreationName,
      sessionQuotaStatus,
      localDevFeaturesAvailable: LOCAL_DEV_FEATURES_AVAILABLE,
      allowDictationScriptCreation: isCurrentProfileAdmin || !syncConfig.authRequired,
      dictationScriptJson,
      dictationScriptValidation,
      changeSessionCreationSource,
      setSessionCreationName,
      createSessionWithMode,
      changeDictationScriptJson,
      validateScriptImport,
      createSessionFromDictationScript,
      cancelSessionCreation,
    },
    liveMetricsDock: {
      insightsCollapsed,
      metricsLanguageView,
      metricsRangeView,
      trend,
      insightsDiagnosticInputOptions,
      insightsDiagnosticInputMode,
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
      copyInsightsDiagnosticPackage,
      setInsightsCollapsed,
      selectInsightsDiagnosticFallbackReport,
    },
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

