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
import { useSessionWorkspaceActions } from './app/useSessionWorkspaceActions';
import { useSessionQuotaActions } from './app/useSessionQuotaActions';
import { useAdminProfileAccessActions } from './app/useAdminProfileAccessActions';
import { useAdminFileInventory } from './app/useAdminFileInventory';
import { useWorkspaceSessionSummaries } from './app/useWorkspaceSessionSummaries';
import { useWorkspaceNavigationEffects } from './app/useWorkspaceNavigationEffects';
import { useOpenRouterGenerationBusyState } from './app/useOpenRouterGenerationBusyState';
import { useOpenRouterGenerationActions } from './app/useOpenRouterGenerationActions';
import { useOpenRouterErrorSessionActions } from './app/useOpenRouterErrorSessionActions';
import { useFocusedTrainingGenerationButtons } from './app/useFocusedTrainingGenerationButtons';
import { useFocusedTrainingPresentationState } from './app/useFocusedTrainingPresentationState';
import { useFocusedTrainingInputTelemetryRuntime } from './app/useFocusedTrainingInputTelemetryRuntime';
import { useTtsPlaybackControls } from './app/useTtsPlaybackControls';
import { useTtsSessionSubmitAction } from './app/useTtsSessionSubmitAction';
import { useBrowserTtsPlaybackLoop } from './app/useBrowserTtsPlaybackLoop';
import { useResetSessionRuntime } from './app/useResetSessionRuntime';
import { useFocusedTrainingViewProps } from './app/useFocusedTrainingViewProps';
import { useFocusedTrainingLiveMetrics } from './app/useFocusedTrainingLiveMetrics';
import { useOpenRouterWorkspaceProps } from './app/useOpenRouterWorkspaceProps';
import { useAppShellHeaderProps } from './app/useAppShellHeaderProps';
import { useAppShellSyncStatusText } from './app/useAppShellSyncStatusText';
import { useAuthWorkspaceProps } from './app/useAuthWorkspaceProps';
import { useSessionCreateCardProps } from './app/useSessionCreateCardProps';
import { useAdminWorkspaceProps } from './app/useAdminWorkspaceProps';
import { useLeaderboardWorkspaceProps } from './app/useLeaderboardWorkspaceProps';
import { useAdaptiveAdvancedDiagnosticsProps } from './app/useAdaptiveAdvancedDiagnosticsProps';
import { useAdaptiveBenchmarkSectionProps } from './app/useAdaptiveBenchmarkSectionProps';
import { useLiveMetricsDockProps } from './app/useLiveMetricsDockProps';
import { useAdaptiveDiagnosticsUiState } from './app/useAdaptiveDiagnosticsUiState';
import { useAdaptiveWorkspaceState } from './app/useAdaptiveWorkspaceState';
import { useAdaptiveWorkspaceEntryActions } from './app/useAdaptiveWorkspaceEntryActions';
import { useAdaptiveWorkspacePresentationState } from './app/useAdaptiveWorkspacePresentationState';
import { useAppPerfDiagnosticsRuntime } from './app/useAppPerfDiagnosticsRuntime';
import { useAdaptiveStoragePersistenceEffects } from './app/useAdaptiveStoragePersistenceEffects';
import { useDictaDebugExportEffect } from './app/useDictaDebugExportEffect';
import { useDictaSupabaseRuntime } from './app/useDictaSupabaseRuntime';
import { useSessionCreationWorkspaceState } from './app/useSessionCreationWorkspaceState';
import { perfDiagnostics } from './core/perfDiagnostics';
import { useAdaptiveExportActions } from './app/useAdaptiveExportActions';
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
import {
  buildSessionPointsHelpText,
  computeSessionMaxPoints,
  formatSessionPointsForSession,
} from './core/evaluation';
import { buildSessionScoreHelpText } from './core/sessionScore';
import { normalizeSessionForPersistence } from './core/sessionNormalization';
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  } from './core/languages';
import { PerfDiagnosticsOverlay } from './components/PerfDiagnosticsOverlay';
import { TrainingView } from './components/TrainingView';
import { AppShellHeader } from './components/app-shell/AppShellHeader';
import { AuthWorkspace } from './components/auth/AuthWorkspace';
import { TrainingHeader } from './components/training/TrainingHeader';
import { SessionCreateCard } from './components/runtime-workspaces/SessionCreateCard';
import { LiveMetricsDock } from './components/runtime-workspaces/LiveMetricsDock';
import { Metric } from './components/shared/Metric';
import { SessionDeviceIcon } from './components/shared/SessionDeviceIcon';
import {
  formatInputModeLabel,
  formatSessionGenerationOrigin,
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
  buildBuildInfoLabel,
  buildBuildInfoTitle,
  type DictaBuildInfo,
  } from './core/buildInfo';
