import { buildResetSessionState } from './app/resetSessionState';
import { buildActiveSessionHydrationState } from './app/activeSessionHydration';
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
import { useTtsPerformanceSampler } from './app/useTtsPerformanceSampler';
import { useFocusedTrainingViewProps } from './app/useFocusedTrainingViewProps';
import { useFocusedTrainingLiveMetrics } from './app/useFocusedTrainingLiveMetrics';
import { useOpenRouterWorkspaceProps } from './app/useOpenRouterWorkspaceProps';
import { useAppShellHeaderProps } from './app/useAppShellHeaderProps';
import { useAppShellSyncStatusText } from './app/useAppShellSyncStatusText';
import { useAuthWorkspaceProps } from './app/useAuthWorkspaceProps';
import { useSessionCreateCardProps } from './app/useSessionCreateCardProps';
import { useBrowserTtsSetupCardProps } from './app/useBrowserTtsSetupCardProps';
import { useAdminWorkspaceProps } from './app/useAdminWorkspaceProps';
import { useLeaderboardWorkspaceProps } from './app/useLeaderboardWorkspaceProps';
import { useAdaptiveAdvancedDiagnosticsProps } from './app/useAdaptiveAdvancedDiagnosticsProps';
import { useAdaptiveBenchmarkSectionProps } from './app/useAdaptiveBenchmarkSectionProps';
import { useLiveMetricsDockProps } from './app/useLiveMetricsDockProps';
import { useAdaptiveDiagnosticsUiState } from './app/useAdaptiveDiagnosticsUiState';
import { useAdaptiveWorkspaceState } from './app/useAdaptiveWorkspaceState';
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
import type {
  KeyboardEvent } from 'react';
import './App.css';
import type {
  ControlAction,
  SessionTelemetry,
  TtsChunkTelemetry,
  TtsPacingMode } from './types/dictation';
import type {
  LiveTelemetryFrame,
  PhraseSize,
  } from './core/adaptive/types';
import { configForDifficulty,
  type Difficulty } from './core/config';
import {
  evaluateTranscriptAttempt,
  buildSessionPointsHelpText,
  computeSessionMaxPoints,
  formatSessionPointsForSession,
} from './core/evaluation';
import { buildSessionScoreHelpText } from './core/sessionScore';
import {
  clampBrowserTtsDeDecisionToRecommendation,
  normalizeBenchmarkLanguage,
  } from './core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildBrowserTtsTelemetryFrame,
  buildAdaptiveBrowserTtsInput } from './inputs/browserTts/browserTtsTelemetryAdapter';
import { planBrowserTtsAdaptiveChunk } from './inputs/browserTts/ttsDynamicChunkPlanner';
import { applyBrowserTtsMobilePacingFallback,
  applyBrowserTtsRuntimeRateFloor } from './inputs/browserTts/browserTtsRatePolicy';
import { applyBrowserTtsUnsafeBoundaryPolicy } from './inputs/browserTts/browserTtsUnsafePolicy';
import { applyBrowserTtsDeRecoveryPolicy,
  summarizeBrowserTtsDeRecoveryState } from './inputs/browserTts/browserTtsRecoveryPolicy';
import { resolveBrowserTtsAdaptiveProfile } from './inputs/browserTts/browserTtsAdaptiveProfiles';
import { trackAction } from './core/telemetry';
import { cloneTelemetry,
  normalizeSessionForPersistence } from './core/sessionNormalization';
import { telemetryEquals } from './core/sessionTelemetryEquality';
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
import { BrowserTtsSetupCard } from './components/runtime-workspaces/BrowserTtsSetupCard';
import { LiveMetricsDock } from './components/runtime-workspaces/LiveMetricsDock';
import { Metric } from './components/shared/Metric';
import { SessionDeviceIcon } from './components/shared/SessionDeviceIcon';
import type {
  BenchmarkLanguageButton,
  } from './components/openrouter/types';
import {
  normalizeLiveSessionStatusForPersistence,
  } from './core/sessionStatusNormalization';
import {
  formatInputModeLabel,
  formatSessionGenerationOrigin,
  formatSessionInputMode,
  } from './app/sessionDisplayFormatters';
import { buildTrainingSubmitMessage } from './core/trainingSubmitMessage';
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
  averageNumbers,
  clamp,
  clamp01,
  getTtsVoiceLang,
  mapSessionInputMode,
  } from './app/appRuntimeHelpers';
import { buildRepeatWordStats } from './app/repeatWordStats';
import { buildSemanticPhrasesFromDictationScript,
  buildTtsSourceWords } from './app/dictationScriptSemanticPhrases';
import { buildTtsPlaybackProfile,
  type TtsLiveSignal } from './app/ttsPlaybackProfile';
import { loadSessions,
  normalizeRestoredStoredSession } from './app/sessionStorage';
