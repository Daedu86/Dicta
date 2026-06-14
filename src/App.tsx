import { useEffect, useRef, useState } from 'react';
import { useAuthProfileRuntime } from './app/useAuthProfileRuntime';
import { useThemeModeRuntime } from './app/useThemeModeRuntime';
import { useOnlineStatus } from './app/useOnlineStatus';
import { useOpenRouterModelRuntime } from './app/useOpenRouterModelRuntime';
import { useDictaLocalStorageImportRuntime } from './app/useDictaLocalStorageImportRuntime';
import { useAdaptiveWorkspaceRouteRuntime } from './app/useAdaptiveWorkspaceRouteRuntime';
import { useSessionWorkspaceActions } from './app/useSessionWorkspaceActions';
import { useSessionPersistenceRuntime } from './app/useSessionPersistenceRuntime';
import { useAdminProfileAccessActions } from './app/useAdminProfileAccessActions';
import { useAdminFileInventory } from './app/useAdminFileInventory';
import { useWorkspaceSessionSummaries } from './app/useWorkspaceSessionSummaries';
import { useWorkspaceNavigationEffects } from './app/useWorkspaceNavigationEffects';
import { useOpenRouterGenerationRuntime } from './app/useOpenRouterGenerationRuntime';
import { useOpenRouterErrorSessionActions } from './app/useOpenRouterErrorSessionActions';
import { useAdaptiveDiagnosticsUiState } from './app/useAdaptiveDiagnosticsUiState';
import { useAdaptiveWorkspaceState } from './app/useAdaptiveWorkspaceState';
import { useAdaptiveWorkspaceEntryActions } from './app/useAdaptiveWorkspaceEntryActions';
import { useAppPerfDiagnosticsRuntime } from './app/useAppPerfDiagnosticsRuntime';
import { useAdaptiveStoragePersistenceEffects } from './app/useAdaptiveStoragePersistenceEffects';
import { useDictaDebugExportEffect } from './app/useDictaDebugExportEffect';
import { useDictaSupabaseRuntime } from './app/useDictaSupabaseRuntime';
import { useSessionCreationRuntime } from './app/useSessionCreationRuntime';
import { useTtsSessionRuntime } from './app/useTtsSessionRuntime';
import { useFocusedTrainingRuntime } from './app/useFocusedTrainingRuntime';
import { useAppPresentationRuntime } from './app/useAppPresentationRuntime';
import { useTrainingRuntimeState } from './app/useTrainingRuntimeState';
import { perfDiagnostics } from './core/perfDiagnostics';
import { AppRouteRenderer } from './app/AppRouteRenderer';
import './App.css';
import {
  buildGeneratedTrainingSessionNotification,
  showGeneratedTrainingSessionNotification,
  } from './core/trainingNotifications';
import { useWorkspaceRouting } from './app/useWorkspaceRouting';
import { useOpenRouterJobsRuntime } from './app/useOpenRouterJobsRuntime';
import { useDictaUiPreferences } from './app/useDictaUiPreferences';
import { isMobileViewport } from './app/viewport';
import { useBrowserTtsRuntime } from './app/useBrowserTtsRuntime';
import { useAdaptiveRuntime } from './app/useAdaptiveRuntime';
import { formatSessionDate } from './app/sessionDateFormatters';
import { formatSessionStatus } from './app/sessionStatusFormatters';
import { formatSessionPlaybackDuration } from './app/sessionPlaybackDuration';
import {
  mapSessionInputMode,
  } from './app/appRuntimeHelpers';
import { loadSessions } from './app/sessionStorage';
import type { StoredSession } from './app/sessionTypes';

const LOCAL_DEV_FEATURES_AVAILABLE = import.meta.env.DEV;