import {
  useWorkspaceRouting,
  type WorkspaceMode,
  } from './app/useWorkspaceRouting';
import { useOpenRouterJobsRuntime } from './app/useOpenRouterJobsRuntime';
import { useDictaUiPreferences } from './app/useDictaUiPreferences';
import { isMobileViewport } from './app/viewport';
import { useTrainingSessionLifecycle } from './app/useTrainingSessionLifecycle';
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
import { getSessionDisplayTitle } from './app/sessionDisplayTitle';
import { formatLeaderboardSessionStatus } from './app/sessionLeaderboardFormatters';
import { formatDuration,
  formatSessionPlaybackDuration } from './app/sessionPlaybackDuration';
import { formatSupabaseSyncState } from './app/supabaseSyncPresentation';
import { buildCurrentSyncState } from './app/adminStorageSummary';
import { isSessionReadyForTraining } from './app/sessionTrainingReadiness';
import {
  mapSessionInputMode,
  } from './app/appRuntimeHelpers';
import { buildRepeatWordStats } from './app/repeatWordStats';
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

declare const __DICTA_BUILD_INFO__: DictaBuildInfo;

const TTS_BASE_WORDS_PER_SECOND = 2.6;
const LOCAL_DEV_FEATURES_AVAILABLE = import.meta.env.DEV;
const DICTA_BUILD_INFO = __DICTA_BUILD_INFO__;
const DICTA_BUILD_INFO_LABEL = buildBuildInfoLabel(DICTA_BUILD_INFO);
const DICTA_BUILD_INFO_TITLE = buildBuildInfoTitle(DICTA_BUILD_INFO);

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

  useEffect(() => {
    if (activeInputMode !== BROWSER_TTS_SESSION_INPUT_MODE || activeSessionFinished || !ttsHasText) {
      return;
    }

    if (ttsStatus !== 'playing') {
      return;
    }

    const id = window.setInterval(() => {
      applyTtsPerformanceSampleRef.current();
    }, config.tickMs);

    return () => window.clearInterval(id);
  }, [
    activeInputMode,
    config.tickMs,
    activeSessionFinished,
    ttsHasText,
    ttsStatus,
  ]);

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

  useEffect(() => {
    if (ttsStatus !== 'playing') return;
    const interval = window.setInterval(() => setTtsPlayerProgressTick((value) => value + 1), 500);
    return () => window.clearInterval(interval);
  }, [ttsStatus]);

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

  const { focusedTrainingControls } = useTrainingSessionLifecycle({
    state: {
      activeInputMode,
      activeSessionPresent: Boolean(activeSession),
      activeSessionFinished,
      sessionStatus,
      running,
      ttsHasText,
      ttsStatus,
      inputSettingsLocked,
    },
    text: {
      ttsPracticeText,
    },
    actions: {
      resetSession,
      playTts,
      resumeTts,
      pauseTts,
      stopTts: stopTtsPlayback,
      onTtsPracticeChange,
      submitTtsSession,
      setInputSettingsLocked,
      setError,
      setExportMessage,
      collapseSetupPanels: () => undefined,
    },
  });
  void ttsPlayerProgressTick;
  const {
    ttsPlayerDurationSec,
    ttsPlayerProgressPercent,
    focusedProgressLabel,
    focusedSourceLabel,
    focusedTextValue,
    focusedTextPlaceholder,
    focusedTrainingMessage,
    focusedTrainingMessageTone,
  } = useFocusedTrainingPresentationState({
    ttsTranscriptWordCount: ttsTranscript?.words.length ?? 0,
    ttsHasText,
    ttsSpokenWordIndex: ttsHasText ? estimateTtsSpokenWordIndex() : 0,
    ttsSpeechRate,
    ttsLanguage,
    ttsBaseWordsPerSecond: TTS_BASE_WORDS_PER_SECOND,
    adaptiveSemanticCurrentPhraseIndex: adaptiveSemanticDebug.currentPhraseIndex,
    adaptiveSemanticTotalPhrases: adaptiveSemanticDebug.totalSemanticPhrases,
    activeSessionFinished,
    ttsPracticeText,
    error,
    trainingSubmitMessage,
    exportMessage,
    openRouterJobStatus,
    openRouterError,
  });
  const sessionCreationNameTrimmed = sessionCreationName.trim();
  const canCreateSessionFromDialog = sessionCreationNameTrimmed.length > 0 && !sessionQuotaStatus.blocked;
  const validatedDictationScript = dictationScriptValidation?.ok ? dictationScriptValidation.script : null;
  const {
    adaptiveAdapters,
    selectedBenchmarkProfile,
    selectedSessionFeedback,
    insightsDiagnosticProfile,
    insightsDiagnosticFeedback,
    insightsDiagnosticInputOptions,
    latestAdaptiveMode,
    latestInputAdapter,
  } = useAdaptiveWorkspacePresentationState({
    adaptiveBenchmarksByInputLanguage,
    adaptiveSessionFeedbackByInputLanguage,
    selectedBenchmarkInputMode,
    selectedBenchmarkLanguage,
    insightsDiagnosticInputMode,
    metricsLanguageView,
    latestSession,
  });
  const {
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
  } = useAdaptiveExportActions({
    sessions,
    activeSession,
    activeSessionFinished,
    sessionStatus,
    getActiveTypingLanguage,
    insightsDiagnosticProfile,
    insightsDiagnosticFeedback,
    insightsDiagnosticInputMode,
    metricsLanguageView,
    setBenchmarkExportMessage,
    setExportMessage,
    setSessionFeedbackMessage,
    setInsightsDiagnosticFallbackReport,
    setInsightsDiagnosticMessage,
  });
  const repeatWordStats = useMemo(
    () => buildRepeatWordStats({ sessions, inputMode: selectedBenchmarkInputMode, language: selectedBenchmarkLanguage, now: new Date() }),
    [sessions, selectedBenchmarkInputMode, selectedBenchmarkLanguage],
  );
  const isFocusedTrainingRoute = currentPath === '/training' || currentPath === '/training/';
  const focusedInputHandler = onTtsPracticeChange;
  const focusedImmediateInputHandler = useFocusedTrainingInputTelemetryRuntime({
    telemetryRef,
    ttsStartedAtMsRef,
    ttsPracticeLiveTextRef,
  });
  const focusedKeyDownHandler = onTtsPracticeKeyDown;
  const focusedTrainingGenerationButtons = useFocusedTrainingGenerationButtons({
    allowCustomSessionGeneration: isCurrentProfileAdmin || !syncConfig.authRequired,
    openRouterAccessAllowed,
    isOnline,
    activeSession,
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

  function replayFocusedTts(): void {
    seekTtsPlayback(Math.max(0, ttsPlayerProgressPercent / 100 - 0.08));
  }

  const focusedTrainingProps = useFocusedTrainingViewProps({
    activeSession,
    submissionMeta: activeTrainingSubmissionMeta,
    activeInputLabel,
    sessionStatus,
    sourceLabel: focusedSourceLabel,
    progressLabel: focusedProgressLabel,
    statusLabel: ttsStatus,
    currentTextValue: focusedTextValue,
    onTextChange: focusedInputHandler,
    onImmediateTextChange: focusedImmediateInputHandler,
    onTextKeyDown: focusedKeyDownHandler,
    textPlaceholder: focusedTextPlaceholder,
    activeVisibleScore,
    liveScoreHelpText: activeLiveScoreHelpText,
    livePointsLabel: activeLivePointsLabel,
    livePointsHelpText: activeLivePointsHelpText,
    activeVisibleAccuracy,
    liveAccuracyHelpText: activeLiveAccuracyHelpText,
    lagSec,
    activeSessionFinished,
    focusedTrainingControls,
    ttsHasText,
    ttsPlayerDurationSec,
    onReplayFocusedTts: replayFocusedTts,
    message: focusedTrainingMessage,
    messageTone: focusedTrainingMessageTone,
    pendingSessions,
    activeSessionId,
    onOpenPendingSession: openWorkspaceForSession,
    onDeletePendingSession: deleteSession,
    syncStatus: supabaseSyncStatus,
    pendingSyncSummary,
    isOnline,
    generationButtons: focusedTrainingGenerationButtons,
  });

  void openAdaptiveExportsForActiveInput;

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

  const adaptiveAdvancedDiagnosticsProps = useAdaptiveAdvancedDiagnosticsProps({
    adaptiveSectionExpanded,
    adaptiveAdapters,
    latestSession,
    latestInputAdapter,
    latestAdaptiveMode,
    selectedBenchmarkInputMode,
    adaptiveSemanticDebug,
    mapSessionInputMode,
    setAdaptiveSectionExpanded,
    setSelectedBenchmarkInputMode,
    setBenchmarkExportMessage,
    setSessionFeedbackMessage,
  });

  const adaptiveBenchmarkSectionProps = useAdaptiveBenchmarkSectionProps({
    adaptiveAdapters,
    adaptiveBenchmarksByInputLanguage,
    adaptiveSectionExpanded,
    adaptiveBenchmarksFocusAnchor,
    selectedBenchmarkInputMode,
    selectedBenchmarkLanguage,
    selectedBenchmarkProfile,
    repeatWordStats,
    benchmarkExportMessage,
    selectedSessionFeedback,
    sessionFeedbackMessage,
    formatSessionDate,
    setAdaptiveSectionExpanded,
    setSelectedBenchmarkInputMode,
    setSelectedBenchmarkLanguage,
    setBenchmarkExportMessage,
    setSessionFeedbackMessage,
    copySelectedBenchmarkJson,
    downloadSelectedBenchmarkJson,
    copyDictationScriptPrompt,
    copyBenchmarkWithDictationScriptPrompt,
    copyDictationScriptTemplate,
    copySessionFeedbackJson,
    copyBenchmarkFeedbackJson,
    copyBenchmarkFeedbackPrompt,
    copyBenchmarkFeedbackPromptWithHumanFeedback,
  });

  const appShellSyncStatusText = useAppShellSyncStatusText({
    isOnline,
    supabaseSyncStatus,
    pendingSyncSummary,
    formatSupabaseSyncState,
    formatSessionDate,
  });

  const appShellHeaderProps = useAppShellHeaderProps({
    themeMode,
    showOpenRouterStatus: openRouterAccessAllowed,
    effectiveOpenRouterDefaultModel,
    buildInfoTitle: DICTA_BUILD_INFO_TITLE,
    buildInfoLabel: DICTA_BUILD_INFO_LABEL,
    showAdminButton: isCurrentProfileAdmin || !syncConfig.authRequired,
    showAdaptiveButton: isCurrentProfileAdmin || !syncConfig.authRequired,
    showOpenRouterButton: isCurrentProfileAdmin || !syncConfig.authRequired,
    syncStatusState: supabaseSyncStatus.state,
    syncStatusText: appShellSyncStatusText,
    appProfile,
    sessionQuotaStatus,
    onOpenLeaderboard: showLeaderboardWorkspace,
    onOpenMobileTraining: () => navigateAppRoute('/training'),
    onOpenAdaptive: openAdaptiveWorkspaceFromHeader,
    onOpenAdmin: showAdminWorkspace,
    onOpenOpenRouter: showOpenRouterWorkspace,
    onToggleTheme: () => setThemeMode((value) => (value === 'dark' ? 'light' : 'dark')),
    onSignOut: signOut,
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