import {
  buildOrderedSemanticPhrases,
  formatTtsPacingMode,
  mapAdaptivePacingMode,
  semanticPhraseIndexForWordIndex,
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
  const [ttsExpanded, setTtsExpanded] = useState(true);
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
    syncConfig,
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
    setTtsExpanded,
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
  const activeInputFeatureLabel =
    activeInputMode === BROWSER_TTS_SESSION_INPUT_MODE
      ? 'Built-in browser feature'
      : 'Local Python sidecar';
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
    adaptiveControllerRef,
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

  useEffect(() => {
    if (!activeSession) return;

    hydratingSessionIdRef.current = activeSession.id;
    const hydrationState = buildActiveSessionHydrationState(activeSession);
    setDifficulty(hydrationState.difficulty);
    setInputSettingsLocked(hydrationState.inputSettingsLocked);
    setTtsLanguage(hydrationState.ttsLanguage);
    setTtsPracticeText(hydrationState.ttsPracticeText);
    ttsPracticeLiveTextRef.current = hydrationState.ttsPracticeText;
    setSessionStatus(hydrationState.sessionStatus);
    setTtsText(hydrationState.ttsText);
    setTtsStatus(hydrationState.ttsStatus);
    setTtsCurrentChunk(hydrationState.ttsCurrentChunk);
    setTtsPacingMode(hydrationState.ttsPacingMode);
    setTtsSpeechRate(hydrationState.ttsSpeechRate);
    setRunning(hydrationState.running);
    setRate(hydrationState.rate);
    setLagSec(hydrationState.lagSec);
    setLagWords(hydrationState.lagWords);
    setWpm(hydrationState.wpm);
    setAccuracy(hydrationState.accuracy);
    setTrend(hydrationState.trend);
    setControllerState(hydrationState.controllerState);
    ttsUiLastPublishedAtRef.current = 0;
    ttsPublishedUiRef.current = hydrationState.publishedUi;
    telemetryRef.current = cloneTelemetry(activeSession.telemetry);
    setExportMessage('');
    setError('');
    setTrainingSubmitMessage(activeSession.status === 'finished' ? buildTrainingSubmitMessage(sessions, activeSession.id) : '');
    previousLagRef.current = 0;
    previousAccuracyRef.current = 100;
    ttsStartedAtMsRef.current = null;
    ttsChunkStartMsRef.current = null;
    ttsChunkStartWordIndexRef.current = 0;
    ttsChunkWordCountRef.current = 0;
    ttsCompletedSourceWordsRef.current = 0;
    ttsLagOutlierCountRef.current = 0;
    ttsUnsafeChunkCountRef.current = 0;
    ttsChunkAccuracyWindowRef.current = [];
    ttsLastAccuracySnapshotRef.current = { typedWords: 0, matchedWords: 0 };
    ttsLastControllerActionRef.current = 'hold';
    resetAdaptiveSessionFeedbackTracking(activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSession || activeSession.status !== 'finished' || sessionStatus === 'finished') return;

    setRunning(false);
    setSessionStatus('finished');
    if (activeSession.inputMode === BROWSER_TTS_SESSION_INPUT_MODE) {
      setTtsStatus('finished');
    }
    setControllerState(activeSession.metrics.controllerState);
    setRate(activeSession.metrics.rate);
    setLagSec(activeSession.metrics.lagSec);
    setLagWords(activeSession.metrics.lagWords);
    setWpm(activeSession.metrics.wpm);
    setAccuracy(activeSession.metrics.accuracy);
    setTrend(activeSession.metrics.trend);
    telemetryRef.current = cloneTelemetry(activeSession.telemetry);
    setError('');
    setTrainingSubmitMessage(buildTrainingSubmitMessage(sessions, activeSession.id));
  }, [activeSession, sessionStatus, sessions]);

  useEffect(() => {
    if (!activeSession) return;
    if (hydratingSessionIdRef.current === activeSession.id) {
      hydratingSessionIdRef.current = null;
      return;
    }

    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== activeSession.id) {
          return session;
        }
        const nextTelemetry = cloneTelemetry(telemetryRef.current);
        const nextStatus = normalizeLiveSessionStatusForPersistence(sessionStatus, nextTelemetry, running);
        const isExplicitFinishedReset = allowFinishedSessionResetRef.current === session.id && nextStatus !== 'finished';
        // A remote sync import can mark the active session as finished before the visible
        // form state has hydrated. Do not let stale form state downgrade that result.
        if (session.status === 'finished' && nextStatus !== 'finished' && !isExplicitFinishedReset) {
          return session;
        }
        if (isExplicitFinishedReset) {
          allowFinishedSessionResetRef.current = null;
        }
        if (session.status === 'finished' && nextStatus === 'finished') {
          return session;
        }
        const changed =
          session.inputSettingsLocked !== inputSettingsLocked ||
          session.ttsText !== ttsText ||
          session.ttsLanguage !== ttsLanguage ||
          session.ttsPracticeText !== ttsPracticeText ||
          session.difficulty !== difficulty ||
          session.status !== nextStatus ||
          session.metrics.controllerState !== controllerState ||
          session.metrics.rate !== rate ||
          session.metrics.lagSec !== lagSec ||
          session.metrics.lagWords !== lagWords ||
          session.metrics.wpm !== wpm ||
          session.metrics.accuracy !== activeVisibleAccuracy ||
          session.metrics.trend !== trend ||
          session.metrics.score !== activeVisibleScore ||
          session.metrics.points !== activePoints ||
          !telemetryEquals(session.telemetry, nextTelemetry);

        if (!changed) {
          return session;
        }

        return {
          ...session,
          inputSettingsLocked,
          ttsText,
          ttsLanguage,
          ttsPracticeText,
          difficulty,
          status: nextStatus,
          metrics: {
            controllerState,
            rate,
            lagSec,
            lagWords,
            wpm,
            accuracy: activeVisibleAccuracy,
            trend,
            score: activeVisibleScore,
            points: activePoints,
          },
          telemetry: nextTelemetry,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }, [
    activeSession,
    difficulty,
    inputSettingsLocked,
    lagSec,
    lagWords,
    rate,
    ttsText,
    ttsLanguage,
    ttsPracticeText,
    trend,
    accuracy,
    activePoints,
    activeVisibleAccuracy,
    activeVisibleScore,
    sessionStatus,
    controllerState,
    running,
    wpm,
  ]);

  useEffect(() => {
    if (ttsStatus !== 'playing') return;
    const interval = window.setInterval(() => setTtsPlayerProgressTick((value) => value + 1), 500);
    return () => window.clearInterval(interval);
  }, [ttsStatus]);

  function resetSession(options: { preserveInputSettingsLock?: boolean } = {}): void {
    const resetState = buildResetSessionState({
      preserveInputSettingsLock: options.preserveInputSettingsLock,
      inputSettingsLocked,
      ttsText,
      activeInputMode,
    });

    if (activeSession?.status === 'finished') {
      allowFinishedSessionResetRef.current = activeSession.id;
    }
    stopTtsPlayback();
    setTtsPracticeText(resetState.ttsPracticeText);
    ttsPracticeLiveTextRef.current = resetState.ttsPracticeText;
    setTtsStatus(resetState.ttsStatus);
    setTtsCurrentChunk(resetState.ttsCurrentChunk);
    setTtsPacingMode(resetState.ttsPacingMode);
    setTtsSpeechRate(resetState.ttsSpeechRate);
    ttsStartedAtMsRef.current = resetState.refs.ttsStartedAtMs;
    ttsChunkStartMsRef.current = resetState.refs.ttsChunkStartMs;
    ttsChunkStartWordIndexRef.current = resetState.refs.ttsChunkStartWordIndex;
    ttsChunkWordCountRef.current = resetState.refs.ttsChunkWordCount;
    ttsCompletedSourceWordsRef.current = resetState.refs.ttsCompletedSourceWords;
    ttsLastControllerActionRef.current = resetState.refs.ttsLastControllerAction;
    setRunning(resetState.running);
    setRate(resetState.rate);
    setLagSec(resetState.lagSec);
    setLagWords(resetState.lagWords);
    setWpm(resetState.wpm);
    setAccuracy(resetState.accuracy);
    setControllerState(resetState.controllerState);
    ttsUiLastPublishedAtRef.current = resetState.refs.ttsUiLastPublishedAt;
    ttsPublishedUiRef.current = resetState.publishedUi;
    setSessionStatus(resetState.sessionStatus);
    setTrainingSubmitMessage(resetState.trainingSubmitMessage);
    setInputSettingsLocked(resetState.nextInputSettingsLocked);
    if (resetState.shouldExpandTtsSetup) {
      setTtsExpanded(true);
    }
    telemetryRef.current = resetState.refs.telemetry;
    resetAdaptiveSessionFeedbackTracking(activeSession?.id);
  }

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
    openOpenRouterGenerateForActiveInput,
    generateEasyNextSessionFromOpenRouter,
    generateIntermediateNextSessionFromOpenRouter,
    generateAdvancedNextSessionFromOpenRouter,
    generateExpressEasyNextSessionFromOpenRouter,
    generateExpressIntermediateNextSessionFromOpenRouter,
    generateExpressAdvancedNextSessionFromOpenRouter,
  } = useOpenRouterGenerationActions({
    sessions,
    activeSession,
    openRouterAccessAllowed,
    openRouterAccessMessage,
    isOnline,
    effectiveOpenRouterDefaultModel,
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

  function openAdaptiveExportsForActiveInput(): void {
    if (!activeSession) return;
    const inputMode = mapSessionInputMode(activeSession.inputMode);
    const language: BenchmarkLanguageButton = dictaLanguageView;
    setSelectedBenchmarkInputMode(inputMode);
    setSelectedBenchmarkLanguage(language);
    setBenchmarkExportMessage('');
    setSessionFeedbackMessage('');
    setAdaptiveBenchmarksFocusAnchor('exports');
    setAdaptiveSectionExpanded((prev) => ({ ...prev, benchmarks: true }));
    showAdaptiveWorkspace();
  }

  function openAdaptiveWorkspaceFromHeader(): void {
    if (isMobileViewport()) {
      setAdaptiveSectionExpanded((prev) => ({
        ...prev,
        decision: false,
        architecture: false,
        adapters: false,
        latest: false,
        live: false,
        telemetry: false,
        benchmarks: false,
      }));
    }
    showAdaptiveWorkspace();
  }

  function onTtsTextChange(value: string): void {
    if (inputSettingsLocked || activeSessionFinished) return;
    setTtsText(value);
    setTtsStatus(value.trim().length > 0 ? 'ready' : 'idle');
  }

  function onTtsPracticeChange(value: string): void {
    if (activeSessionFinished) return;
    if (!telemetryRef.current || !telemetryRef.current.startedAt) {
      telemetryRef.current = { ...cloneTelemetry(telemetryRef.current), startedAt: new Date().toISOString() };
    }
    if (ttsStartedAtMsRef.current === null) {
      ttsStartedAtMsRef.current = performance.now();
    }
    ttsPracticeLiveTextRef.current = value;
    setTtsPracticeText(value);
  }

  function onTtsPracticeKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    handleEsKeyboardRemapKeyDown(event, onTtsPracticeChange);
  }

  

  

  

  function ensureAttemptTelemetry(): SessionTelemetry {
    const next = cloneTelemetry(telemetryRef.current);
    if (!next.startedAt) {
      next.startedAt = new Date().toISOString();
    }
    telemetryRef.current = next;
    return next;
  }

  function getTtsElapsedSeconds(now = performance.now()): number {
    if (ttsStartedAtMsRef.current === null) {
      return 0;
    }
    return Math.max(0, (now - ttsStartedAtMsRef.current) / 1000);
  }

  

  

  

  

  function estimateTtsSpokenWordIndex(now = performance.now()): number {
    const sourceWordCount = ttsTranscript?.words.length ?? 0;
    if (sourceWordCount === 0) {
      return 0;
    }

    if (ttsStatus === 'playing' && ttsChunkStartMsRef.current !== null) {
      const elapsedSec = Math.max(0, (now - ttsChunkStartMsRef.current) / 1000);
      const wordsPerSecond = Math.max(1, TTS_BASE_WORDS_PER_SECOND * ttsSpeechRate);
      const spokenInChunk = Math.min(ttsChunkWordCountRef.current, Math.floor(elapsedSec * wordsPerSecond));
      return clamp(ttsChunkStartWordIndexRef.current + spokenInChunk, 0, sourceWordCount);
    }

    if (ttsStatus === 'finished') {
      return sourceWordCount;
    }

    return clamp(ttsCompletedSourceWordsRef.current, 0, sourceWordCount);
  }

  function recordTtsTelemetryAction(action: ControlAction, actionRate = ttsSpeechRate): void {
    const telemetry = ensureAttemptTelemetry();
    const next = cloneTelemetry(telemetry);
    trackAction(next, getTtsElapsedSeconds(), action, actionRate);
    telemetryRef.current = next;
  }

  function recordTtsChunkTelemetry(chunk: Omit<TtsChunkTelemetry, 't'>): void {
    const telemetry = ensureAttemptTelemetry();
    const next = cloneTelemetry(telemetry);
    next.ttsChunks.push({
      t: getTtsElapsedSeconds(),
      ...chunk,
    });
    telemetryRef.current = next;
  }

  function publishTtsUiState(next: TtsPublishedUiState, now: number, force = false): void {
    const previous = ttsPublishedUiRef.current;
    const changed =
      previous.controllerState !== next.controllerState ||
      Math.abs(previous.rate - next.rate) > 0.005 ||
      Math.abs(previous.lagSec - next.lagSec) > 0.05 ||
      previous.lagWords !== next.lagWords ||
      Math.abs(previous.wpm - next.wpm) > 0.5 ||
      Math.abs(previous.accuracy - next.accuracy) > 0.1 ||
      previous.trend !== next.trend;

    if (!force && (!changed || now - ttsUiLastPublishedAtRef.current < 500)) {
      return;
    }

    ttsPublishedUiRef.current = next;
    ttsUiLastPublishedAtRef.current = now;

    if (force || controllerState !== next.controllerState) setControllerState(next.controllerState);
    if (force || Math.abs(rate - next.rate) > 0.005) setRate(next.rate);
    if (force || Math.abs(lagSec - next.lagSec) > 0.05) setLagSec(next.lagSec);
    if (force || lagWords !== next.lagWords) setLagWords(next.lagWords);
    if (force || Math.abs(wpm - next.wpm) > 0.5) setWpm(next.wpm);
    if (force || Math.abs(accuracy - next.accuracy) > 0.1) setAccuracy(next.accuracy);
    if (force || trend !== next.trend) setTrend(next.trend);
  }

  const applyTtsPerformanceSample = useTtsPerformanceSampler({
    ttsStartedAtMsRef,
    ttsPracticeLiveTextRef,
    ttsTranscript,
    ttsSpeechRate,
    ttsLanguage,
    ttsLastValidControlLagSecRef,
    ttsLagOutlierCountRef,
    ttsLiveSignalRef,
    previousLagRef,
    previousAccuracyRef,
    telemetryRef,
    ttsLastControllerActionRef,
    estimateTtsSpokenWordIndex,
    getTtsElapsedSeconds,
    ensureAttemptTelemetry,
    publishTtsUiState,
  });

  applyTtsPerformanceSampleRef.current = applyTtsPerformanceSample;

  function submitTtsSession(latestPracticeText = ttsPracticeText): void {
    const endPerfSpan = perfDiagnostics.startSpan('tts.submit', { inputMode: activeInputMode });
    if (!ttsHasText || !latestPracticeText.trim()) {
      setError('Paste TTS text and type your attempt before submitting.');
      setTrainingSubmitMessage('');
      endPerfSpan();
      return;
    }

    try {
      if (latestPracticeText !== ttsPracticeText) {
        setTtsPracticeText(latestPracticeText);
      }
      const finalSample = applyTtsPerformanceSample({ action: 'submit', finalize: true, practiceTextOverride: latestPracticeText });
      const finishedAt = new Date().toISOString();
      const finalVoiceResolution =
        activeSession?.inputMode === BROWSER_TTS_SESSION_INPUT_MODE
          ? resolveBrowserTtsVoiceForSession(activeSession, ttsLanguage)
          : null;
      const finalVoiceURI = finalVoiceResolution?.voiceURI ?? activeSession?.ttsVoiceURI ?? null;
      const finalTtsEnvironment = collectBrowserTtsEnvironmentForSession(activeSession, finalVoiceResolution?.voice ?? null, finalVoiceURI);
      const nextSessions = sessions.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              ttsVoiceURI: session.inputMode === BROWSER_TTS_SESSION_INPUT_MODE ? finalVoiceURI : session.ttsVoiceURI,
              ttsEnvironment: session.inputMode === BROWSER_TTS_SESSION_INPUT_MODE ? finalTtsEnvironment : session.ttsEnvironment,
              ttsPracticeText: latestPracticeText,
              status: 'finished' as const,
              metrics: finalSample.metrics,
              telemetry: finalSample.telemetry,
              updatedAt: finishedAt,
            }
          : session,
      );
      const finalizedSession = nextSessions.find((session) => session.id === activeSessionId) ?? activeSession;
      setSessions(nextSessions);
      persistAndPushSessionsNow(nextSessions, { criticalSessionIds: activeSessionId ? [activeSessionId] : [] });
      stopTtsPlayback();
      setRunning(false);
      setSessionStatus('finished');
      setTtsStatus('finished');
      completeAdaptiveSessionFeedback(finalizedSession);
      setError('');
      if (activeSessionId) {
        setTrainingSubmitMessage(buildTrainingSubmitMessage(nextSessions, activeSessionId));
      }
    } finally {
      endPerfSpan();
    }
  }

  function playTts(): void {
    const perfPlayId = perfDiagnostics.beginTtsPlay('browser-tts-play-button');
    playTtsFromWord(ttsStatus === 'paused' ? (ttsPausedAtWordIndexRef.current ?? ttsCompletedSourceWordsRef.current) : 0, perfPlayId);
  }

  function playTtsFromWord(startWordIndex: number, perfPlayId = perfDiagnostics.beginTtsPlay('browser-tts-direct')): void {
    if (activeSessionFinished) {
      setError('Reset the finished session before playing TTS again.');
      return;
    }

    if (!ttsText.trim()) {
      setError('Paste TTS text before playing.');
      return;
    }
    if (!isBrowserTtsSupported()) {
      setError('This browser does not support speech synthesis.');
      return;
    }

    stopTtsPlayback();
    const sourceWords = buildTtsSourceWords(ttsText);
    if (sourceWords.length === 0) {
      setError('Paste TTS text before playing.');
      return;
    }

    const browserTtsVoice = resolveActiveBrowserTtsVoice();
    const browserTtsEnvironment = collectBrowserTtsEnvironmentForSession(
      activeSession,
      browserTtsVoice,
      browserTtsVoice?.voiceURI ?? activeSession?.ttsVoiceURI ?? null,
    );
    const clampedStartWordIndex = Math.floor(clamp(startWordIndex, 0, Math.max(0, sourceWords.length - 1)));
    let chunkIndex = clampedStartWordIndex > 0 ? clampedStartWordIndex : 0;
    let macroPhraseIndex = 0;
    let macroWordOffset = 0;
    let cancelled = false;
    const semanticPhrases = buildSemanticPhrasesForCurrentSession(ttsText, ttsLanguage, ttsPacingMode);
    const semanticPhraseWords = semanticPhrases.map((phrase) => buildTtsSourceWords(phrase.text));
    const semanticPhraseStartWordIndices = semanticPhraseWords.reduce<number[]>((acc, _words, index) => {
      const prev = index === 0 ? 0 : acc[index - 1] + (semanticPhraseWords[index - 1]?.length ?? 0);
      acc.push(prev);
      return acc;
    }, []);
    macroPhraseIndex = semanticPhraseIndexForWordIndex(semanticPhrases, clampedStartWordIndex);
    macroWordOffset = Math.max(0, clampedStartWordIndex - (semanticPhraseStartWordIndices[macroPhraseIndex] ?? 0));
    let lastPhraseSize: PhraseSize = 'medium';
    let lastBoundaryStrictness: 'sentence' | 'clause' | 'phrase' = 'sentence';
    if (clampedStartWordIndex === 0) {
      beginAdaptiveSessionFeedback('browser-tts', ttsLanguage, semanticPhrases.length);
    }
    ttsSemanticPhraseAdvanceCountRef.current = 0;
    ttsSemanticPhraseReplayCountRef.current = 0;
    ttsStartedAtMsRef.current = performance.now();
    ttsCompletedSourceWordsRef.current = clampedStartWordIndex;
    ttsPausedAtWordIndexRef.current = null;
    ttsLagOutlierCountRef.current = 0;
    ttsLastValidControlLagSecRef.current = 0;
    ttsUnsafeChunkCountRef.current = 0;
    ttsChunkAccuracyWindowRef.current = [];
    ttsLastAccuracySnapshotRef.current = { typedWords: 0, matchedWords: 0 };
    ttsLastControllerActionRef.current = 'hold';
    ensureAttemptTelemetry();
    recordTtsTelemetryAction('play', ttsSpeechRate);
    setError('');
    setTtsStatus('playing');
    setRunning(true);
    setSessionStatus('running');

    const speakNext = () => {
      if (cancelled || macroPhraseIndex >= semanticPhrases.length) {
        setTtsCurrentChunk('');
        setTtsStatus('finished');
        setRunning(false);
        setSessionStatus((current) => (current === 'finished' ? current : 'paused'));
        ttsCompletedSourceWordsRef.current = ttsTranscript?.words.length ?? ttsCompletedSourceWordsRef.current;
        ttsChunkStartMsRef.current = null;
        applyTtsPerformanceSample();
        ttsUtteranceRef.current = null;
        return;
      }

      const historyProfile = getHistoricalPerformanceProfile('browser-tts', ttsLanguage);
      const liveSignal = ttsLiveSignalRef.current;
      const livePracticeEvaluation = evaluateTranscriptAttempt(ttsPracticeLiveTextRef.current, ttsTranscript);
      const browserTtsProfile = resolveBrowserTtsAdaptiveProfile(ttsLanguage);
      const browserTtsBenchmark = getBenchmarkSnapshot('browser-tts', normalizeBenchmarkLanguage(ttsLanguage));
      const browserTtsRecovery = summarizeBrowserTtsDeRecoveryState({
        timeline: browserTtsBenchmark.timeline,
        userAgent: window.navigator.userAgent,
        platform: window.navigator.platform,
        maxTouchPoints: window.navigator.maxTouchPoints,
      });
      const useBrowserTtsDeRecoverySafeChunks =
        ttsLanguage === 'de' && (browserTtsRecovery.level === 'strong' || browserTtsRecovery.level === 'severe');
      const typedWordsNow = livePracticeEvaluation.typedWords.length;
      const matchedWordsNow = livePracticeEvaluation.matchedWords;
      const typedDelta = Math.max(0, typedWordsNow - ttsLastAccuracySnapshotRef.current.typedWords);
      const matchedDelta = Math.max(0, matchedWordsNow - ttsLastAccuracySnapshotRef.current.matchedWords);
      const sessionAccuracy = clamp01(liveSignal.accuracy / 100);
      const chunkAccuracy = typedDelta > 0 ? clamp01(matchedDelta / typedDelta) : sessionAccuracy;
      const rollingWindow = [...ttsChunkAccuracyWindowRef.current, chunkAccuracy];
      const rollingAccuracyLast3 = averageNumbers(rollingWindow.slice(-3), chunkAccuracy);
      const rollingAccuracyLast5 = averageNumbers(rollingWindow.slice(-5), chunkAccuracy);
      const semanticPhrase = semanticPhrases[macroPhraseIndex];
      const macroWords = semanticPhraseWords[macroPhraseIndex] ?? [];
      const macroStartWordIndex = semanticPhraseStartWordIndices[macroPhraseIndex] ?? 0;

      // If the current macro phrase is empty or already fully spoken, advance to the next macro phrase.
      if (macroWords.length === 0 || macroWordOffset >= macroWords.length) {
        macroPhraseIndex += 1;
        macroWordOffset = 0;
        if (!cancelled) {
          speakNext();
        }
        return;
      }

      if (macroWordOffset === 0) {
        recordPhrasePlaybackEvent('phrase_started', 'browser-tts', ttsLanguage, semanticPhrase, macroPhraseIndex);
      }

      const germanShortBias = browserTtsProfile.germanShortBias.enabled &&
        (liveSignal.lagSec > browserTtsProfile.germanShortBias.lagSecTrigger ||
          liveSignal.accuracy < browserTtsProfile.germanShortBias.accuracyPercentTrigger);
      const candidateChunk =
        planBrowserTtsAdaptiveChunk({
          macroWords,
          macroWordOffset,
          globalStartWordIndex: macroStartWordIndex,
          language: ttsLanguage,
          nextPhraseSize: lastPhraseSize,
          boundaryStrictness: lastBoundaryStrictness,
          germanShortBias,
          maxWordsOverride: browserTtsRecovery.shortChunkWordCap,
          recoverySafeBoundary: useBrowserTtsDeRecoverySafeChunks,
        }) ??
        planBrowserTtsAdaptiveChunk({
          macroWords,
          macroWordOffset,
          globalStartWordIndex: macroStartWordIndex,
          language: ttsLanguage,
          nextPhraseSize: 'short',
          boundaryStrictness: 'phrase',
          germanShortBias,
          maxWordsOverride: browserTtsRecovery.shortChunkWordCap,
          recoverySafeBoundary: useBrowserTtsDeRecoverySafeChunks,
        });

      if (!candidateChunk) {
        macroPhraseIndex += 1;
        macroWordOffset = 0;
        if (!cancelled) {
          speakNext();
        }
        return;
      }

      const browserTelemetry = buildBrowserTtsTelemetryFrame({
        inputMode: 'browser-tts',
        phraseId: `tts-${chunkIndex}`,
        estimatedSpokenRatio: sourceWords.length > 0 ? estimateTtsSpokenWordIndex() / sourceWords.length : 0,
        typedProgressRatio: sourceWords.length > 0 ? Math.max(0, livePracticeEvaluation.lastMatchedTargetIndex + 1) / sourceWords.length : 0,
        lagSec: liveSignal.lagSec,
        lagWords: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND)),
        lagChars: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND * 5)),
        rawLagSec: liveSignal.rawLagSec,
        stableLagSec: liveSignal.stableLagSec,
        lagOutlierCount: liveSignal.lagOutlierCount,
        accuracy: sessionAccuracy,
        chunkAccuracy,
        rollingAccuracyLast3,
        rollingAccuracyLast5,
        sessionAccuracy,
        errorRate: clamp01(1 - liveSignal.accuracy / 100),
        wpm: liveSignal.wpm,
        charsPerMinute: 0,
        pauseMs: ttsPlaybackProfile.pauseMs,
        longestPauseMs: 0,
        backspaceRate: 0,
        correctionRate: 0,
        phraseDifficulty: candidateChunk.phraseDifficulty,
        phraseLengthWords: candidateChunk.wordCount,
        phraseLengthChars: candidateChunk.text.length,
        currentPlaybackRate: ttsSpeechRate,
        currentPauseAfterPhraseMs: ttsPlaybackProfile.pauseMs,
        language: ttsLanguage,
        trend: liveSignal.trend,
        phraseBoundaryType: candidateChunk.phraseBoundaryType,
        canPauseAfter: candidateChunk.canPauseAfter,
        canReplayIndependently: false,
        semanticCompleteness: candidateChunk.semanticCompleteness,
        punctuationLoad: candidateChunk.punctuationLoad,
        rareWordLoad: candidateChunk.rareWordLoad,
        syntaxComplexity: candidateChunk.syntaxComplexity,
      });
      const rawDecision = adaptiveControllerRef.current.decide(buildAdaptiveBrowserTtsInput(browserTelemetry, historyProfile));
      const decision = clampBrowserTtsDeDecisionToRecommendation(rawDecision, browserTtsBenchmark);
      const pacingMode = mapAdaptivePacingMode(decision.mode);
      const chunk =
        planBrowserTtsAdaptiveChunk({
          macroWords,
          macroWordOffset,
          globalStartWordIndex: macroStartWordIndex,
          language: ttsLanguage,
          nextPhraseSize: decision.nextPhraseSize,
          boundaryStrictness: decision.boundaryStrictness,
          germanShortBias,
          maxWordsOverride: browserTtsRecovery.shortChunkWordCap,
          recoverySafeBoundary: useBrowserTtsDeRecoverySafeChunks,
        }) ?? candidateChunk;

      const pauseAtBoundary = chunk.canPauseAfter ?? true;
      const semanticCompleteness = chunk.semanticCompleteness ?? 1;
      const rateAfterFloor = applyBrowserTtsRuntimeRateFloor({
        mode: decision.mode,
        requestedRate: decision.playbackRate,
        lagSec: liveSignal.lagSec,
        accuracy: rollingAccuracyLast3,
        supportNeeded: decision.reason.includes('support-needed'),
        profile: browserTtsProfile,
      });
      const unsafeRuntime = applyBrowserTtsUnsafeBoundaryPolicy({
        boundaryType: chunk.phraseBoundaryType,
        requestedRate: rateAfterFloor,
        previousRate: ttsSpeechRate,
        pauseAfterPhraseMs: decision.pauseAfterPhraseMs,
        profile: browserTtsProfile,
      });
      const postPolicyDecision =
        unsafeRuntime.playbackRate === decision.playbackRate && unsafeRuntime.pauseAfterPhraseMs === decision.pauseAfterPhraseMs
          ? decision
          : {
              ...decision,
              playbackRate: unsafeRuntime.playbackRate,
              pauseAfterPhraseMs: unsafeRuntime.pauseAfterPhraseMs,
              reason: unsafeRuntime.unsafeBoundaryApplied
                ? `${decision.reason}, unsafe-boundary-conservative`
                : decision.reason,
            };
      const mobileFallback = applyBrowserTtsMobilePacingFallback({
        decision: postPolicyDecision,
        lagSec: liveSignal.lagSec,
        accuracy: rollingAccuracyLast3,
        userAgent: window.navigator.userAgent,
        platform: window.navigator.platform,
        maxTouchPoints: window.navigator.maxTouchPoints,
        profile: browserTtsProfile,
      });
      const recommendedDecision = clampBrowserTtsDeDecisionToRecommendation(mobileFallback.decision, browserTtsBenchmark);
      const runtimeDecision = applyBrowserTtsDeRecoveryPolicy({
        decision: recommendedDecision,
        recovery: browserTtsRecovery,
        profile: browserTtsProfile,
      });
      // Persist the final executable decision so the next chunk reflects runtime constraints.
      lastPhraseSize = runtimeDecision.nextPhraseSize;
      lastBoundaryStrictness = runtimeDecision.boundaryStrictness;
      const rate = runtimeDecision.playbackRate;
      if (unsafeRuntime.unsafeBoundaryApplied) {
        ttsUnsafeChunkCountRef.current += 1;
      }
      const effectivePauseNow = runtimeDecision.shouldPauseNow && pauseAtBoundary;
      const effectiveReplay = false;
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      const perfUtteranceId = perfDiagnostics.beginTtsUtterance({
        playId: perfPlayId,
        chunkIndex,
        phraseLengthWords: chunk.wordCount,
        phraseLengthChars: chunk.text.length,
        language: ttsLanguage,
        pacingMode,
        voiceName: browserTtsVoice?.name,
        voiceURI: browserTtsVoice?.voiceURI ?? activeSession?.ttsVoiceURI ?? null,
        voiceLang: browserTtsVoice?.lang,
        voiceResolved: Boolean(browserTtsVoice),
        availableVoiceCount: browserTtsVoices.length,
        matchingVoiceCount: browserTtsVoices.filter((voice) => voice.lang.toLowerCase().startsWith(ttsLanguage)).length,
      });
      utterance.rate = rate;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = getTtsVoiceLang(ttsLanguage);
      if (browserTtsVoice) {
        utterance.voice = browserTtsVoice;
      }
      ttsUtteranceRef.current = utterance;
      setTtsCurrentChunk(chunk.text);
      setTtsPacingMode(pacingMode);
      setTtsSpeechRate(rate);
      ttsChunkStartMsRef.current = performance.now();
      ttsChunkStartWordIndexRef.current = chunk.startWordIndex;
      ttsChunkWordCountRef.current = chunk.wordCount;
      ttsCompletedSourceWordsRef.current = chunk.startWordIndex;
      recordTtsChunkTelemetry({
        startWordIndex: chunk.startWordIndex,
        wordCount: chunk.wordCount,
        rate,
        pacingMode,
      });
      const chunkTelemetry = buildBrowserTtsTelemetryFrame({
        inputMode: 'browser-tts',
        phraseId: `tts-${chunkIndex}-chunk`,
        estimatedSpokenRatio: sourceWords.length > 0 ? estimateTtsSpokenWordIndex() / sourceWords.length : 0,
        typedProgressRatio: sourceWords.length > 0 ? Math.max(0, livePracticeEvaluation.lastMatchedTargetIndex + 1) / sourceWords.length : 0,
        lagSec: liveSignal.lagSec,
        lagWords: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND)),
        lagChars: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND * 5)),
        rawLagSec: liveSignal.rawLagSec,
        stableLagSec: liveSignal.stableLagSec,
        lagOutlierCount: liveSignal.lagOutlierCount,
        unsafeChunkCount: ttsUnsafeChunkCountRef.current,
        accuracy: sessionAccuracy,
        chunkAccuracy,
        rollingAccuracyLast3,
        rollingAccuracyLast5,
        sessionAccuracy,
        errorRate: clamp01(1 - liveSignal.accuracy / 100),
        wpm: liveSignal.wpm,
        charsPerMinute: 0,
        pauseMs: ttsPlaybackProfile.pauseMs,
        longestPauseMs: 0,
        backspaceRate: 0,
        correctionRate: 0,
        phraseDifficulty: chunk.phraseDifficulty ?? 0.5,
        phraseLengthWords: chunk.wordCount,
        phraseLengthChars: chunk.text.length,
        currentPlaybackRate: rate,
        currentPauseAfterPhraseMs: ttsPlaybackProfile.pauseMs,
        language: ttsLanguage,
        trend: liveSignal.trend,
        phraseBoundaryType: chunk.phraseBoundaryType,
        canPauseAfter: chunk.canPauseAfter,
        canReplayIndependently: false,
        semanticCompleteness: chunk.semanticCompleteness,
        punctuationLoad: chunk.punctuationLoad,
        rareWordLoad: chunk.rareWordLoad,
        syntaxComplexity: chunk.syntaxComplexity,
      });
      recordAdaptiveBenchmark(chunkTelemetry, runtimeDecision, {
        actualPlaybackRate: rate,
        actualPauseMs: effectivePauseNow ? runtimeDecision.pauseAfterPhraseMs : 0,
        replayExecuted: effectiveReplay,
        actualBoundaryType: chunk.phraseBoundaryType,
        ttsEnvironment: browserTtsEnvironment,
        event: effectiveReplay ? 'replay' : effectivePauseNow ? 'pause' : runtimeDecision.deferPauseUntilSafeBoundary ? 'defer_pause' : 'phrase_advance',
        phraseIndex: macroPhraseIndex,
        totalSemanticPhrases: semanticPhrases.length,
      });
      ttsChunkAccuracyWindowRef.current = rollingWindow.slice(-5);
      ttsLastAccuracySnapshotRef.current = {
        typedWords: typedWordsNow,
        matchedWords: matchedWordsNow,
      };
      setAdaptiveSemanticDebug((current) => {
        const phraseCount = current.safePauseCount + current.unsafePauseCount + current.deferredPauseCount + 1;
        const avgCompleteness = ((current.averageSemanticCompleteness * (phraseCount - 1)) + semanticCompleteness) / phraseCount;
        const difficulty = chunk.phraseDifficulty ?? 0.5;
        const avgDifficulty = ((current.averagePhraseDifficulty * (phraseCount - 1)) + difficulty) / phraseCount;
        const unsafePauseCount = current.unsafePauseCount + (runtimeDecision.shouldPauseNow && !pauseAtBoundary ? 1 : 0);
        const safePauseCount = current.safePauseCount + (effectivePauseNow ? 1 : 0);
        const deferredPauseCount = current.deferredPauseCount + (runtimeDecision.deferPauseUntilSafeBoundary ? 1 : 0);
        const replayDeniedByBoundaryCount = current.replayDeniedByBoundaryCount + (runtimeDecision.shouldReplayPhrase && !effectiveReplay ? 1 : 0);
        const semanticCutPenalty = unsafePauseCount + replayDeniedByBoundaryCount * 0.5 + deferredPauseCount * 0.35;
        const fidelityRaw = 1 - semanticCutPenalty / Math.max(1, phraseCount * 1.5);
        return {
          ...current,
          semanticCutPenalty: Number(semanticCutPenalty.toFixed(2)),
          unsafePauseCount,
          safePauseCount,
          deferredPauseCount,
          replayDeniedByBoundaryCount,
          averageSemanticCompleteness: Number(avgCompleteness.toFixed(3)),
          averagePhraseDifficulty: Number(avgDifficulty.toFixed(3)),
          inputExecutionFidelityScore: Number(clamp(fidelityRaw, 0, 1).toFixed(3)),
          currentPhraseIndex: macroPhraseIndex,
          currentPhraseId: semanticPhrase?.id ?? `phrase-${macroPhraseIndex}`,
          currentPhraseTextPreview: chunk.text.slice(0, 80),
          totalSemanticPhrases: semanticPhrases.length,
          phraseAdvanceCount: ttsSemanticPhraseAdvanceCountRef.current,
          phraseReplayCount: ttsSemanticPhraseReplayCountRef.current,
          lastPhraseAdvanceReason: 'phrase_start',
        };
      });

      utterance.onstart = () => {
        perfDiagnostics.recordTtsStart(perfUtteranceId);
      };

      utterance.onend = () => {
        perfDiagnostics.recordTtsEnd(perfUtteranceId);
        if (cancelled) return;
        const completesMacroPhrase = macroWordOffset + chunk.wordCount >= macroWords.length;
        ttsCompletedSourceWordsRef.current = chunk.startWordIndex + chunk.wordCount;
        if (completesMacroPhrase) {
          recordPhrasePlaybackEvent('phrase_completed', 'browser-tts', ttsLanguage, semanticPhrase, macroPhraseIndex);
          if (normalizeBenchmarkLanguage(ttsLanguage) === 'de') {
            applyTtsPerformanceSample();
            const completionLiveSignal = ttsLiveSignalRef.current;
            const completionAccuracy = clamp01(completionLiveSignal.accuracy / 100);
            const completionTelemetry: LiveTelemetryFrame = {
              ...chunkTelemetry,
              phraseId: semanticPhrase?.id ?? `phrase-${macroPhraseIndex}`,
              accuracy: completionAccuracy,
              errorRate: clamp01(1 - completionAccuracy),
              wpm: completionLiveSignal.wpm,
              lagSec: completionLiveSignal.lagSec,
              rawLagSec: completionLiveSignal.rawLagSec,
              stableLagSec: completionLiveSignal.stableLagSec,
              lagOutlierCount: completionLiveSignal.lagOutlierCount,
              unsafeChunkCount: ttsUnsafeChunkCountRef.current,
              trend: completionLiveSignal.trend,
            };
            recordAdaptiveBenchmark(completionTelemetry, runtimeDecision, {
              actualPlaybackRate: rate,
              actualPauseMs: 0,
              replayExecuted: false,
              actualBoundaryType: chunk.phraseBoundaryType,
              ttsEnvironment: browserTtsEnvironment,
              event: 'phrase_completed',
              phraseIndex: macroPhraseIndex,
              totalSemanticPhrases: semanticPhrases.length,
            });
          }
        }
        chunkIndex += 1;
        macroWordOffset += chunk.wordCount;
        if (macroWordOffset >= macroWords.length) {
          macroPhraseIndex += 1;
          macroWordOffset = 0;
          ttsSemanticPhraseAdvanceCountRef.current += 1;
          recordPhrasePlaybackEvent('phrase_advanced', 'browser-tts', ttsLanguage, semanticPhrase, macroPhraseIndex);
        }
        setAdaptiveSemanticDebug((current) => ({
          ...current,
          currentPhraseIndex: macroPhraseIndex,
          currentPhraseId: semanticPhrases[macroPhraseIndex]?.id ?? 'complete',
          currentPhraseTextPreview: semanticPhrases[macroPhraseIndex]?.text.slice(0, 80) ?? '',
          totalSemanticPhrases: semanticPhrases.length,
          phraseAdvanceCount: ttsSemanticPhraseAdvanceCountRef.current,
          phraseReplayCount: ttsSemanticPhraseReplayCountRef.current,
          lastPhraseAdvanceReason: 'chunk_complete',
        }));
        if (effectivePauseNow) {
          window.setTimeout(() => {
            speakNext();
          }, runtimeDecision.pauseAfterPhraseMs);
        } else {
          speakNext();
        }
      };

      utterance.onerror = (event) => {
        perfDiagnostics.recordTtsError(perfUtteranceId, event.error || 'unknown');
        if (cancelled) return;
        cancelled = true;
        ttsUtteranceRef.current = null;
        setTtsStatus('paused');
        setError('TTS playback stopped unexpectedly.');
      };

      perfDiagnostics.recordTtsSpeak(perfUtteranceId);
      speakBrowserTts(utterance);
    };

    speakNext();
  }

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

  function pauseTts(): void {
    if (isBrowserTtsSupported()) {
      ttsPausedAtWordIndexRef.current = estimateTtsSpokenWordIndex();
      cancelBrowserTts();
      ttsUtteranceRef.current = null;
      ttsChunkStartMsRef.current = null;
    }

    recordTtsTelemetryAction('pause');
    setRunning(false);
    setSessionStatus((current) => (current === 'finished' ? current : 'paused'));
    setTtsStatus((current) => (current === 'playing' ? 'paused' : current));
  }

  function resumeTts(): void {
    if (!isBrowserTtsSupported()) return;
    if (ttsPausedAtWordIndexRef.current !== null) {
      playTtsFromWord(ttsPausedAtWordIndexRef.current);
      return;
    }
    resumeBrowserTts();
    recordTtsTelemetryAction('resume');
    if (ttsStartedAtMsRef.current === null) {
      ttsStartedAtMsRef.current = performance.now();
    }
    setRunning(true);
    setSessionStatus((current) => (current === 'finished' ? current : 'running'));
    setTtsStatus('playing');
  }

  function stopTtsPlayback(action?: ControlAction): void {
    if (action) {
      recordTtsTelemetryAction(action);
    }
    if (isBrowserTtsSupported()) {
      cancelBrowserTts();
    }
    ttsUtteranceRef.current = null;
    ttsChunkStartMsRef.current = null;
    ttsPausedAtWordIndexRef.current = null;
    ttsCompletedSourceWordsRef.current = 0;
    setTtsCurrentChunk('');
    setTtsPacingMode('balanced');
    setTtsSpeechRate(1);
    setRunning(false);
    setSessionStatus((current) => {
      if (current === 'finished') return current;
      return ttsPracticeText.trim() ? 'paused' : 'ready';
    });
    setTtsStatus(ttsText.trim() ? 'ready' : 'idle');
  }

  function seekTtsPlayback(percent: number): void {
    if (activeInputMode !== BROWSER_TTS_SESSION_INPUT_MODE || !ttsHasText || activeSessionFinished) return;
    const wordCount = ttsTranscript?.words.length ?? 0;
    if (wordCount === 0) return;
    const targetWordIndex = Math.floor(clamp(percent, 0, 1) * Math.max(0, wordCount - 1));
    if (isBrowserTtsSupported()) {
      cancelBrowserTts();
    }
    ttsPausedAtWordIndexRef.current = null;
    ttsCompletedSourceWordsRef.current = targetWordIndex;
    ttsChunkStartMsRef.current = null;
    recordTtsTelemetryAction('seek');
    if (ttsStatus === 'playing' || ttsStatus === 'paused') {
      playTtsFromWord(targetWordIndex);
    } else {
      setTtsStatus('ready');
      setRunning(false);
      setSessionStatus((current) => (current === 'finished' ? current : 'paused'));
      setTtsPlayerProgressTick((value) => value + 1);
    }
  }


  const {
    inputSettingsReady,
    setupLocked,
    lockInputSettings,
    focusedTrainingControls,
  } = useTrainingSessionLifecycle({
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
      collapseSetupPanels: () => {
        setTtsExpanded(false);
      },
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
    setExportMessage,
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
    showOpenRouterButton: openRouterAccessAllowed,
    syncStatusState: supabaseSyncStatus.state,
    syncStatusText: appShellSyncStatusText,
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

  const browserTtsSetupCardProps = useBrowserTtsSetupCardProps({
    activeInputLabel,
    activeInputFeatureLabel,
    ttsExpanded,
    ttsHasText,
    ttsText,
    ttsLanguage,
    ttsStatus,
    ttsSpeechRate,
    ttsPacingMode,
    ttsCurrentChunk,
    supportedLanguages: SUPPORTED_LANGUAGES,
    setupLocked,
    inputSettingsReady,
    onToggleExpanded: () => setTtsExpanded((value) => !value),
    onTtsTextChange,
    onTtsLanguageChange: setTtsLanguage,
    onLockInputSettings: lockInputSettings,
    formatTtsPacingMode,
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
        {!setupLocked ? (
              activeInputMode === BROWSER_TTS_SESSION_INPUT_MODE ? (
                <BrowserTtsSetupCard {...browserTtsSetupCardProps} />
              ) : (
                null
              )) : null}

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
