import { useActiveSessionStateSync } from './app/useActiveSessionStateSync';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthWorkspaceState } from './app/useAuthWorkspaceState';
import { useAuthHeaders } from './app/useAuthHeaders';
import {
  useDictaAppProfileRuntime,
} from './app/useDictaAppProfileRuntime';
import { useThemeModeRuntime } from './app/useThemeModeRuntime';
import { useOnlineStatus } from './app/useOnlineStatus';
import { useModelPreferenceRuntime } from './app/useModelPreferenceRuntime';
import { useModelCatalogRuntime } from './app/useModelCatalogRuntime';
import { useWorkspaceModelRefreshRuntime } from './app/useWorkspaceModelRefreshRuntime';
import { useDictaLocalStorageImportRuntime } from './app/useDictaLocalStorageImportRuntime';
import { useKeyboardRemapRuntime } from './app/useKeyboardRemapRuntime';
import { useTtsPracticeInputRuntime } from './app/useTtsPracticeInputRuntime';
import { useTtsPlaybackMetricsRuntime } from './app/useTtsPlaybackMetricsRuntime';
import { useTtsPlaybackIntervalsRuntime } from './app/useTtsPlaybackIntervalsRuntime';
import { useFocusedTrainingRouteRuntime } from './app/useFocusedTrainingRouteRuntime';
import { useAdaptiveWorkspaceRouteRuntime } from './app/useAdaptiveWorkspaceRouteRuntime';
import { useSessionWorkspaceActions } from './app/useSessionWorkspaceActions';
import { useSessionQuotaActions } from './app/useSessionQuotaActions';
import { useAdminProfileAccessActions } from './app/useAdminProfileAccessActions';
import { useAdminFileInventory } from './app/useAdminFileInventory';
import { useWorkspaceSessionSummaries } from './app/useWorkspaceSessionSummaries';
import { useWorkspaceNavigationEffects } from './app/useWorkspaceNavigationEffects';
import { useOpenRouterGenerationBusyState } from './app/useOpenRouterGenerationBusyState';
import { useOpenRouterGenerationActions } from './app/useOpenRouterGenerationActions';
import { useOpenRouterErrorSessionActions } from './app/useOpenRouterErrorSessionActions';
import { useTtsPlaybackControls } from './app/useTtsPlaybackControls';
import { useTtsSessionSubmitAction } from './app/useTtsSessionSubmitAction';
import { useBrowserTtsPlaybackLoop } from './app/useBrowserTtsPlaybackLoop';
import { useResetSessionRuntime } from './app/useResetSessionRuntime';
import { useFocusedTrainingLiveMetrics } from './app/useFocusedTrainingLiveMetrics';
import { useAuthWorkspaceProps } from './app/useAuthWorkspaceProps';
import { useSessionCreateCardProps } from './app/useSessionCreateCardProps';
import { useLiveMetricsDockProps } from './app/useLiveMetricsDockProps';
import { useAdaptiveDiagnosticsUiState } from './app/useAdaptiveDiagnosticsUiState';
import { useAdaptiveWorkspaceState } from './app/useAdaptiveWorkspaceState';
import { useAdaptiveWorkspaceEntryActions } from './app/useAdaptiveWorkspaceEntryActions';
import { useAppPerfDiagnosticsRuntime } from './app/useAppPerfDiagnosticsRuntime';
import { useAdaptiveStoragePersistenceEffects } from './app/useAdaptiveStoragePersistenceEffects';
import { useDictaDebugExportEffect } from './app/useDictaDebugExportEffect';
import { useDictaSupabaseRuntime } from './app/useDictaSupabaseRuntime';
import { useSessionCreationWorkspaceState } from './app/useSessionCreationWorkspaceState';
import { useWorkspacePanelPropsRuntime } from './app/useWorkspacePanelPropsRuntime';
import { useAppShellHeaderRuntime } from './app/useAppShellHeaderRuntime';
import { perfDiagnostics } from './core/perfDiagnostics';
import { useSupabaseAuthActions } from './app/useSupabaseAuthActions';
import { useSessionCreationActions } from './app/useSessionCreationActions';
import { AppWorkspaceContent } from './app/AppWorkspaceContent';
import './App.css';
import type {
  ControlAction,
  SessionTelemetry,
  TtsPacingMode } from './types/dictation';
