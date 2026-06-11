import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthWorkspaceState } from './app/useAuthWorkspaceState';
import { useAuthHeaders } from './app/useAuthHeaders';
import {
  useDictaAppProfileRuntime,
} from './app/useDictaAppProfileRuntime';
import { useThemeModeRuntime } from './app/useThemeModeRuntime';
import { useOnlineStatus } from './app/useOnlineStatus';
import { useModelPreferenceRuntime } from './app/useModelPreferenceRuntime';
import { useModelCatalogRuntime } from './app/useModelCatalogRuntime';
import { useModelRefreshActions } from './app/useModelRefreshActions';
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
import { useOpenRouterWorkspaceProps } from './app/useOpenRouterWorkspaceProps';
import { useAdaptiveDiagnosticsUiState } from './app/useAdaptiveDiagnosticsUiState';
import { useAdaptiveWorkspaceState } from './app/useAdaptiveWorkspaceState';
import { useAppPerfDiagnosticsRuntime } from './app/useAppPerfDiagnosticsRuntime';
import { useAdaptiveStoragePersistenceEffects } from './app/useAdaptiveStoragePersistenceEffects';
import { useDictaDebugExportEffect } from './app/useDictaDebugExportEffect';
import { useDictaSupabaseRuntime } from './app/useDictaSupabaseRuntime';
import { useSessionCreationWorkspaceState } from './app/useSessionCreationWorkspaceState';
import { perfDiagnostics } from './core/perfDiagnostics';
import { useAdaptiveExportActions } from './app/useAdaptiveExportActions';
import { useSupabaseAuthActions } from './app/useSupabaseAuthActions';
import { useSessionCreationActions } from './app/useSessionCreationActions';
import type {
  KeyboardEvent } from 'react';
import './App.css';
import type {
  BrowserTtsEnvironmentFingerprint,
  ControlAction,
  SessionTelemetry,
  TtsChunkTelemetry,
  TtsPacingMode } from './types/dictation';
import type {
  InputMode,
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
  formatSessionPointsLabel,
  } from './core/evaluation';
import { buildSessionScoreHelpText,
  computeSessionScore } from './core/sessionScore';
import {
  clampBrowserTtsDeDecisionToRecommendation,
  createEmptyInputLanguageBenchmark,
  normalizeBenchmarkLanguage,
  } from './core/adaptive/AdaptiveInputLanguageBenchmarkService';
import {
  selectLatestAdaptiveSessionFeedback,
  } from './core/adaptive/sessionFeedback';
import { buildBrowserTtsTelemetryFrame,
  buildAdaptiveBrowserTtsInput } from './inputs/browserTts/browserTtsTelemetryAdapter';
import { planBrowserTtsAdaptiveChunk } from './inputs/browserTts/ttsDynamicChunkPlanner';
import { applyBrowserTtsMobilePacingFallback,
  applyBrowserTtsRuntimeRateFloor,
  buildBrowserTtsControlLagSample } from './inputs/browserTts/browserTtsRatePolicy';
import { applyBrowserTtsUnsafeBoundaryPolicy } from './inputs/browserTts/browserTtsUnsafePolicy';
import { applyBrowserTtsDeRecoveryPolicy,
  summarizeBrowserTtsDeRecoveryState } from './inputs/browserTts/browserTtsRecoveryPolicy';
import { resolveBrowserTtsAdaptiveProfile } from './inputs/browserTts/browserTtsAdaptiveProfiles';
import {
  chooseDiverseBrowserTtsVoiceURIForSession,
  resolveBrowserTtsSessionVoice,
  } from './inputs/browserTts/browserTtsVoices';
import {
  collectBrowserTtsEnvironmentFingerprint,
  } from './inputs/browserTts/browserTtsEnvironment';
import { sameBrowserTtsEnvironment } from './inputs/browserTts/browserTtsEnvironmentComparison';
import { trackAction,
  trackSample } from './core/telemetry';
import { cloneTelemetry,
  normalizeSessionForPersistence } from './core/sessionNormalization';
import { telemetryEquals } from './core/sessionTelemetryEquality';
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  } from './core/languages';
import { PerfDiagnosticsOverlay } from './components/PerfDiagnosticsOverlay';
import { TrainingView,
  type TrainingViewProps } from './components/TrainingView';
import { AppShellHeader } from './components/app-shell/AppShellHeader';
import { AuthWorkspace } from './components/auth/AuthWorkspace';
import { PendingSessionLane } from './components/training/PendingSessionLane';
import { TrainingHeader } from './components/training/TrainingHeader';
import { OpenRouterWorkspace } from './components/openrouter/OpenRouterWorkspace';
import { OllamaWorkspace } from './components/ollama/OllamaWorkspace';
import { LeaderboardWorkspace } from './components/leaderboard/LeaderboardWorkspace';
import { SessionCreateCard } from './components/runtime-workspaces/SessionCreateCard';
import { BrowserTtsSetupCard } from './components/runtime-workspaces/BrowserTtsSetupCard';
import { LiveMetricsDock } from './components/runtime-workspaces/LiveMetricsDock';
import { SessionDashboard } from './components/session-dashboard/SessionDashboard';
import { AdaptiveBenchmarkSection } from './components/adaptive-workspace/AdaptiveBenchmarkWorkspace';
import { AdaptiveAdvancedDiagnostics } from './components/adaptive-workspace/AdaptiveAdvancedDiagnostics';
import { AdminWorkspace } from './components/admin/AdminWorkspace';
import { Metric } from './components/shared/Metric';
import { SessionDeviceIcon } from './components/shared/SessionDeviceIcon';
import type {
  BenchmarkLanguageButton,
  } from './components/openrouter/types';
import {
  normalizeLiveSessionStatusForPersistence,
  } from './core/sessionStatusNormalization';
import { copySessionSnapshot,
  downloadSessionSnapshot } from './app/sessionSnapshotActions';