function App() {
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
    insightsDiagnosticInputMode,
    setInsightsDiagnosticInputMode,
    insightsDiagnosticMessage,
    setInsightsDiagnosticMessage,
    insightsDiagnosticFallbackReport,
    setInsightsDiagnosticFallbackReport,
  } = useAdaptiveDiagnosticsUiState();
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
  } = useWorkspaceSessionSummaries({
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
  });
  const {
    getAdaptiveController,
    phrasePlaybackEventsRef,
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
    ensureLatestBrowserTtsDeDictationScriptFeedback,
    resetAdaptiveSessionFeedbackTracking,
  } = useAdaptiveRuntime({
    activeSession,
    activeSessionId,
    sessions,
    setAdaptiveBenchmarks: setAdaptiveBenchmarksByInputLanguage,
    adaptiveBenchmarksRef,
    adaptiveSessionFeedback: adaptiveSessionFeedbackByInputLanguage,
    setAdaptiveSessionFeedback: setAdaptiveSessionFeedbackByInputLanguage,
    adaptiveSessionFeedbackRef,
    persistAdaptiveSessionFeedbackNow: persistAndPushAdaptiveSessionFeedbackNow,
    selectedBenchmarkLanguage: dictaLanguageView,
    setSelectedBenchmarkLanguage: setDictaLanguageView,
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

  useAdaptiveStoragePersistenceEffects({
    adaptiveBenchmarksByInputLanguage,
    adaptiveBenchmarksRef,
    adaptiveSessionFeedbackByInputLanguage,
    adaptiveSessionFeedbackRef,
    localStorageReadyForEffectiveProfile,
  });

  useDictaDebugExportEffect({
    activeSessionId,
    adaptiveBenchmarksByInputLanguage,
    adaptiveSessionFeedbackByInputLanguage,
    perfDiagnosticsEnabled,
    phrasePlaybackEventsRef,
  });

  useEffect(() => {
    ensureLatestBrowserTtsDeDictationScriptFeedback(sessions);
  }, [ensureLatestBrowserTtsDeDictationScriptFeedback, sessions]);

  const {
    updateAdminProfileAccess,
  } = useAdminProfileAccessActions({
    getAuthHeaders,
    appProfile,
    setAppProfile,
    setVisibleProfiles,
  });

  const {
    deleteSession,
    openDashboardForSession,
    openWorkspaceForSession,
  } = useSessionWorkspaceActions({
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
    allowCustomSessionGeneration: isCurrentProfileAdmin || !syncConfig.authRequired,
    sessions,
    activeSession,
    openRouterAccessAllowed,
    openRouterAccessMessage,
    isOnline,
    effectiveOpenRouterDefaultModel,
    fallbackInputMode: mapSessionInputMode(activeInputMode),
    dictaLanguageView,
    adaptiveBenchmarksByInputLanguage,
    adaptiveSessionFeedbackByInputLanguage,
    recentDictationSessionHints,
    getAuthHeaders,
    ensureCanCreateDictationSession,
    showOpenRouterWorkspace,
    setOpenRouterGenerateFocusRequest,
    setOpenRouterError,
    setSelectedBenchmarkInputMode,
    setSelectedBenchmarkLanguage,
    setBenchmarkExportMessage,
    setSessionFeedbackMessage,
    trackOpenRouterJob,
    recordOpenRouterGenerationFailure,
    createOpenRouterErrorSession,
  });

  const {
    openAdaptiveExportsForActiveInput,
    openAdaptiveWorkspaceFromHeader,
  } = useAdaptiveWorkspaceEntryActions({
    activeSession,
    dictaLanguageView,
    showAdaptiveWorkspace,
    setSelectedBenchmarkInputMode,
    setSelectedBenchmarkLanguage,
    setBenchmarkExportMessage,
    setSessionFeedbackMessage,
    setAdaptiveBenchmarksFocusAnchor,
    setAdaptiveSectionExpanded,
    isMobileViewport,
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
    adaptiveBenchmarksByInputLanguage,
    adaptiveSessionFeedbackByInputLanguage,
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
    adaptiveSectionExpanded,
    adaptiveSemanticDebug,
    mapSessionInputMode,
    setAdaptiveSectionExpanded,
    setSelectedBenchmarkInputMode,
    setSelectedBenchmarkLanguage,
    setBenchmarkExportMessage,
    setExportMessage,
    setSessionFeedbackMessage,
    setInsightsDiagnosticFallbackReport,
    setInsightsDiagnosticMessage,
    adaptiveBenchmarksFocusAnchor,
    benchmarkExportMessage,
    sessionFeedbackMessage,
    formatSessionDate,
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
    themeMode,
    isOnline,
    openRouterAccessAllowed,
    isCurrentProfileAdmin,
    authRequired: syncConfig.authRequired,
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

export default App;