import { configForDifficulty,
  type Difficulty } from './core/config';
import { normalizeSessionForPersistence } from './core/sessionNormalization';
import { PerfDiagnosticsOverlay } from './components/PerfDiagnosticsOverlay';
import { TrainingView } from './components/TrainingView';
import { AppShellHeader } from './components/app-shell/AppShellHeader';
import { AuthWorkspace } from './components/auth/AuthWorkspace';
import { TrainingHeader } from './components/training/TrainingHeader';
import { SessionCreateCard } from './components/runtime-workspaces/SessionCreateCard';
import { LiveMetricsDock } from './components/runtime-workspaces/LiveMetricsDock';
import { Metric } from './components/shared/Metric';
import {
  formatInputModeLabel,
  formatSessionInputMode,
  } from './app/sessionDisplayFormatters';
import {
  getDictaSessionQuotaStatus,
  } from './core/appProfiles';
import {
  buildGeneratedTrainingSessionNotification,
  showGeneratedTrainingSessionNotification,
  } from './core/trainingNotifications';
import {
  useWorkspaceRouting,
  type WorkspaceMode,
  } from './app/useWorkspaceRouting';
import { useOpenRouterJobsRuntime } from './app/useOpenRouterJobsRuntime';
import { useDictaUiPreferences } from './app/useDictaUiPreferences';
import { isMobileViewport } from './app/viewport';
import { useBrowserTtsRuntime } from './app/useBrowserTtsRuntime';
import { useBrowserTtsSessionEnvironmentRuntime } from './app/useBrowserTtsSessionEnvironmentRuntime';
import { useSessionPersistenceSync } from './app/useSessionPersistenceSync';
import { useAdaptiveRuntime } from './app/useAdaptiveRuntime';
import {
  loadAdaptiveBenchmarks,
  loadAdaptiveSessionFeedback,
  } from './app/adaptiveStorage';
import { BROWSER_TTS_SESSION_INPUT_MODE } from './core/sessionInputModes';
import { formatSessionDate } from './app/sessionDateFormatters';
import { formatSessionStatus } from './app/sessionStatusFormatters';
import { formatDuration,
  formatSessionPlaybackDuration } from './app/sessionPlaybackDuration';
import { buildCurrentSyncState } from './app/adminStorageSummary';
import {
  mapSessionInputMode,
  } from './app/appRuntimeHelpers';
import { buildSemanticPhrasesFromDictationScript } from './app/dictationScriptSemanticPhrases';
import { buildTtsPlaybackProfile,
  type TtsLiveSignal } from './app/ttsPlaybackProfile';
import { loadSessions,
  normalizeRestoredStoredSession } from './app/sessionStorage';
import {
  buildOrderedSemanticPhrases,
  formatTtsPacingMode,
  } from './app/ttsPacingHelpers';
import type { SemanticPhrase } from './core/adaptive/SemanticPhrasePlanner';
import type {
  PerformanceTrend,
  SessionStatus,
  StoredSession,
  TtsLanguage,
  TtsPublishedUiState,
  TtsStatus,
} from './app/sessionTypes';

const TTS_BASE_WORDS_PER_SECOND = 2.6;
const LOCAL_DEV_FEATURES_AVAILABLE = import.meta.env.DEV;