import {
  buildAdaptiveAdapterCards,
  formatAdaptiveModeFromSession,
  formatInputModeLabel,
  formatSessionGenerationOrigin,
  formatSessionInputMode,
  } from './app/sessionDisplayFormatters';
import { copyDictaLocalStorage,
  downloadDictaLocalStorage } from './app/dictaLocalStorageSnapshot';
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
import { useSessionPersistenceSync } from './app/useSessionPersistenceSync';
import { useAdaptiveRuntime } from './app/useAdaptiveRuntime';
import {
  loadAdaptiveBenchmarks,
  loadAdaptiveSessionFeedback,
  } from './app/adaptiveStorage';
import {
  OLLAMA_RECOMMENDED_DEFAULT_MODEL,
  persistOllamaDefaultModel,
  } from './app/modelPreferenceStorage';
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
  derivePerformanceTrend,
  deriveTtsControlAction,
  getTtsVoiceLang,
  mapSessionInputMode,
  } from './app/appRuntimeHelpers';
import { buildRepeatWordStats,
  buildTextTranscript } from './app/repeatWordStats';
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
  TtsPerformanceSampleResult,
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
    showOllamaWorkspace,
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
    sessionCreationName,
    setSessionCreationName,
    dictationScriptJson,
    setDictationScriptJson,
    dictationScriptValidation,
    setDictationScriptValidation,
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
  useEffect(() => {
    if (browserTtsVoices.length === 0) return;
    setSessions((prev) => {
      let changed = false;
      const usedVoiceURIs = prev
        .filter((session) => session.inputMode === BROWSER_TTS_SESSION_INPUT_MODE && session.ttsLanguage)
        .map((session) => session.ttsVoiceURI);
      const next = prev.map((session) => {
        if (
          session.inputMode !== BROWSER_TTS_SESSION_INPUT_MODE ||
          !session.inputSettingsLocked ||
          !session.ttsLanguage ||
          session.ttsVoiceURI ||
          !session.ttsText.trim()
        ) {
          return session;
        }
        const ttsVoiceURI = chooseDiverseBrowserTtsVoiceURIForSession(
          session.inputMode,
          browserTtsVoices,
          session.ttsLanguage,
          usedVoiceURIs,
        );
        if (!ttsVoiceURI) return session;
        usedVoiceURIs.push(ttsVoiceURI);
        const selectedVoice = browserTtsVoices.find((voice) => voice.voiceURI === ttsVoiceURI) ?? null;
        const nextSession = attachBrowserTtsEnvironment({ ...session, ttsVoiceURI }, selectedVoice, ttsVoiceURI);
        changed = true;
        return nextSession;
      });
      return changed ? next : prev;
    });
  }, [browserTtsVoices]);
  const {
    openRouterDefaultModel,
    setOpenRouterDefaultModel,
    ollamaDefaultModel,
    setOllamaDefaultModel,
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
    ollamaModels,
    ollamaStatus,
    ollamaError,
    refreshOpenRouterModels: refreshOpenRouterModelCatalog,
    refreshOllamaModels: refreshOllamaModelCatalog,
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
  const assignedOpenRouterModel =
    syncConfig.authRequired && appProfile?.role === 'member' ? appProfile.assignedOpenRouterModel?.trim() ?? '' : '';
  const effectiveOpenRouterDefaultModel = assignedOpenRouterModel || openRouterDefaultModel;
  const {
    refreshOpenRouterModels,
    refreshOllamaModels,
  } = useModelRefreshActions({
    getAuthHeaders,
    assignedOpenRouterModel,
    openRouterDefaultModel,
    setOpenRouterDefaultModel,
    ollamaDefaultModel,
    setOllamaDefaultModel,
    refreshOpenRouterModelCatalog,
    refreshOllamaModelCatalog,
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

  const ttsHasText = ttsText.trim().length > 0;
  const ttsTranscript = useMemo(() => buildTextTranscript(ttsText), [ttsText]);
  const deferredTtsPracticeText = useDeferredValue(ttsPracticeText);
  const ttsPracticeEvaluation = useMemo(
    () => evaluateTranscriptAttempt(deferredTtsPracticeText, ttsTranscript),
    [deferredTtsPracticeText, ttsTranscript],
  );
  const ttsPracticeWords = ttsPracticeEvaluation.typedWords;
  const ttsVisibleAccuracy =
    ttsPracticeWords.length > 0 && (ttsTranscript?.words.length ?? 0) > 0 ? ttsPracticeEvaluation.accuracy : 0;
  const ttsVisibleScore =
    ttsPracticeWords.length > 0 && (ttsTranscript?.words.length ?? 0) > 0
      ? computeSessionScore({
          accuracy: ttsVisibleAccuracy,
          lagSec,
          wpm,
          rate,
          points: ttsPracticeEvaluation.points,
        })
      : 0;
  const activePoints = ttsPracticeEvaluation.points;
  const activeVisibleAccuracy = ttsVisibleAccuracy;
  const activeVisibleScore = ttsVisibleScore;
  const activeMaxPoints = useMemo(
    () =>
      computeSessionMaxPoints({
        inputMode: activeInputMode,
        ttsText,
      }),
    [activeInputMode, ttsText],
  );
  const activeLivePointsLabel = formatSessionPointsLabel(activePoints, activeMaxPoints);
  const activeLiveScoreHelpText = buildSessionScoreHelpText({
    accuracy: activeVisibleAccuracy,
    lagSec,
    wpm,
    rate,
    points: activePoints,
    score: activeVisibleScore,
  });
  const activeLivePointsHelpText = buildSessionPointsHelpText(activeMaxPoints);
  const activeLiveAccuracyHelpText = 'Accuracy is matched target words divided by typed words, including exact and one-character typo matches.';

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
    setDifficulty(activeSession.difficulty);
    setInputSettingsLocked(Boolean(activeSession.inputSettingsLocked));
    setTtsLanguage(activeSession.ttsLanguage ?? 'de');
    setTtsPracticeText(activeSession.ttsPracticeText ?? '');
    ttsPracticeLiveTextRef.current = activeSession.ttsPracticeText ?? '';
    setSessionStatus(activeSession.status);
    setTtsText(activeSession.ttsText ?? '');
    setTtsStatus(activeSession.inputMode === BROWSER_TTS_SESSION_INPUT_MODE && activeSession.status === 'finished' ? 'finished' : activeSession.ttsText ? 'ready' : 'idle');
    setTtsCurrentChunk('');
    setTtsPacingMode('balanced');
    setTtsSpeechRate(1);
    setRunning(false);
    const hydratedMetrics = activeSession.status === 'finished' ? activeSession.metrics : null;
    setRate(hydratedMetrics?.rate ?? 1);
    setLagSec(hydratedMetrics?.lagSec ?? 0);
    setLagWords(hydratedMetrics?.lagWords ?? 0);
    setWpm(hydratedMetrics?.wpm ?? 0);
    setAccuracy(hydratedMetrics?.accuracy ?? 100);
    setTrend(hydratedMetrics?.trend ?? 'stable');
    setControllerState(hydratedMetrics?.controllerState ?? 'hold');
    ttsUiLastPublishedAtRef.current = 0;
    ttsPublishedUiRef.current = {
      controllerState: 'hold',
      rate: 1,
      lagSec: 0,
      lagWords: 0,
      wpm: 0,
      accuracy: 100,
      trend: 'stable',
    };
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
    const nextInputSettingsLocked = options.preserveInputSettingsLock ? inputSettingsLocked : false;
    if (activeSession?.status === 'finished') {
      allowFinishedSessionResetRef.current = activeSession.id;
    }
    stopTtsPlayback();
    setTtsPracticeText('');
    ttsPracticeLiveTextRef.current = '';
    setTtsStatus(ttsText.trim() ? 'ready' : 'idle');
    setTtsCurrentChunk('');
    setTtsPacingMode('balanced');
    setTtsSpeechRate(1);
    ttsStartedAtMsRef.current = null;
    ttsChunkStartMsRef.current = null;
    ttsChunkStartWordIndexRef.current = 0;
    ttsChunkWordCountRef.current = 0;
    ttsCompletedSourceWordsRef.current = 0;
    ttsLastControllerActionRef.current = 'hold';
    setRunning(false);
    setRate(1);
    setLagSec(0);
    setLagWords(0);
    setWpm(0);
    setAccuracy(100);
    setControllerState('hold');
    ttsUiLastPublishedAtRef.current = 0;
    ttsPublishedUiRef.current = {
      controllerState: 'hold',
      rate: 1,
      lagSec: 0,
      lagWords: 0,
      wpm: 0,
      accuracy: 100,
      trend: 'stable',
    };
    setSessionStatus('ready');
    setTrainingSubmitMessage('');
    setInputSettingsLocked(nextInputSettingsLocked);
    if (!nextInputSettingsLocked) {
      if (activeInputMode === BROWSER_TTS_SESSION_INPUT_MODE) {
        setTtsExpanded(true);
      }
    }
    telemetryRef.current = null;
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

  function collectBrowserTtsEnvironmentForSession(
    session: StoredSession | null | undefined,
    selectedVoice: SpeechSynthesisVoice | null = null,
    selectedVoiceURI: string | null | undefined = session?.ttsVoiceURI,
  ): BrowserTtsEnvironmentFingerprint | null {
    if (!session || session.inputMode !== BROWSER_TTS_SESSION_INPUT_MODE) return null;
    return collectBrowserTtsEnvironmentFingerprint({
      inputMode: 'browser-tts',
      language: session.ttsLanguage,
      selectedVoice,
      selectedVoiceURI: selectedVoice?.voiceURI ?? selectedVoiceURI ?? null,
      voices: browserTtsVoices,
      navigatorRef: window.navigator,
      matchMedia: window.matchMedia.bind(window),
    });
  }

  function attachBrowserTtsEnvironment(
    session: StoredSession,
    selectedVoice: SpeechSynthesisVoice | null = null,
    selectedVoiceURI: string | null | undefined = session.ttsVoiceURI,
  ): StoredSession {
    if (session.inputMode !== BROWSER_TTS_SESSION_INPUT_MODE) return session;
    const ttsEnvironment = collectBrowserTtsEnvironmentForSession(session, selectedVoice, selectedVoiceURI);
    if (sameBrowserTtsEnvironment(session.ttsEnvironment, ttsEnvironment)) return session;
    return { ...session, ttsEnvironment };
  }

  function resolveActiveBrowserTtsVoice(): SpeechSynthesisVoice | null {
    if (!activeSession || activeSession.inputMode !== BROWSER_TTS_SESSION_INPUT_MODE) return null;
    const resolution = resolveBrowserTtsSessionVoice(browserTtsVoices, ttsLanguage, activeSession.ttsVoiceURI);
    const nextVoiceURI = resolution.voiceURI ?? activeSession.ttsVoiceURI ?? null;
    const nextEnvironment = collectBrowserTtsEnvironmentForSession(activeSession, resolution.voice, nextVoiceURI);
    if (nextVoiceURI !== activeSession.ttsVoiceURI || !sameBrowserTtsEnvironment(activeSession.ttsEnvironment, nextEnvironment)) {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSession.id
            ? { ...session, ttsVoiceURI: nextVoiceURI, ttsEnvironment: nextEnvironment, updatedAt: new Date().toISOString() }
            : session,
        ),
      );
    }
    return resolution.voice;
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

  function applyTtsPerformanceSample(
    options: { action?: ControlAction; finalize?: boolean; forcePublishUi?: boolean; practiceTextOverride?: string } = {},
  ): TtsPerformanceSampleResult {
    const now = performance.now();
    if (ttsStartedAtMsRef.current === null) {
      ttsStartedAtMsRef.current = now;
    }

    const practiceTextForEvaluation = options.practiceTextOverride ?? ttsPracticeLiveTextRef.current;
    const evaluation = evaluateTranscriptAttempt(practiceTextForEvaluation, ttsTranscript);
    const practiceWords = evaluation.typedWords;
    const visibleAccuracy = practiceWords.length > 0 && (ttsTranscript?.words.length ?? 0) > 0 ? evaluation.accuracy : 0;
    const sourceWordCount = ttsTranscript?.words.length ?? 0;
    const typedProgress = Math.max(0, evaluation.lastMatchedTargetIndex + 1);
    const spokenPosition = estimateTtsSpokenWordIndex(now);
    const nextLagWords = sourceWordCount > 0 ? spokenPosition - typedProgress : 0;
    const wordsPerSecond = Math.max(1, TTS_BASE_WORDS_PER_SECOND * ttsSpeechRate);
    const nextRawLagSec = nextLagWords / wordsPerSecond;
    const lagSample = buildBrowserTtsControlLagSample({
      rawLagSec: nextRawLagSec,
      language: ttsLanguage,
      previousValidControlLagSec: ttsLastValidControlLagSecRef.current,
    });
    if (lagSample.isOutlier) {
      ttsLagOutlierCountRef.current += 1;
    }
    const nextLagSec = lagSample.stableLagSec;
    if (!lagSample.usedFallbackControlLag && Number.isFinite(nextLagSec)) {
      ttsLastValidControlLagSecRef.current = nextLagSec;
    }
    const elapsedMinutes = Math.max(getTtsElapsedSeconds(now) / 60, 1 / 60);
    const nextWpm = practiceWords.length > 0 ? practiceWords.length / elapsedMinutes : 0;
    const nextAccuracy = practiceWords.length > 0 ? visibleAccuracy : 100;
    const nextControllerAction = deriveTtsControlAction({
      accuracy: nextAccuracy,
      lagSec: nextLagSec,
      wpm: nextWpm,
      typedWords: practiceWords.length,
    });
    const nextTrend = derivePerformanceTrend(nextLagSec, nextAccuracy, previousLagRef.current, previousAccuracyRef.current);
    const nextRate = ttsSpeechRate;
    const nextScore =
      practiceWords.length > 0 && (ttsTranscript?.words.length ?? 0) > 0
        ? computeSessionScore({
            accuracy: nextAccuracy,
            lagSec: nextLagSec,
            wpm: nextWpm,
            rate: nextRate,
            points: evaluation.points,
          })
        : 0;

    ttsLiveSignalRef.current = {
      accuracy: nextAccuracy,
      lagSec: nextLagSec,
      rawLagSec: lagSample.rawLagSec,
      stableLagSec: lagSample.stableLagSec,
      lagOutlierCount: ttsLagOutlierCountRef.current,
      wpm: nextWpm,
      trend: nextTrend,
      controllerState: nextControllerAction,
    };

    publishTtsUiState(
      {
        controllerState: nextControllerAction,
        rate: nextRate,
        lagSec: nextLagSec,
        lagWords: nextLagWords,
        wpm: nextWpm,
        accuracy: nextAccuracy,
        trend: nextTrend,
      },
      now,
      Boolean(options.forcePublishUi || options.finalize || options.action),
    );
    previousLagRef.current = nextLagSec;
    previousAccuracyRef.current = nextAccuracy;

    const telemetry = ensureAttemptTelemetry();
    const nextTelemetry = cloneTelemetry(telemetry);
    trackSample(nextTelemetry, nextLagSec, nextWpm, nextAccuracy, nextRate);

    if (options.action) {
      trackAction(nextTelemetry, getTtsElapsedSeconds(now), options.action, nextRate);
    } else if (nextControllerAction !== ttsLastControllerActionRef.current) {
      trackAction(nextTelemetry, getTtsElapsedSeconds(now), nextControllerAction, nextRate);
      ttsLastControllerActionRef.current = nextControllerAction;
    }

    if (options.finalize) {
      nextTelemetry.finishedAt = new Date().toISOString();
    }

    telemetryRef.current = nextTelemetry;
    return {
      metrics: {
        controllerState: nextControllerAction,
        rate: nextRate,
        lagSec: nextLagSec,
        lagWords: nextLagWords,
        wpm: nextWpm,
        accuracy: nextAccuracy,
        trend: nextTrend,
        score: nextScore,
        points: evaluation.points,
      },
      telemetry: nextTelemetry,
    };
  }

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
          ? resolveBrowserTtsSessionVoice(browserTtsVoices, ttsLanguage, activeSession.ttsVoiceURI)
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
    setOllamaDefaultModel,
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
  const ttsPlayerWordCount = ttsTranscript?.words.length ?? 0;
  const ttsPlayerCurrentWord = ttsHasText ? estimateTtsSpokenWordIndex() : 0;
  const ttsPlayerWordsPerSecond = Math.max(1, TTS_BASE_WORDS_PER_SECOND * ttsSpeechRate);
  const ttsPlayerDurationSec = ttsPlayerWordCount > 0 ? ttsPlayerWordCount / ttsPlayerWordsPerSecond : 0;
  const ttsPlayerCurrentSec =
    ttsPlayerWordCount > 0 ? Math.min(ttsPlayerDurationSec, (ttsPlayerCurrentWord / ttsPlayerWordCount) * ttsPlayerDurationSec) : 0;
  const ttsPlayerProgressPercent = ttsPlayerDurationSec > 0 ? clamp((ttsPlayerCurrentSec / ttsPlayerDurationSec) * 100, 0, 100) : 0;
  void ttsPlayerProgressTick;
  const sessionCreationNameTrimmed = sessionCreationName.trim();
  const canCreateSessionFromDialog = sessionCreationNameTrimmed.length > 0 && !sessionQuotaStatus.blocked;
  const validatedDictationScript = dictationScriptValidation?.ok ? dictationScriptValidation.script : null;
  const adaptiveAdapters = buildAdaptiveAdapterCards();
  const selectedBenchmarkProfile =
    adaptiveBenchmarksByInputLanguage[selectedBenchmarkInputMode]?.[selectedBenchmarkLanguage] ??
    createEmptyInputLanguageBenchmark(selectedBenchmarkInputMode, selectedBenchmarkLanguage);
  const selectedSessionFeedback = selectLatestAdaptiveSessionFeedback(
    adaptiveSessionFeedbackByInputLanguage[selectedBenchmarkInputMode]?.[selectedBenchmarkLanguage],
    selectedBenchmarkInputMode,
    selectedBenchmarkLanguage,
  );
  const insightsDiagnosticProfile =
    adaptiveBenchmarksByInputLanguage[insightsDiagnosticInputMode]?.[metricsLanguageView] ??
    createEmptyInputLanguageBenchmark(insightsDiagnosticInputMode, metricsLanguageView);
  const insightsDiagnosticFeedback = selectLatestAdaptiveSessionFeedback(
    adaptiveSessionFeedbackByInputLanguage[insightsDiagnosticInputMode]?.[metricsLanguageView],
    insightsDiagnosticInputMode,
    metricsLanguageView,
  );
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
  const latestAdaptiveMode = latestSession ? formatAdaptiveModeFromSession(latestSession) : 'Balanced';
  const latestInputAdapter = latestSession ? adaptiveAdapters.find((adapter) => adapter.inputMode === latestSession.inputMode) ?? null : null;
  const insightsDiagnosticInputOptions: Array<{ inputMode: InputMode; label: string }> = [
    { inputMode: 'browser-tts', label: 'Browser TTS' },
  ];
  const isFocusedTrainingRoute = currentPath === '/training' || currentPath === '/training/';
  const focusedProgressLabel =
    adaptiveSemanticDebug.totalSemanticPhrases > 0
      ? `Phrase ${Math.min(adaptiveSemanticDebug.currentPhraseIndex + 1, adaptiveSemanticDebug.totalSemanticPhrases)}/${adaptiveSemanticDebug.totalSemanticPhrases}`
      : ttsPlayerWordCount > 0
        ? `Word ${Math.min(ttsPlayerCurrentWord, ttsPlayerWordCount)}/${ttsPlayerWordCount}`
        : 'No source loaded';
  const focusedSourceLabel =
    ttsHasText
      ? `${ttsTranscript?.words.length ?? 0} words Â· ${ttsLanguage?.toUpperCase()}`
      : 'TTS source not loaded';
  const focusedTextValue = ttsPracticeText;
  const focusedTextPlaceholder =
    activeSessionFinished
      ? 'Session submitted.'
      : 'Type the dictation here...';
  const focusedInputHandler = onTtsPracticeChange;
  const focusedImmediateInputHandler = (value: string): void => {
    if (!telemetryRef.current || !telemetryRef.current.startedAt) {
      telemetryRef.current = { ...cloneTelemetry(telemetryRef.current), startedAt: new Date().toISOString() };
    }
    if (ttsStartedAtMsRef.current === null) {
      ttsStartedAtMsRef.current = performance.now();
    }
    ttsPracticeLiveTextRef.current = value;
  };
  const focusedKeyDownHandler = onTtsPracticeKeyDown;
  const focusedTrainingMessage = error || trainingSubmitMessage || [exportMessage, openRouterJobStatus, openRouterError].filter(Boolean).join(' ');
  const focusedTrainingMessageTone: 'error' | 'success' | 'hint' = error
    ? 'error'
    : trainingSubmitMessage
      ? 'success'
      : 'hint';
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

  const focusedTrainingProps: TrainingViewProps<StoredSession> = {
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
    liveScoreLabel: String(activeVisibleScore),
    liveScoreHelpText: activeLiveScoreHelpText,
    livePointsLabel: activeLivePointsLabel,
    livePointsHelpText: activeLivePointsHelpText,
    liveAccuracyLabel: `${activeVisibleAccuracy.toFixed(1)}%`,
    liveAccuracyHelpText: activeLiveAccuracyHelpText,
    liveLagLabel: `${lagSec.toFixed(2)}s`,
    liveLagHelpText:
      'Lag compares typed progress with expected playback progress. Positive means you are behind; negative means you are ahead.',
    readOnly: activeSessionFinished,
    canPlay: focusedTrainingControls.canPlay,
    playLabel: focusedTrainingControls.playLabel,
    onPlay: focusedTrainingControls.onPlay,
    canPause: focusedTrainingControls.canPause,
    onPause: focusedTrainingControls.onPause,
    canReplay: ttsHasText && ttsPlayerDurationSec > 0,
    onReplay: replayFocusedTts,
    canStop: focusedTrainingControls.canStop,
    onStop: focusedTrainingControls.onStop,
    canReset: focusedTrainingControls.canReset,
    onReset: focusedTrainingControls.onReset,
    canSubmit: focusedTrainingControls.canSubmit,
    onSubmit: focusedTrainingControls.onSubmit,
    submitLabel: focusedTrainingControls.submitLabel,
    message: focusedTrainingMessage,
    messageTone: focusedTrainingMessageTone,
    textCommitDelayMs: 250,
    pendingSessions,
    activeSessionId,
    onOpenPendingSession: openWorkspaceForSession,
    onDeletePendingSession: deleteSession,
    syncStatus: supabaseSyncStatus,
    pendingSyncSummary,
    isOnline,
    generationButtons: focusedTrainingGenerationButtons,
  };

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

  const appShellOpenRouterModel = effectiveOpenRouterDefaultModel.trim();
  const appShellSyncStatusText = `${isOnline ? 'Sync' : 'Offline'}: ${isOnline ? formatSupabaseSyncState(supabaseSyncStatus) : 'Saved locally'}${
    supabaseSyncStatus.lastSyncedAt ? ` Â· ${formatSessionDate(supabaseSyncStatus.lastSyncedAt)}` : ''
  }${supabaseSyncStatus.enabled && pendingSyncSummary.hasPending ? ` Â· ${pendingSyncSummary.count} pending` : ''}`;

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
      <AuthWorkspace
        themeMode={themeMode}
        authLoading={authLoading}
        authView={authView}
        authSession={authSession}
        appProfile={appProfile}
        appProfileError={appProfileError}
        localStorageReadyForEffectiveProfile={localStorageReadyForEffectiveProfile}
        supabaseInitialSyncPending={supabaseInitialSyncPending}
        effectiveProfileId={effectiveProfileId}
        authEmail={authEmail}
        authPassword={authPassword}
        authNewPassword={authNewPassword}
        authNewPasswordConfirm={authNewPasswordConfirm}
        authBusy={authBusy}
        authMessage={authMessage}
        authMessageTone={authMessageTone}
        authError={authError}
        perfDiagnosticsEnabled={perfDiagnosticsEnabled}
        onSignIn={signInWithSupabase}
        onRequestPasswordReset={requestSupabasePasswordReset}
        onUpdatePassword={updateSupabasePassword}
        onSignOut={signOut}
        onShowAuthView={showAuthView}
        onAuthEmailChange={setAuthEmail}
        onAuthPasswordChange={setAuthPassword}
        onAuthNewPasswordChange={setAuthNewPassword}
        onAuthNewPasswordConfirmChange={setAuthNewPasswordConfirm}
      />
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
        <AppShellHeader
          themeMode={themeMode}
          showOpenRouterStatus={openRouterAccessAllowed}
          openRouterModelIsSet={Boolean(appShellOpenRouterModel)}
          openRouterModelTitle={appShellOpenRouterModel ? `Selected OpenRouter model: ${appShellOpenRouterModel}` : 'No OpenRouter model selected'}
          openRouterModelLabel={appShellOpenRouterModel ? `Model set: ${appShellOpenRouterModel}` : 'No model set'}
          buildInfoTitle={DICTA_BUILD_INFO_TITLE}
          buildInfoLabel={DICTA_BUILD_INFO_LABEL}
          showAdminButton={isCurrentProfileAdmin || !syncConfig.authRequired}
          showOpenRouterButton={openRouterAccessAllowed}
          syncStatusState={supabaseSyncStatus.state}
          syncStatusText={appShellSyncStatusText}
          onOpenLeaderboard={showLeaderboardWorkspace}
          onOpenMobileTraining={() => navigateAppRoute('/training')}
          onOpenAdaptive={openAdaptiveWorkspaceFromHeader}
          onOpenAdmin={showAdminWorkspace}
          onOpenOpenRouter={showOpenRouterWorkspace}
          onOpenOllama={showOllamaWorkspace}
          onToggleTheme={() => setThemeMode((value) => (value === 'dark' ? 'light' : 'dark'))}
          onSignOut={signOut}
        >
          {sessionCreationMode ? (
            <SessionCreateCard
              sessionCreationSource={sessionCreationSource}
              sessionCreationName={sessionCreationName}
              sessionQuotaStatus={sessionQuotaStatus}
              canCreateSessionFromDialog={canCreateSessionFromDialog}
              localDevFeaturesAvailable={LOCAL_DEV_FEATURES_AVAILABLE}
              dictationScriptJson={dictationScriptJson}
              dictationScriptValidation={dictationScriptValidation}
              validatedDictationScript={validatedDictationScript}
              onSessionCreationSourceChange={(value) => {
                setSessionCreationSource(value);
                setDictationScriptValidation(null);
              }}
              onSessionCreationNameChange={setSessionCreationName}
              onCreateSessionWithMode={createSessionWithMode}
              onDictationScriptJsonChange={(value) => {
                setDictationScriptJson(value);
                setDictationScriptValidation(null);
              }}
              onValidateScriptImport={validateScriptImport}
              onCreateSessionFromDictationScript={createSessionFromDictationScript}
              onCancel={() => setSessionCreationMode(null)}
              MetricComponent={Metric}
            />
          ) : null}
        </AppShellHeader>
        {!setupLocked ? (
              activeInputMode === BROWSER_TTS_SESSION_INPUT_MODE ? (
                <BrowserTtsSetupCard
                  activeInputLabel={activeInputLabel}
                  activeInputFeatureLabel={activeInputFeatureLabel}
                  ttsExpanded={ttsExpanded}
                  ttsHasText={ttsHasText}
                  ttsText={ttsText}
                  ttsLanguage={ttsLanguage}
                  ttsStatus={ttsStatus}
                  ttsSpeechRate={ttsSpeechRate}
                  ttsPacingMode={ttsPacingMode}
                  ttsCurrentChunk={ttsCurrentChunk}
                  supportedLanguages={SUPPORTED_LANGUAGES}
                  setupLocked={setupLocked}
                  inputSettingsReady={inputSettingsReady}
                  onToggleExpanded={() => setTtsExpanded((value) => !value)}
                  onTtsTextChange={onTtsTextChange}
                  onTtsLanguageChange={setTtsLanguage}
                  onLockInputSettings={lockInputSettings}
                  formatTtsPacingMode={formatTtsPacingMode}
                />
              ) : (
                null
              )) : null}

        <section className="workspace">
          <section className="workspace-shell">
            <PendingSessionLane
              sessions={pendingSessions}
              activeSessionId={activeSessionId}
              onOpenSession={openWorkspaceForSession}
              onDeleteSession={deleteSession}
            />
            {workspaceMode === 'dashboard' && dashboardSession ? (
              <SessionDashboard
                session={dashboardSession}
                sessions={sessions}
                formatSessionStatus={formatSessionStatus}
                formatSessionDate={formatSessionDate}
                formatSessionPlaybackDuration={(session) => formatSessionPlaybackDuration(session as StoredSession)}
                onBackToLeaderboard={showLeaderboardWorkspace}
                onBackToTraining={showLeaderboardWorkspace}
              />
            ) : workspaceMode === 'adaptive' ? (
              <section className="panel workspace-panel adaptive-workspace">
                <div className="tts-workspace-header">
                  <div>
                    <p className="dashboard-eyebrow">Adaptive cockpit</p>
                    <h2>Adaptive Pace Layer</h2>
                  </div>
                  <div className="dashboard-header-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={showLeaderboardWorkspace}
                    >
                      Back to training
                    </button>
                  </div>
                </div>
                <div className="adaptive-workspace-grid">
                  <AdaptiveAdvancedDiagnostics
                    adaptiveSectionExpanded={adaptiveSectionExpanded}
                    adaptiveAdapters={adaptiveAdapters}
                    latestSession={latestSession}
                    latestInputAdapter={latestInputAdapter}
                    latestAdaptiveMode={latestAdaptiveMode}
                    selectedBenchmarkInputMode={selectedBenchmarkInputMode}
                    adaptiveSemanticDebug={adaptiveSemanticDebug}
                    mapSessionInputMode={mapSessionInputMode}
                    onToggleDecisionArchitectureSections={() =>
                      setAdaptiveSectionExpanded((prev) => ({
                        ...prev,
                        decision: !(prev.decision && prev.architecture),
                        architecture: !(prev.decision && prev.architecture),
                      }))
                    }
                    onToggleAdaptersSection={() => setAdaptiveSectionExpanded((prev) => ({ ...prev, adapters: !prev.adapters }))}
                    onToggleLatestSections={() =>
                      setAdaptiveSectionExpanded((prev) => ({
                        ...prev,
                        latest: !(prev.latest && prev.live),
                        live: !(prev.latest && prev.live),
                      }))
                    }
                    onToggleTelemetrySection={() => setAdaptiveSectionExpanded((prev) => ({ ...prev, telemetry: !prev.telemetry }))}
                    onOpenAdapter={(inputMode) => {
                      setSelectedBenchmarkInputMode(mapSessionInputMode(inputMode));
                      setBenchmarkExportMessage('');
                      setSessionFeedbackMessage('');
                      window.setTimeout(() => {
                        document.getElementById('adaptive-benchmarks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 0);
                    }}
                  />
                  <AdaptiveBenchmarkSection
                    id="adaptive-benchmarks"
                    adapters={adaptiveAdapters}
                    benchmarks={adaptiveBenchmarksByInputLanguage}
                    expanded={adaptiveSectionExpanded.benchmarks}
                    onToggleExpanded={() => setAdaptiveSectionExpanded((prev) => ({ ...prev, benchmarks: !prev.benchmarks }))}
                    focusAnchor={adaptiveBenchmarksFocusAnchor}
                    selectedInputMode={selectedBenchmarkInputMode}
                    selectedLanguage={selectedBenchmarkLanguage}
                    selectedProfile={selectedBenchmarkProfile}
                    repeatWordStats={repeatWordStats}
                    formatSessionDate={formatSessionDate}
                    onSelect={(inputMode, language) => {
                      setSelectedBenchmarkInputMode(inputMode);
                      setSelectedBenchmarkLanguage(language);
                      setBenchmarkExportMessage('');
                      setSessionFeedbackMessage('');
                    }}
                    benchmarkExportMessage={benchmarkExportMessage}
                    sessionFeedback={selectedSessionFeedback}
                    sessionFeedbackMessage={sessionFeedbackMessage}
                    onCopyBenchmark={(profile) => void copySelectedBenchmarkJson(profile)}
                    onExportBenchmark={downloadSelectedBenchmarkJson}
                    onCopyScriptPrompt={(profile) => void copyDictationScriptPrompt(profile)}
                    onCopyBenchmarkWithScriptPrompt={(profile) => void copyBenchmarkWithDictationScriptPrompt(profile)}
                    onCopyScriptTemplate={(profile) => void copyDictationScriptTemplate(profile)}
                    onCopySessionFeedback={(profile, feedback) => void copySessionFeedbackJson(profile, feedback)}
                    onCopyBenchmarkFeedback={(profile, feedback) => void copyBenchmarkFeedbackJson(profile, feedback)}
                    onCopyBenchmarkFeedbackPrompt={(profile, feedback) => void copyBenchmarkFeedbackPrompt(profile, feedback)}
                    onCopyBenchmarkFeedbackPromptWithHumanFeedback={(profile, feedback, humanFeedback) =>
                      void copyBenchmarkFeedbackPromptWithHumanFeedback(profile, feedback, humanFeedback)
                    }
                  />
                </div>
              </section>
            ) : workspaceMode === 'openrouter' ? (
              openRouterAccessState !== 'allowed' ? (
                <section className="panel workspace-panel">
                  <p className={openRouterAccessState === 'pending' ? 'hint' : 'error'}>
                    {openRouterAccessState === 'pending' ? 'Checking OpenRouter access...' : openRouterAccessMessage}
                  </p>
                </section>
              ) : (
              <OpenRouterWorkspace {...openRouterWorkspaceProps} />
              )
            ) : workspaceMode === 'ollama' ? (
              <OllamaWorkspace
                defaultModel={ollamaDefaultModel}
                authHeaders={getAuthHeaders()}
                models={ollamaModels}
                status={ollamaStatus}
                error={ollamaError}
                onSetDefaultModel={(value) => {
                  const nextModel = value.trim() || OLLAMA_RECOMMENDED_DEFAULT_MODEL;
                  setOllamaDefaultModel(nextModel);
                  persistOllamaDefaultModel(nextModel);
                }}
                onRefreshModels={refreshOllamaModels}
                onBackToTraining={showLeaderboardWorkspace}
              />
            ) : workspaceMode === 'admin' ? (
              isCurrentProfileAdmin || !syncConfig.authRequired ? <AdminWorkspace
                sessions={adminSessions}
                summary={adminStorageSummary}
                fileInventory={adminFileInventory}
                fileInventoryError={adminFileInventoryError}
                exportMessage={exportMessage}
                syncStatus={supabaseSyncStatus}
                languageView={adminLanguageView}
                onChangeLanguage={setAdminLanguageView}
                onBackToTraining={showLeaderboardWorkspace}
                onCopyLocalStorage={() => void copyDictaLocalStorage(setExportMessage)}
                onExportLocalStorage={downloadDictaLocalStorage}
                onImportLocalStorage={importDictaLocalStorageSnapshot}
                onExportSession={downloadSessionSnapshot}
                onCopySession={(session) => void copySessionSnapshot(session, setExportMessage)}
                appProfile={appProfile}
                visibleProfiles={visibleProfiles}
                selectedProfileFilter={adminProfileFilter}
                onChangeProfileFilter={setAdminProfileFilter}
                onUpdateProfileAccess={updateAdminProfileAccess}
                authHeaders={getAuthHeaders()}
                remoteAdminStatus={adminRemoteStatus}
                openRouterModels={openRouterModels}
                openRouterModelStatus={openRouterStatus}
                openRouterModelError={openRouterError}
                onRefreshOpenRouterModels={refreshOpenRouterModels}
              /> : (
                <section className="panel workspace-panel">
                  <p className="error">Admin access required.</p>
                </section>
              )
            ) : workspaceMode === 'leaderboard' ? (
              <LeaderboardWorkspace
                leaderboard={leaderboard}
                leaderboardSections={leaderboardSections}
                leaderboardLanguageView={leaderboardLanguageView}
                leaderboardExpanded={leaderboardExpanded}
                leaderboardSectionExpanded={leaderboardSectionExpanded}
                activeSessionId={activeSessionId}
                supportedLanguages={SUPPORTED_LANGUAGES}
                languageLabels={LANGUAGE_LABELS}
                onChangeLeaderboardLanguageView={setLeaderboardLanguageView}
                onToggleLeaderboardExpanded={() => setLeaderboardExpanded((value) => !value)}
                onToggleLeaderboardSectionExpanded={(sectionId) =>
                  setLeaderboardSectionExpanded((current) => ({
                    ...current,
                    [sectionId]: !current[sectionId],
                  }))
                }
                onOpenWorkspaceForSession={openWorkspaceForSession}
                onOpenDashboardForSession={openDashboardForSession}
                onDownloadSessionSnapshot={downloadSessionSnapshot}
                onCopySessionSnapshot={(session) => {
                  void copySessionSnapshot(session, setExportMessage);
                }}
                onDeleteSession={deleteSession}
                onBackToTraining={showLeaderboardWorkspace}
                formatLeaderboardSessionStatus={formatLeaderboardSessionStatus}
                formatSessionGenerationOrigin={formatSessionGenerationOrigin}
                formatSessionPlaybackDuration={formatSessionPlaybackDuration}
                formatSessionDate={formatSessionDate}
                formatSessionPointsForSession={formatSessionPointsForSession}
                buildSessionScoreHelpText={buildSessionScoreHelpText}
                buildSessionPointsHelpText={buildSessionPointsHelpText}
                computeSessionMaxPoints={computeSessionMaxPoints}
                getSessionDisplayTitle={getSessionDisplayTitle}
                isSessionReadyForTraining={isSessionReadyForTraining}
                MetricComponent={Metric}
                SessionDeviceIconComponent={SessionDeviceIcon}
              />
            ) : (
              <section className="panel workspace-panel">
                <p className="hint">Choose Browser TTS to train.</p>
              </section>
            )}
          </section>
        </section>
      </section>
      <LiveMetricsDock
        insightsCollapsed={insightsCollapsed}
        metricsLanguageView={metricsLanguageView}
        metricsRangeView={metricsRangeView}
        trend={trend}
        insightsDiagnosticInputOptions={insightsDiagnosticInputOptions}
        insightsDiagnosticInputMode={insightsDiagnosticInputMode}
        insightsDiagnosticMessage={insightsDiagnosticMessage}
        insightsDiagnosticFallbackReport={insightsDiagnosticFallbackReport}
        workspaceMode={workspaceMode}
        hasTtsCurrentChunk={Boolean(ttsCurrentChunk)}
        ttsPacingMode={ttsPacingMode}
        ttsStatus={ttsStatus}
        lastSessionForLanguage={lastSessionForLanguage}
        lastSessionScoreHelpText={lastSessionScoreHelpText}
        languageTodaySummary={languageTodaySummary}
        onChangeMetricsLanguageView={setMetricsLanguageView}
        onChangeMetricsRangeView={setMetricsRangeView}
        onChangeInsightsDiagnosticInputMode={setInsightsDiagnosticInputMode}
        onCopyInsightsDiagnosticPackage={copyInsightsDiagnosticPackage}
        onToggleInsightsCollapsed={() => setInsightsCollapsed((value) => !value)}
        onSelectInsightsDiagnosticFallbackReport={selectInsightsDiagnosticFallbackReport}
        formatInputModeLabel={formatInputModeLabel}
        formatSessionInputMode={formatSessionInputMode}
        formatDuration={formatDuration}
        formatSessionDate={formatSessionDate}
        formatTtsPacingMode={formatTtsPacingMode}
      />
    </main>
  );
}

export default App;