function App() {
  const perfDiagnosticsEnabled = useAppPerfDiagnosticsRuntime();
  const [sessions, setSessions] = useState<StoredSession[]>(() => loadSessions());
  const [activeSessionId, setActiveSessionId] = useState<string>(() => loadSessions()[0]?.id ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('ready');
  const [controllerState, setControllerState] = useState<ControlAction>('hold');
  const [rate, setRate] = useState(1);
  const [lagSec, setLagSec] = useState(0);
  const [lagWords, setLagWords] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [trend, setTrend] = useState<PerformanceTrend>('stable');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [exportMessage, setExportMessage] = useState('');
  const [trainingSubmitMessage, setTrainingSubmitMessage] = useState('');
  const [inputSettingsLocked, setInputSettingsLocked] = useState(false);
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
  const {
    openRouterGenerateFocusRequest,
    setOpenRouterGenerateFocusRequest,
    sessionCreationMode,
    setSessionCreationMode,
    sessionCreationSource,
    setSessionCreationSource,
    changeSessionCreationSource,
    sessionCreationName,
    setSessionCreationName,
    dictationScriptJson,
    setDictationScriptJson,
    changeDictationScriptJson,
    dictationScriptValidation,
    setDictationScriptValidation,
    cancelSessionCreation,
  } = useSessionCreationWorkspaceState();
  const { themeMode, setThemeMode } = useThemeModeRuntime();
  const [ttsText, setTtsText] = useState('');

  const [ttsLanguage, setTtsLanguage] = useState<TtsLanguage>('de');
  const {
    browserTtsVoices,
    isBrowserTtsSupported,
    speakBrowserTts,
    resumeBrowserTts,
    cancelBrowserTts,
  } = useBrowserTtsRuntime();
  const [ttsPracticeText, setTtsPracticeText] = useState('');
  const [ttsStatus, setTtsStatus] = useState<TtsStatus>('idle');
  const [ttsCurrentChunk, setTtsCurrentChunk] = useState('');
  const [ttsPlayerProgressTick, setTtsPlayerProgressTick] = useState(0);
  const [ttsPacingMode, setTtsPacingMode] = useState<TtsPacingMode>('balanced');
  const [ttsSpeechRate, setTtsSpeechRate] = useState(1);

  const suppressSidebarAutoSelectRef = useRef(false);
  const hydratingSessionIdRef = useRef<string | null>(null);
  const allowFinishedSessionResetRef = useRef<string | null>(null);
  const {
    openRouterDefaultModel,
    setOpenRouterDefaultModel,
  } = useModelPreferenceRuntime();

  useEffect(() => {
    ttsPracticeLiveTextRef.current = ttsPracticeText;
  }, [ttsPracticeText]);

  const {
    directOpenRouterBusy,
    setDirectOpenRouterBusy,
    directIntermediateOpenRouterBusy,
    setDirectIntermediateOpenRouterBusy,
    directAdvancedOpenRouterBusy,
    setDirectAdvancedOpenRouterBusy,
    expressEasyOpenRouterBusy,
    setExpressEasyOpenRouterBusy,
    expressIntermediateOpenRouterBusy,
    setExpressIntermediateOpenRouterBusy,
    expressAdvancedOpenRouterBusy,
    setExpressAdvancedOpenRouterBusy,
  } = useOpenRouterGenerationBusyState();
  const {
    openRouterModels,
    openRouterStatus,
    openRouterError,
    setOpenRouterError,
    refreshOpenRouterModels: refreshOpenRouterModelCatalog,
  } = useModelCatalogRuntime();
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
    setAuthSession,
    authLoading,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authError,
    setAuthError,
    authView,
    setAuthView,
    authNewPassword,
    setAuthNewPassword,
    authNewPasswordConfirm,
    setAuthNewPasswordConfirm,
    authMessage,
    setAuthMessage,
    authMessageTone,
    setAuthMessageTone,
    authBusy,
    setAuthBusy,
  } = useAuthWorkspaceState({
    authRequired: syncConfig.authRequired,
    supabaseClient,
  });
  const {
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
  } = useDictaAppProfileRuntime({
    syncConfig,
    supabaseClient,
    authSession,
    authLoading,
  });
  const {
    signInWithSupabase,
    showAuthView,
    requestSupabasePasswordReset,
    updateSupabasePassword,
    signOut,
  } = useSupabaseAuthActions({
    supabaseClient,
    authSession,
    authEmail,
    authPassword,
    authNewPassword,
    authNewPasswordConfirm,
    setAuthSession,
    setAppProfile,
    setAuthEmail,
    setAuthPassword,
    setAuthNewPassword,
    setAuthNewPasswordConfirm,
    setAuthView,
    setAuthError,
    setAuthMessage,
    setAuthMessageTone,
    setAuthBusy,
  });
  const {
    getAuthHeaders,
  } = useAuthHeaders({
    authSession,
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
  } = useSessionPersistenceSync({
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    syncConfig,
    supabaseClient,
    effectiveProfileId,
    profileDisplayName: appProfile?.displayName,
    adaptiveBenchmarks: adaptiveBenchmarksByInputLanguage,
    setAdaptiveBenchmarks: setAdaptiveBenchmarksByInputLanguage,
    adaptiveBenchmarksRef,
    adaptiveSessionFeedback: adaptiveSessionFeedbackByInputLanguage,
    setAdaptiveSessionFeedback: setAdaptiveSessionFeedbackByInputLanguage,
    adaptiveSessionFeedbackRef,
    loadSessions,
    loadAdaptiveBenchmarks,
    loadAdaptiveSessionFeedback,
    normalizeSessionForPersistence,
    normalizeRestoredSession: normalizeRestoredStoredSession,
    buildSyncState: buildCurrentSyncState,
    onQuotaRecovered: setError,
    onProfileStorageSwitched: () => {
      clearDashboardSession();
      resetOpenRouterJobsRuntimeRef.current();
    },
  });
  const sessionQuotaStatus = getDictaSessionQuotaStatus(syncConfig.authRequired ? appProfile : null, sessions.length);
  const {
    ensureCanCreateDictationSession,
  } = useSessionQuotaActions({
    sessionQuotaStatus,
    setError,
    setOpenRouterError,
    setExportMessage,
  });

  const {
    createSessionWithMode,
    validateScriptImport,
    createSessionFromDictationScript,
    createSessionFromOpenRouterScript,
  } = useSessionCreationActions({
    sessionCreationName,
    dictationScriptJson,
    dictationScriptValidation,
    browserTtsVoices,
    suppressSidebarAutoSelectRef,
    ensureCanCreateDictationSession,
    prependSessionAndPersistNow,
    showSessionInputWorkspace,
    showLeaderboardWorkspace,
    setActiveSessionId,
    setLeaderboardLanguageView,
    setSessionCreationMode,
    setSessionCreationSource,
    setSessionCreationName,
    setDictationScriptJson,
    setDictationScriptValidation,
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
  const previousLagRef = useRef(0);
  const previousAccuracyRef = useRef(100);
  const ttsPracticeLiveTextRef = useRef('');

  const ttsUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const telemetryRef = useRef<SessionTelemetry | null>(null);
  const ttsStartedAtMsRef = useRef<number | null>(null);
  const ttsChunkStartMsRef = useRef<number | null>(null);
  const ttsChunkStartWordIndexRef = useRef(0);
  const ttsChunkWordCountRef = useRef(0);
  const ttsCompletedSourceWordsRef = useRef(0);
  const ttsPausedAtWordIndexRef = useRef<number | null>(null);
  const ttsLagOutlierCountRef = useRef(0);
  const ttsLastValidControlLagSecRef = useRef(0);
  const ttsUnsafeChunkCountRef = useRef(0);
  const ttsChunkAccuracyWindowRef = useRef<number[]>([]);
  const ttsLastAccuracySnapshotRef = useRef({ typedWords: 0, matchedWords: 0 });
  const ttsLastControllerActionRef = useRef<ControlAction>('hold');
  const applyTtsPerformanceSampleRef = useRef<() => void>(() => undefined);
  const stopTtsPlaybackRef = useRef<() => void>(() => undefined);
  const ttsSemanticPhraseAdvanceCountRef = useRef(0);
  const ttsSemanticPhraseReplayCountRef = useRef(0);
  const ttsLiveSignalRef = useRef<TtsLiveSignal>({
    accuracy: 100,
    lagSec: 0,
    rawLagSec: 0,
    stableLagSec: 0,
    lagOutlierCount: 0,
    wpm: 0,
    trend: 'stable',
    controllerState: 'hold',
  });
  const ttsUiLastPublishedAtRef = useRef(0);
  const ttsPublishedUiRef = useRef<TtsPublishedUiState>({
    controllerState: 'hold',
    rate: 1,
    lagSec: 0,
    lagWords: 0,
    wpm: 0,
    accuracy: 100,
    trend: 'stable',
  });

  const config = useMemo(() => configForDifficulty(difficulty), [difficulty]);
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );
  const dashboardSession = useMemo(
    () => sessions.find((session) => session.id === dashboardSessionId) ?? activeSession,
    [activeSession, dashboardSessionId, sessions],
  );
  const activeInputMode = activeSession?.inputMode ?? BROWSER_TTS_SESSION_INPUT_MODE;
  const activeInputLabel =
    activeInputMode === BROWSER_TTS_SESSION_INPUT_MODE
      ? 'Input # 2 - Text to Speech (TTS)'
      : 'Browser TTS';
  const activeInputWorkspaceMode: WorkspaceMode = 'tts';
  const activeSessionFinished = sessionStatus === 'finished' || activeSession?.status === 'finished';
  const {
    collectBrowserTtsEnvironmentForSession,
    resolveBrowserTtsVoiceForSession,
    resolveActiveBrowserTtsVoice,
  } = useBrowserTtsSessionEnvironmentRuntime({
    activeSession,
    browserTtsVoices,
    setSessions,
    ttsLanguage,
  });

  const {
    assignedOpenRouterModel,
    effectiveOpenRouterDefaultModel,
    refreshOpenRouterModels,
  } = useWorkspaceModelRefreshRuntime({
    syncConfig,
    appProfile,
    getAuthHeaders,
    openRouterDefaultModel,
    setOpenRouterDefaultModel,
    refreshOpenRouterModelCatalog,
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
  const ttsPlaybackProfile = useMemo(
    () => buildTtsPlaybackProfile(sessions, activeSession),
    [sessions, activeSession],
  );
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
    ttsHasText,
    ttsTranscript,
    activePoints,
    activeVisibleAccuracy,
    activeVisibleScore,
    activeLivePointsLabel,
    activeLiveScoreHelpText,
    activeLivePointsHelpText,
    activeLiveAccuracyHelpText,
  } = useFocusedTrainingLiveMetrics({
    activeInputMode,
    ttsText,
    ttsPracticeText,
    lagSec,
    wpm,
    rate,
  });

  useTtsPlaybackIntervalsRuntime({
    activeInputMode,
    activeSessionFinished,
    ttsHasText,
    ttsStatus,
    tickMs: config.tickMs,
    applyTtsPerformanceSampleRef,
    setTtsPlayerProgressTick,
  });

  useActiveSessionStateSync({
    sessions,
    setSessions,
    activeSession,
    activeSessionId,
    activeVisibleAccuracy,
    activeVisibleScore,
    activePoints,
    difficulty,
    inputSettingsLocked,
    ttsText,
    ttsLanguage,
    ttsPracticeText,
    sessionStatus,
    controllerState,
    running,
    rate,
    lagSec,
    lagWords,
    wpm,
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
    ttsUnsafeChunkCountRef,
    ttsChunkAccuracyWindowRef,
    ttsLastAccuracySnapshotRef,
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
  });

  const {
    updateAdminProfileAccess,
  } = useAdminProfileAccessActions({
    getAuthHeaders,
    appProfile,
    setAppProfile,
    setVisibleProfiles,
  });

  function buildSemanticPhrasesForCurrentSession(text: string, language: string | undefined, mode: TtsPacingMode): SemanticPhrase[] {
    if (activeSession?.sessionSource === 'dictationScript' && activeSession.dictationScript) {
      return buildSemanticPhrasesFromDictationScript(activeSession.dictationScript);
    }
    return buildOrderedSemanticPhrases(text, language, mode);
  }

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
    getActiveTypingLanguage,
    handleEsKeyboardRemapKeyDown,
  } = useKeyboardRemapRuntime({
    activeInputMode,
    inputSettingsLocked,
    ttsLanguage,
  });

  const {
    onTtsPracticeChange,
    onTtsPracticeKeyDown,
  } = useTtsPracticeInputRuntime({
    activeSessionFinished,
    telemetryRef,
    ttsStartedAtMsRef,
    ttsPracticeLiveTextRef,
    setTtsPracticeText,
    handleEsKeyboardRemapKeyDown,
  });

  const {
    openOpenRouterGenerateForActiveInput,
    generateEasyNextSessionFromOpenRouter,
    generateIntermediateNextSessionFromOpenRouter,
    generateAdvancedNextSessionFromOpenRouter,
    generateExpressEasyNextSessionFromOpenRouter,
    generateExpressIntermediateNextSessionFromOpenRouter,
    generateExpressAdvancedNextSessionFromOpenRouter,
  } = useOpenRouterGenerationActions({
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
    directOpenRouterBusy,
    setDirectOpenRouterBusy,
    directIntermediateOpenRouterBusy,
    setDirectIntermediateOpenRouterBusy,
    directAdvancedOpenRouterBusy,
    setDirectAdvancedOpenRouterBusy,
    expressEasyOpenRouterBusy,
    setExpressEasyOpenRouterBusy,
    expressIntermediateOpenRouterBusy,
    setExpressIntermediateOpenRouterBusy,
    expressAdvancedOpenRouterBusy,
    setExpressAdvancedOpenRouterBusy,
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
    ensureAttemptTelemetry,
    recordTtsTelemetryAction,
    recordTtsChunkTelemetry,
    estimateTtsSpokenWordIndex,
    applyTtsPerformanceSample,
  } = useTtsPlaybackMetricsRuntime({
    ttsTranscript,
    ttsStatus,
    ttsSpeechRate,
    ttsLanguage,
    controllerState,
    rate,
    lagSec,
    lagWords,
    wpm,
    accuracy,
    trend,
    telemetryRef,
    ttsStartedAtMsRef,
    ttsPracticeLiveTextRef,
    ttsChunkStartMsRef,
    ttsChunkWordCountRef,
    ttsChunkStartWordIndexRef,
    ttsCompletedSourceWordsRef,
    ttsLastValidControlLagSecRef,
    ttsLagOutlierCountRef,
    ttsLiveSignalRef,
    previousLagRef,
    previousAccuracyRef,
    ttsLastControllerActionRef,
    ttsPublishedUiRef,
    ttsUiLastPublishedAtRef,
    applyTtsPerformanceSampleRef,
    setControllerState,
    setRate,
    setLagSec,
    setLagWords,
    setWpm,
    setAccuracy,
    setTrend,
    baseWordsPerSecond: TTS_BASE_WORDS_PER_SECOND,
  });

  const {
    playTts,
    playTtsFromWord,
  } = useBrowserTtsPlaybackLoop({
    activeSessionFinished,
    activeSession,
    ttsStatus,
    ttsText,
    ttsLanguage,
    ttsPacingMode,
    ttsSpeechRate,
    ttsTranscript,
    browserTtsVoices,
    ttsPlaybackProfile,
    perfDiagnostics,
    stopTtsPlaybackRef,
    ttsPausedAtWordIndexRef,
    ttsCompletedSourceWordsRef,
    ttsStartedAtMsRef,
    ttsLagOutlierCountRef,
    ttsLastValidControlLagSecRef,
    ttsUnsafeChunkCountRef,
    ttsChunkAccuracyWindowRef,
    ttsLastAccuracySnapshotRef,
    ttsLastControllerActionRef,
    ttsLiveSignalRef,
    ttsPracticeLiveTextRef,
    ttsUtteranceRef,
    ttsChunkStartMsRef,
    ttsChunkStartWordIndexRef,
    ttsChunkWordCountRef,
    ttsSemanticPhraseAdvanceCountRef,
    ttsSemanticPhraseReplayCountRef,
    buildSemanticPhrasesForCurrentSession,
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
    estimateTtsSpokenWordIndex,
    ensureAttemptTelemetry,
    recordTtsTelemetryAction,
    recordTtsChunkTelemetry,
    applyTtsPerformanceSample,
    setAdaptiveSemanticDebug,
    setTtsCurrentChunk,
    setTtsPacingMode,
    setTtsSpeechRate,
    setTtsStatus,
    setRunning,
    setSessionStatus,
    setError,
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
    pauseTts,
    resumeTts,
    stopTtsPlayback,
    seekTtsPlayback,
  } = useTtsPlaybackControls({
    activeInputMode,
    activeSessionFinished,
    ttsHasText,
    ttsStatus,
    ttsText,
    ttsPracticeText,
    ttsTranscriptWordCount: ttsTranscript?.words.length ?? 0,
    isBrowserTtsSupported,
    cancelBrowserTts,
    resumeBrowserTts,
    estimateTtsSpokenWordIndex,
    playTtsFromWord,
    recordTtsTelemetryAction,
    ttsStartedAtMsRef,
    ttsUtteranceRef,
    ttsChunkStartMsRef,
    ttsCompletedSourceWordsRef,
    ttsPausedAtWordIndexRef,
    setTtsCurrentChunk,
    setTtsPacingMode,
    setTtsSpeechRate,
    setRunning,
    setSessionStatus,
    setTtsStatus,
    setTtsPlayerProgressTick,
  });

  const resetSession = useResetSessionRuntime({
    activeSession,
    activeInputMode,
    inputSettingsLocked,
    ttsText,
    stopTtsPlayback,
    resetAdaptiveSessionFeedbackTracking,
    allowFinishedSessionResetRef,
    ttsPracticeLiveTextRef,
    ttsStartedAtMsRef,
    ttsChunkStartMsRef,
    ttsChunkStartWordIndexRef,
    ttsChunkWordCountRef,
    ttsCompletedSourceWordsRef,
    ttsLastControllerActionRef,
    ttsUiLastPublishedAtRef,
    ttsPublishedUiRef,
    telemetryRef,
    setTtsPracticeText,
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
    setControllerState,
    setSessionStatus,
    setTrainingSubmitMessage,
    setInputSettingsLocked,
  });

  const submitTtsSession = useTtsSessionSubmitAction({
    activeInputMode,
    ttsHasText,
    ttsPracticeText,
    ttsLanguage,
    sessions,
    activeSessionId,
    activeSession,
    applyTtsPerformanceSample,
    resolveBrowserTtsVoiceForSession,
    collectBrowserTtsEnvironmentForSession,
    persistAndPushSessionsNow,
    stopTtsPlayback,
    completeAdaptiveSessionFeedback,
    setTtsPracticeText,
    setSessions,
    setRunning,
    setSessionStatus,
    setTtsStatus,
    setError,
    setTrainingSubmitMessage,
  });

  stopTtsPlaybackRef.current = stopTtsPlayback;

  const { focusedTrainingProps } = useFocusedTrainingRouteRuntime({
    activeInputMode,
    activeSession,
    activeTrainingSubmissionMeta,
    activeInputLabel,
    sessionStatus,
    ttsStatus,
    running,
    inputSettingsLocked,
    activeVisibleScore,
    activeLiveScoreHelpText,
    activeLivePointsLabel,
    activeLivePointsHelpText,
    activeVisibleAccuracy,
    activeLiveAccuracyHelpText,
    lagSec,
    activeSessionFinished,
    ttsHasText,
    error,
    trainingSubmitMessage,
    exportMessage,
    openRouterJobStatus,
    openRouterError,
    ttsTranscript,
    estimateTtsSpokenWordIndex,
    ttsSpeechRate,
    ttsLanguage,
    adaptiveSemanticDebug,
    ttsPracticeText,
    ttsPlayerProgressTick,
    seekTtsPlayback,
    resetSession,
    playTts,
    resumeTts,
    pauseTts,
    stopTtsPlayback,
    onTtsPracticeChange,
    onTtsPracticeKeyDown,
    submitTtsSession,
    setInputSettingsLocked,
    setError,
    setExportMessage,
    telemetryRef,
    ttsStartedAtMsRef,
    ttsPracticeLiveTextRef,
    pendingSessions,
    activeSessionId,
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
  const sessionCreationNameTrimmed = sessionCreationName.trim();
  const canCreateSessionFromDialog = sessionCreationNameTrimmed.length > 0 && !sessionQuotaStatus.blocked;
  const validatedDictationScript = dictationScriptValidation?.ok ? dictationScriptValidation.script : null;
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
  } = useWorkspacePanelPropsRuntime({
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
  });

  const { appShellHeaderProps } = useAppShellHeaderRuntime({
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
  });

  const authWorkspaceProps = useAuthWorkspaceProps({
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
    onSignIn: signInWithSupabase,
    onRequestPasswordReset: requestSupabasePasswordReset,
    onUpdatePassword: updateSupabasePassword,
    onSignOut: signOut,
    onShowAuthView: showAuthView,
    onAuthEmailChange: setAuthEmail,
    onAuthPasswordChange: setAuthPassword,
    onAuthNewPasswordChange: setAuthNewPassword,
    onAuthNewPasswordConfirmChange: setAuthNewPasswordConfirm,
  });

  const sessionCreateCardProps = useSessionCreateCardProps({
    sessionCreationSource,
    sessionCreationName,
    sessionQuotaStatus,
    canCreateSessionFromDialog,
    localDevFeaturesAvailable: LOCAL_DEV_FEATURES_AVAILABLE,
    allowDictationScriptCreation: isCurrentProfileAdmin || !syncConfig.authRequired,
    dictationScriptJson,
    dictationScriptValidation,
    validatedDictationScript,
    onSessionCreationSourceChange: changeSessionCreationSource,
    onSessionCreationNameChange: setSessionCreationName,
    onCreateSessionWithMode: createSessionWithMode,
    onDictationScriptJsonChange: changeDictationScriptJson,
    onValidateScriptImport: validateScriptImport,
    onCreateSessionFromDictationScript: createSessionFromDictationScript,
    onCancel: cancelSessionCreation,
    MetricComponent: Metric,
  });

  const liveMetricsDockProps = useLiveMetricsDockProps({
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
    formatInputModeLabel,
    formatSessionInputMode,
    formatDuration,
    formatSessionDate,
    formatTtsPacingMode,
  });

  if (
    syncConfig.authRequired &&
    (
      authLoading ||
      authView === 'updatePassword' ||
      !authSession ||
      !appProfile ||
      appProfileError ||
      !localStorageReadyForEffectiveProfile ||
      supabaseInitialSyncPending
    )
  ) {
    return (
      <AuthWorkspace {...authWorkspaceProps} />
    );
  }

  if (isFocusedTrainingRoute) {
    return (
      <main className={`app training-route-app ${themeMode === 'dark' ? 'app-theme-dark' : 'app-theme-light'}`}>
        <TrainingHeader
          selectedLanguage={dictaLanguageView}
          onChangeLanguage={setDictaLanguageView}
          onBackToApp={() => navigateAppRoute('/')}
        />
        <TrainingView {...focusedTrainingProps} />
        <PerfDiagnosticsOverlay enabled={perfDiagnosticsEnabled} />
      </main>
    );
  }

  return (
    <main className={`app ${themeMode === 'dark' ? 'app-theme-dark' : 'app-theme-light'}`}>
      <section className="layout">
        <AppShellHeader {...appShellHeaderProps}>
          {sessionCreationMode ? (
            <SessionCreateCard {...sessionCreateCardProps} />
          ) : null}
        </AppShellHeader>
        <AppWorkspaceContent
          pendingSessions={pendingSessions}
          activeSessionId={activeSessionId}
          onOpenPendingSession={openWorkspaceForSession}
          onDeleteSession={deleteSession}
          workspaceMode={workspaceMode}
          dashboardSession={dashboardSession}
          sessions={sessions}
          formatSessionStatus={formatSessionStatus}
          formatSessionDate={formatSessionDate}
          formatSessionPlaybackDuration={formatSessionPlaybackDuration}
          onBackToTraining={showLeaderboardWorkspace}
          adaptiveAdvancedDiagnosticsProps={adaptiveAdvancedDiagnosticsProps}
          adaptiveBenchmarkSectionProps={adaptiveBenchmarkSectionProps}
          openRouterAccessState={openRouterAccessState}
          openRouterAccessMessage={openRouterAccessMessage}
          openRouterWorkspaceProps={openRouterWorkspaceProps}
          canAccessAdminWorkspace={isCurrentProfileAdmin || !syncConfig.authRequired}
          adminWorkspaceProps={adminWorkspaceProps}
          leaderboardWorkspaceProps={leaderboardWorkspaceProps}
        />
      </section>
      <LiveMetricsDock {...liveMetricsDockProps} />
    </main>
  );
}

export default App;
