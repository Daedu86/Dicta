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
import { buildAdaptiveEventCounts, useAdaptiveExportActions } from './app/useAdaptiveExportActions';
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
  LanguageCode,
  ListeningTrainingIntent,
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
  getBrowserTtsDeBenchmarkRejectionReason,
  normalizeBenchmarkLanguage,
  } from './core/adaptive/AdaptiveInputLanguageBenchmarkService';
import {
  buildOpenRouterGenerationPrompt,
  estimateOpenRouterPromptSize,
  getOpenRouterGenerationMaxTokens,
  type OpenRouterDurationMinutes,
  } from './core/adaptive/openRouterGenerationPrompt';
import { buildOpenRouterDiversificationHints } from './app/openRouterPromptHints';
import {
  type ActiveOpenRouterJob,
  type OpenRouterJobResponse,
  } from './core/openRouterJobs';
import {
  isTransientOpenRouterGenerationError,
  } from './core/adaptive/openRouterFallbackScript';
import {
  type DictationScriptDifficulty,
  type DictationScriptValidationResult,
  } from './core/adaptive/dictationScriptValidation';
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
import type {
  AdaptiveWorkspaceFocusAnchor } from './components/adaptive-workspace/types';
import { AdaptiveBenchmarkSection } from './components/adaptive-workspace/AdaptiveBenchmarkWorkspace';
import { AdaptiveAdvancedDiagnostics } from './components/adaptive-workspace/AdaptiveAdvancedDiagnostics';
import { AdminWorkspace } from './components/admin/AdminWorkspace';
import { Metric } from './components/shared/Metric';
import { SessionDeviceIcon } from './components/shared/SessionDeviceIcon';
import {
  buildTrainingGenerationButtonNotice,
  formatInterruptedOpenRouterMessage,
  parseTimestampMs,
  shouldCreatePersistentGenerationErrorSession,
  } from './components/openrouter/openRouterViewHelpers';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
  BenchmarkLanguageButton,
  } from './components/openrouter/types';
import { perfDiagnostics } from './core/perfDiagnostics';
import {
  normalizeLiveSessionStatusForPersistence,
  } from './core/sessionStatusNormalization';
import { estimateSessionVoiceDurationSec } from './core/sessionDuration';
import { copySessionSnapshot,
  downloadSessionSnapshot } from './app/sessionSnapshotActions';
import {
  buildAdaptiveAdapterCards,
  formatAdaptiveModeFromSession,
  formatInputModeLabel,
  formatSessionGenerationOrigin,
  formatSessionInputMode,
  } from './app/sessionDisplayFormatters';
import { createGeneratedErrorSession,
  getNextSessionIndex } from './app/sessionFactory';
import {
  mapDictationScriptInputModeToSession,
  } from './app/sessionRestoreGuards';
import { copyDictaLocalStorage,
  downloadDictaLocalStorage } from './app/dictaLocalStorageSnapshot';
import { buildTrainingSubmitMessage } from './core/trainingSubmitMessage';
import {
  createDictaSupabaseClient,
  getDictaSyncConfig,
  } from './core/supabaseSync';
import {
  getDictaSessionQuotaStatus,
  } from './core/appProfiles';
import {
  buildRangeSummaryForLanguage,
  findLastSessionForLanguage,
  resolveSessionLanguage } from './core/liveMetrics';
import {
  buildGeneratedTrainingSessionNotification,
  requestTrainingNotificationPermission,
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
  persistAdaptiveBenchmarks,
  persistAdaptiveSessionFeedback,
  } from './app/adaptiveStorage';
import {
  OLLAMA_RECOMMENDED_DEFAULT_MODEL,
  persistOllamaDefaultModel,
  persistOpenRouterDefaultModel,
  } from './app/modelPreferenceStorage';
import { buildLeaderboardSections,
  sortLeaderboardSessions } from './app/leaderboardSectionsBuilder';
import { BROWSER_TTS_SESSION_INPUT_MODE } from './core/sessionInputModes';
import type { SessionInputMode } from './core/sessionInputModes';
import { formatSessionDate } from './app/sessionDateFormatters';
import { formatSessionStatus } from './app/sessionStatusFormatters';
import { getSessionDisplayTitle } from './app/sessionDisplayTitle';
import { formatLeaderboardSessionStatus } from './app/sessionLeaderboardFormatters';
import { formatDuration,
  formatSessionPlaybackDuration } from './app/sessionPlaybackDuration';
import { buildTrainingSessionSubmissionMeta } from './app/trainingSessionSubmissionMeta';
import { countLocalChangesPendingSync,
  formatSupabaseSyncState } from './app/supabaseSyncPresentation';
import { buildAdminStorageSummary,
  buildCurrentSyncState } from './app/adminStorageSummary';
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
import {
  buildOpenRouterActivityHints,
  } from './app/adaptiveFeedbackContext';
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
  AdaptiveSemanticDebug,
  AdminFileInventory,
  DictaDebugSampleAudit,
  PerformanceTrend,
  SessionSource,
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
  const appRenderCountRef = useRef(0);
  appRenderCountRef.current += 1;
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
  const [sessionCreationMode, setSessionCreationMode] = useState<SessionInputMode | null>(null);
  const [sessionCreationSource, setSessionCreationSource] = useState<SessionSource>('plainText');
  const [sessionCreationName, setSessionCreationName] = useState('');
  const [dictationScriptJson, setDictationScriptJson] = useState('');
  const [dictationScriptValidation, setDictationScriptValidation] = useState<DictationScriptValidationResult | null>(null);
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
  const [perfDiagnosticsEnabled, setPerfDiagnosticsEnabled] = useState(false);
  const [openRouterGenerateFocusRequest, setOpenRouterGenerateFocusRequest] = useState(0);
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

  const [directOpenRouterBusy, setDirectOpenRouterBusy] = useState(false);
  const [directIntermediateOpenRouterBusy, setDirectIntermediateOpenRouterBusy] = useState(false);
  const [directAdvancedOpenRouterBusy, setDirectAdvancedOpenRouterBusy] = useState(false);
  const [expressEasyOpenRouterBusy, setExpressEasyOpenRouterBusy] = useState(false);
  const [expressIntermediateOpenRouterBusy, setExpressIntermediateOpenRouterBusy] = useState(false);
  const [expressAdvancedOpenRouterBusy, setExpressAdvancedOpenRouterBusy] = useState(false);
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
  const [adminFileInventory, setAdminFileInventory] = useState<AdminFileInventory | null>(null);
  const [adminFileInventoryError, setAdminFileInventoryError] = useState('');
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
  const [insightsDiagnosticInputMode, setInsightsDiagnosticInputMode] = useState<InputMode>('browser-tts');
  const [insightsDiagnosticMessage, setInsightsDiagnosticMessage] = useState('');
  const [insightsDiagnosticFallbackReport, setInsightsDiagnosticFallbackReport] = useState('');
  const [adaptiveSemanticDebug, setAdaptiveSemanticDebug] = useState<AdaptiveSemanticDebug>({
    semanticCutPenalty: 0,
    unsafePauseCount: 0,
    safePauseCount: 0,
    deferredPauseCount: 0,
    replayDeniedByBoundaryCount: 0,
    averageSemanticCompleteness: 1,
    averagePhraseDifficulty: 0,
    inputExecutionFidelityScore: 1,
    currentPhraseIndex: 0,
    currentPhraseId: 'n/a',
    currentPhraseTextPreview: '',
    totalSemanticPhrases: 0,
    phraseAdvanceCount: 0,
    phraseReplayCount: 0,
    lastPhraseAdvanceReason: 'idle',
  });
  const [adaptiveBenchmarksByInputLanguage, setAdaptiveBenchmarksByInputLanguage] = useState<AdaptiveBenchmarksByInputLanguage>(() =>
    loadAdaptiveBenchmarks(),
  );
  const adaptiveBenchmarksRef = useRef(adaptiveBenchmarksByInputLanguage);
  const [adaptiveSessionFeedbackByInputLanguage, setAdaptiveSessionFeedbackByInputLanguage] = useState<AdaptiveSessionFeedbackByInputLanguage>(() =>
    loadAdaptiveSessionFeedback(),
  );
  const adaptiveSessionFeedbackRef = useRef<AdaptiveSessionFeedbackByInputLanguage>(adaptiveSessionFeedbackByInputLanguage);
  const [adaptiveBenchmarksFocusAnchor, setAdaptiveBenchmarksFocusAnchor] = useState<AdaptiveWorkspaceFocusAnchor>(null);
  const [benchmarkExportMessage, setBenchmarkExportMessage] = useState('');
  const [sessionFeedbackMessage, setSessionFeedbackMessage] = useState('');
  const syncConfig = useMemo(() => getDictaSyncConfig(import.meta.env), []);
  const supabaseClient = useMemo(() => createDictaSupabaseClient(syncConfig), [syncConfig]);
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

  const latestSession = useMemo<StoredSession | null>(() => {
    if (sessions.length === 0) return null;
    return [...sessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  }, [sessions]);
  const activeTrainingSubmissionMeta = useMemo(
    () => buildTrainingSessionSubmissionMeta(sessions, activeSession),
    [activeSession, sessions],
  );
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
  const pendingSessions = useMemo(
    () =>
      [...sessions]
        .filter((session) => session.status !== 'error' && !isSessionReadyForTraining(session))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [sessions],
  );
  const pendingSyncSummary = useMemo(
    () =>
      countLocalChangesPendingSync({
        sessions,
        benchmarks: adaptiveBenchmarksByInputLanguage,
        feedback: adaptiveSessionFeedbackByInputLanguage,
        lastSyncedAt: supabaseSyncStatus.lastSyncedAt,
      }),
    [sessions, adaptiveBenchmarksByInputLanguage, adaptiveSessionFeedbackByInputLanguage, supabaseSyncStatus.lastSyncedAt],
  );
  const openRouterOfflineTitle = isOnline ? '' : 'Needs internet. Local practice still works offline and results stay on this device.';
  const recentDictationSessionHints = useMemo(() => {
    return sessions
      .filter((session) => session.sessionSource === 'dictationScript' && Boolean(session.dictationScript))
      .slice(0, 5)
      .map((session) => {
        const script = session.dictationScript;
        const opener = script?.phrases?.[0]?.text?.trim() ?? '';
        return {
          title: script?.title?.trim() || session.name.trim(),
          opener,
        };
      });
  }, [sessions]);
  const sessionsWithVoiceDuration = useMemo(
    () => sessions.map((session) => ({ ...session, voiceDurationSec: estimateSessionVoiceDurationSec(session) })),
    [sessions],
  );
  const ttsPlaybackProfile = useMemo(
    () => buildTtsPlaybackProfile(sessions, activeSession),
    [sessions, activeSession],
  );
  const leaderboard = useMemo(
    () =>
      sortLeaderboardSessions(
        sessionsWithVoiceDuration
        .filter((session) => resolveSessionLanguage(session) === leaderboardLanguageView)
      )
        .map((session, index) => ({ rank: index + 1, session })),
    [sessionsWithVoiceDuration, leaderboardLanguageView],
  );
  const leaderboardSections = useMemo(
    () =>
      buildLeaderboardSections(sessionsWithVoiceDuration, leaderboardLanguageView, {
        resolveSessionLanguage,
        getSessionVoiceDurationSec: estimateSessionVoiceDurationSec,
        buildRangeSummaryForLanguage,
        formatDuration,
      }),
    [sessionsWithVoiceDuration, leaderboardLanguageView],
  );
  const adminSessions = useMemo(
    () => {
      const source = adminProfileFilter === 'self' ? sessions : adminRemoteSessions;
      return [...source].filter((session) => resolveSessionLanguage(session) === adminLanguageView);
    },
    [adminProfileFilter, adminRemoteSessions, sessions, adminLanguageView],
  );
  const adminStorageSummary = useMemo(() => buildAdminStorageSummary(adminSessions), [adminSessions]);

  useEffect(() => {
    perfDiagnostics.recordRender('App', appRenderCountRef.current);
  });

  useEffect(() => {
    const enabled = perfDiagnostics.configure({
      envDev: import.meta.env.DEV,
      search: window.location.search,
      storage: window.localStorage,
    });
    setPerfDiagnosticsEnabled(enabled);
    return () => perfDiagnostics.dispose();
  }, []);

  useEffect(() => {
    if (!perfDiagnosticsEnabled && !import.meta.env.DEV) {
      delete window.__DICTA_DEBUG_EXPORT__;
      return;
    }
    window.__DICTA_DEBUG_EXPORT__ = () => {
      const inputMode: InputMode = 'browser-tts';
      const language: LanguageCode = 'de';
      const profile = adaptiveBenchmarksByInputLanguage[inputMode]?.[language] ?? null;
      const latestFeedback = selectLatestAdaptiveSessionFeedback(
        adaptiveSessionFeedbackByInputLanguage[inputMode]?.[language],
        inputMode,
        language,
      );
      const latestSessionId = latestFeedback?.sessionId ?? activeSessionId ?? null;
      const profileTimeline = profile?.timeline ?? [];
      const recentTimelinePoints = latestSessionId
        ? profileTimeline.filter((point) => point.sessionId === latestSessionId).slice(-120)
        : profileTimeline.slice(-120);
      const recentPhraseEvents = latestSessionId
        ? phrasePlaybackEventsRef.current.filter((event) => event.sessionId === latestSessionId).slice(-200)
        : phrasePlaybackEventsRef.current.slice(-200);
      const sampleAudit: DictaDebugSampleAudit[] = recentTimelinePoints.map((point) => {
        const rejectionReason = getBrowserTtsDeBenchmarkRejectionReason(point);
        return {
          acceptedForBenchmark: rejectionReason === null,
          rejectionReason,
          event: point.event,
          phraseId: point.phraseId,
          phraseIndex: point.phraseIndex,
          rawLagSec: point.rawLagSec,
          lagSec: point.lagSec,
          stableLagSec: point.stableLagSec,
          phraseBoundaryType: point.phraseBoundaryType,
          semanticCompleteness: point.semanticCompleteness,
          accuracy: point.accuracy,
          wpm: point.wpm,
          sessionId: point.sessionId,
          timestampMs: point.timestampMs,
        };
      });
      const placeholderStartSamples = sampleAudit.filter(
        (point) => point.wpm === 0 && point.accuracy === 1 && point.lagSec === 0 && point.rawLagSec === 0,
      );
      const benchmarkBefore = latestFeedback?.benchmarkBefore;
      const benchmarkAfter = latestFeedback?.benchmarkAfter;
      const benchmarkChanged =
        benchmarkBefore !== undefined && benchmarkAfter !== undefined
          ? JSON.stringify(benchmarkBefore) !== JSON.stringify(benchmarkAfter)
          : null;
      const output = {
        generatedAt: new Date().toISOString(),
        inputMode,
        language,
        latestSessionId,
        benchmarkProfile: profile,
        latestSessionFeedback: latestFeedback,
        recentAdaptiveTimelinePoints: recentTimelinePoints,
        recentPhrasePlaybackEvents: recentPhraseEvents,
        eventCounts: buildAdaptiveEventCounts(recentTimelinePoints, recentPhraseEvents),
        benchmarkSampleAudit: sampleAudit,
        placeholderStartSamples: {
          present: placeholderStartSamples.length > 0,
          count: placeholderStartSamples.length,
          samples: placeholderStartSamples.slice(0, 20),
        },
        benchmarkBeforeAfter: {
          available: benchmarkBefore !== undefined && benchmarkAfter !== undefined,
          changed: benchmarkChanged,
        },
        perfDiagnostics:
          typeof window.__DICTA_PERF__?.snapshot === 'function'
            ? window.__DICTA_PERF__.snapshot()
            : null,
      };
      console.info('[dicta][debug-export]', output);
      return output;
    };
    return () => {
      delete window.__DICTA_DEBUG_EXPORT__;
    };
  }, [
    activeSessionId,
    adaptiveBenchmarksByInputLanguage,
    adaptiveSessionFeedbackByInputLanguage,
    perfDiagnosticsEnabled,
  ]);

  useEffect(() => {
    if (workspaceMode !== 'openrouter' || openRouterAccessState !== 'denied') return;
    showLeaderboardWorkspace();
    setOpenRouterError(openRouterAccessMessage);
  }, [openRouterAccessState, showLeaderboardWorkspace, workspaceMode]);

  useEffect(() => {
    if (!localStorageReadyForEffectiveProfile) return;
    persistAdaptiveBenchmarks(adaptiveBenchmarksByInputLanguage);
  }, [adaptiveBenchmarksByInputLanguage, localStorageReadyForEffectiveProfile]);

  useEffect(() => {
    adaptiveBenchmarksRef.current = adaptiveBenchmarksByInputLanguage;
  }, [adaptiveBenchmarksByInputLanguage]);

  useEffect(() => {
    adaptiveSessionFeedbackRef.current = adaptiveSessionFeedbackByInputLanguage;
    if (!localStorageReadyForEffectiveProfile) return;
    persistAdaptiveSessionFeedback(adaptiveSessionFeedbackByInputLanguage);
  }, [adaptiveSessionFeedbackByInputLanguage, localStorageReadyForEffectiveProfile]);

  useEffect(() => {
    ensureLatestBrowserTtsDeDictationScriptFeedback(sessions);
  }, [ensureLatestBrowserTtsDeDictationScriptFeedback, sessions]);

  useEffect(() => {
    if (sessions.length === 0) {
      if (activeSessionId) {
        setActiveSessionId('');
      }
      return;
    }

    if (!sessions.some((session) => session.id === activeSessionId)) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  useEffect(() => {
    if (suppressSidebarAutoSelectRef.current) return;
    if (
      activeSession &&
      workspaceMode !== 'leaderboard' &&
      workspaceMode !== 'dashboard' &&
      workspaceMode !== 'adaptive' &&
      workspaceMode !== 'admin' &&
      workspaceMode !== 'openrouter' &&
      workspaceMode !== 'ollama'
    ) {
      showWorkspaceMode(activeInputWorkspaceMode);
    }
  }, [activeInputWorkspaceMode, activeSession, showWorkspaceMode, workspaceMode]);

  useEffect(() => {
    if (workspaceMode !== 'admin') return;
    if (!LOCAL_DEV_FEATURES_AVAILABLE) {
      setAdminFileInventory(null);
      setAdminFileInventoryError('Local file inventory is available only when running the Vite dev server.');
      return;
    }

    let cancelled = false;
    async function loadAdminFiles(): Promise<void> {
      try {
        const response = await fetch('/api/admin/files');
        if (!response.ok) {
          throw new Error(`File inventory unavailable (${response.status})`);
        }
        const payload = (await response.json()) as AdminFileInventory;
        if (!cancelled) {
          setAdminFileInventory(payload);
          setAdminFileInventoryError('');
        }
      } catch (error) {
        if (!cancelled) {
          setAdminFileInventory(null);
          setAdminFileInventoryError(error instanceof Error ? error.message : 'File inventory unavailable');
        }
      }
    }

    void loadAdminFiles();
    return () => {
      cancelled = true;
    };
  }, [workspaceMode]);

  const lastSessionForLanguage = useMemo(
    () => findLastSessionForLanguage(sessionsWithVoiceDuration, metricsLanguageView),
    [sessionsWithVoiceDuration, metricsLanguageView],
  );
  const lastSessionScoreHelpText = useMemo(() => {
    if (!lastSessionForLanguage?.id) return undefined;
    const fullSession = sessions.find((session) => session.id === lastSessionForLanguage.id);
    return fullSession ? buildSessionScoreHelpText(fullSession.metrics) : undefined;
  }, [lastSessionForLanguage?.id, sessions]);
  const languageTodaySummary = useMemo(
    () => buildRangeSummaryForLanguage(sessionsWithVoiceDuration, metricsLanguageView, metricsRangeView),
    [sessionsWithVoiceDuration, metricsLanguageView, metricsRangeView],
  );
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

  function createOpenRouterErrorSession({
    slotLabel,
    inputMode,
    language,
    message,
  }: {
    slotLabel: string;
    inputMode: InputMode;
    language: BenchmarkLanguageButton;
    message: string;
  }, options: { navigateToLeaderboard?: boolean } = {}): void {
    if (!ensureCanCreateDictationSession('openrouter')) return;
    const navigateToLeaderboard = options.navigateToLeaderboard ?? true;
    const sessionInputMode = mapDictationScriptInputModeToSession(inputMode) ?? BROWSER_TTS_SESSION_INPUT_MODE;
    suppressSidebarAutoSelectRef.current = true;
    const nextSession = prependSessionAndPersistNow((prev) =>
      createGeneratedErrorSession({
        index: getNextSessionIndex(prev),
        inputMode: sessionInputMode,
        language,
        name: `${slotLabel} generation error`,
        message,
      }),
    );
    setLeaderboardLanguageView(language);
    if (navigateToLeaderboard) {
      setActiveSessionId(nextSession.id);
      showLeaderboardWorkspace();
    }
    setError('');
    setOpenRouterError(message);
  }

  function createCustomOpenRouterErrorSessionForJob(trackedJob: ActiveOpenRouterJob, message: string): void {
    if (trackedJob.origin !== 'custom-workspace' || !shouldCreatePersistentGenerationErrorSession(message)) return;
    createOpenRouterErrorSession({
      slotLabel: trackedJob.slotLabel,
      inputMode: trackedJob.inputMode,
      language: trackedJob.language as BenchmarkLanguageButton,
      message,
    }, { navigateToLeaderboard: false });
  }

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

  function openOpenRouterGenerateForActiveInput(): void {
    if (!activeSession) return;
    if (!openRouterAccessAllowed) {
      setOpenRouterError(openRouterAccessMessage);
      return;
    }
    if (!ensureCanCreateDictationSession('openrouter')) return;
    if (!isOnline) {
      setOpenRouterError('OpenRouter needs internet. You can keep practicing offline; results are saved on this device and will sync when the connection returns.');
      return;
    }
    const inputMode = mapSessionInputMode(activeSession.inputMode);
    const language: BenchmarkLanguageButton = dictaLanguageView;
    setSelectedBenchmarkInputMode(inputMode);
    setSelectedBenchmarkLanguage(language);
    setBenchmarkExportMessage('');
    setSessionFeedbackMessage('');
    showOpenRouterWorkspace();
    setOpenRouterGenerateFocusRequest((value) => value + 1);
  }

  async function generateDirectSessionFromOpenRouter({
    slotLabel,
    displayLabel,
    durationMinutes,
    isBusy,
    setBusy,
    userIntent,
    targetDifficulty,
    difficultyInstruction,
  }: {
    slotLabel: string;
    displayLabel: string;
    durationMinutes: OpenRouterDurationMinutes;
    isBusy: boolean;
    setBusy: (value: boolean) => void;
    userIntent?: ListeningTrainingIntent;
    targetDifficulty?: DictationScriptDifficulty;
    difficultyInstruction?: string;
  }): Promise<void> {
    if (!activeSession || isBusy) return;
    if (!openRouterAccessAllowed) {
      setOpenRouterError(openRouterAccessMessage);
      return;
    }
    if (!ensureCanCreateDictationSession('openrouter')) return;
    if (!isOnline) {
      setOpenRouterError('OpenRouter needs internet. You can keep practicing offline; results are saved on this device and will sync when the connection returns.');
      return;
    }
    const model = effectiveOpenRouterDefaultModel.trim();
    const inputMode = mapSessionInputMode(activeSession.inputMode);
    const language: BenchmarkLanguageButton = dictaLanguageView;

    if (!model) {
      setOpenRouterError('Set a default OpenRouter model before generating the next session.');
      return;
    }

    void requestTrainingNotificationPermission();

    const endPerfSpan = perfDiagnostics.startSpan('openrouter.generateDirectSession', { userIntent, targetDifficulty, durationMinutes });
    const generationStartedAt = new Date().toISOString();
    setBusy(true);
    setOpenRouterError('');
    setSelectedBenchmarkInputMode(inputMode);
    setSelectedBenchmarkLanguage(language);
    const targetMaxTokens = getOpenRouterGenerationMaxTokens(durationMinutes);
    try {
      const profile = adaptiveBenchmarksByInputLanguage[inputMode]?.[language] ?? createEmptyInputLanguageBenchmark(inputMode, language);
      const sessionFeedback = selectLatestAdaptiveSessionFeedback(
        adaptiveSessionFeedbackByInputLanguage[inputMode]?.[language],
        inputMode,
        language,
      );
      const directPromptArgs = {
        profile,
        sessionFeedback,
        promptSource: 'compact-adaptive-v2' as const,
        durationMinutes,
        userIntent,
        targetDifficulty,
        difficultyInstruction,
        diversificationHints: buildOpenRouterDiversificationHints({
          durationMinutes,
          targetDifficulty,
          recentSessions: recentDictationSessionHints,
          activityHints: buildOpenRouterActivityHints({
            sessions,
            inputMode,
            language,
            benchmarkSessionCount: profile.sessionCount,
          }),
        }),
      };
      const { prompt, trainingPrescription } = buildOpenRouterGenerationPrompt(directPromptArgs);
      const resolvedTargetDifficulty = trainingPrescription.difficulty;
      const promptSize = estimateOpenRouterPromptSize(prompt, {
        promptMode: 'compact-adaptive-v2',
        durationMinutes,
        targetDifficulty: resolvedTargetDifficulty,
        inputMode,
        language,
      });
      const response = await fetch('/api/openrouter/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          model,
          prompt,
          maxTokens: targetMaxTokens,
          slotLabel,
          inputMode,
          language,
          durationMinutes,
          targetDifficulty: resolvedTargetDifficulty,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Generation request failed (${response.status}).`);
      }
      const payload = (await response.json()) as OpenRouterJobResponse;
      const jobId = payload.jobId;
      if (!jobId) throw new Error('OpenRouter job did not return an id.');
      const activeJob: ActiveOpenRouterJob = {
        jobId,
        model,
        slotLabel,
        inputMode,
        language,
        durationMinutes,
        targetDifficulty: resolvedTargetDifficulty,
        promptMode: promptSize.promptMode,
        promptCharacterCount: promptSize.characterCount,
        promptApproximateTokenCount: promptSize.approximateTokenCount,
        origin: 'direct-training',
        startedAt: generationStartedAt,
      };
      trackOpenRouterJob(activeJob);
    } catch (err) {
      const message =
        err instanceof TypeError
          ? 'Failed to reach OpenRouter endpoint. Refresh the page and try a free model such as openrouter/free.'
          : err instanceof Error
            ? err.message
            : 'OpenRouter generation failed.';
      recordOpenRouterGenerationFailure({
        slotLabel,
        displayLabel,
        model,
        startedAt: generationStartedAt,
        error: message,
      });
      if (isTransientOpenRouterGenerationError(message)) {
        const nowMs = Date.now();
        setOpenRouterError(
          formatInterruptedOpenRouterMessage(slotLabel, model, Math.max(0, nowMs - parseTimestampMs(generationStartedAt, nowMs))),
        );
      } else if (shouldCreatePersistentGenerationErrorSession(message)) {
        createOpenRouterErrorSession({
          slotLabel,
          inputMode,
          language,
          message,
        }, { navigateToLeaderboard: false });
      } else {
        setOpenRouterError(message);
      }
    } finally {
      setBusy(false);
      endPerfSpan();
    }
  }

  async function generateEasyNextSessionFromOpenRouter(): Promise<void> {
    await generateDirectSessionFromOpenRouter({
      slotLabel: 'Easy direct session',
      displayLabel: 'Easy session',
      durationMinutes: 2,
      isBusy: directOpenRouterBusy,
      setBusy: setDirectOpenRouterBusy,
      userIntent: 'recover',
      targetDifficulty: 'easy',
      difficultyInstruction: 'Recovery intent: keep material accessible and obey the trainer prescription if it narrows the range.',
    });
  }

  async function generateIntermediateNextSessionFromOpenRouter(): Promise<void> {
    await generateDirectSessionFromOpenRouter({
      slotLabel: 'Intermediate direct session',
      displayLabel: 'Medium session',
      durationMinutes: 2,
      isBusy: directIntermediateOpenRouterBusy,
      setBusy: setDirectIntermediateOpenRouterBusy,
      userIntent: 'progress',
      targetDifficulty: 'normal',
      difficultyInstruction: 'Progress intent: use moderate phrase difficulty only when the trainer prescription allows it.',
    });
  }

  async function generateAdvancedNextSessionFromOpenRouter(): Promise<void> {
    await generateDirectSessionFromOpenRouter({
      slotLabel: 'Advanced direct session',
      displayLabel: 'Hard session',
      durationMinutes: 2,
      isBusy: directAdvancedOpenRouterBusy,
      setBusy: setDirectAdvancedOpenRouterBusy,
      userIntent: 'challenge',
      targetDifficulty: 'hard',
      difficultyInstruction: 'Challenge intent: use harder content only if the trainer prescription keeps the session in challenge mode.',
    });
  }

  async function generateExpressEasyNextSessionFromOpenRouter(): Promise<void> {
    await generateDirectSessionFromOpenRouter({
      slotLabel: 'Express easy direct session',
      displayLabel: 'Express easy session',
      durationMinutes: 1,
      isBusy: expressEasyOpenRouterBusy,
      setBusy: setExpressEasyOpenRouterBusy,
      userIntent: 'recover',
      targetDifficulty: 'easy',
      difficultyInstruction: 'Express recovery intent: keep material accessible and obey the trainer prescription if it narrows the range.',
    });
  }

  async function generateExpressIntermediateNextSessionFromOpenRouter(): Promise<void> {
    await generateDirectSessionFromOpenRouter({
      slotLabel: 'Express intermediate direct session',
      displayLabel: 'Express medium session',
      durationMinutes: 1,
      isBusy: expressIntermediateOpenRouterBusy,
      setBusy: setExpressIntermediateOpenRouterBusy,
      userIntent: 'progress',
      targetDifficulty: 'normal',
      difficultyInstruction: 'Express progress intent: use moderate phrase difficulty only when the trainer prescription allows it.',
    });
  }

  async function generateExpressAdvancedNextSessionFromOpenRouter(): Promise<void> {
    await generateDirectSessionFromOpenRouter({
      slotLabel: 'Express advanced direct session',
      displayLabel: 'Express hard session',
      durationMinutes: 1,
      isBusy: expressAdvancedOpenRouterBusy,
      setBusy: setExpressAdvancedOpenRouterBusy,
      userIntent: 'challenge',
      targetDifficulty: 'hard',
      difficultyInstruction: 'Express challenge intent: use harder content only if the trainer prescription keeps the session in challenge mode.',
    });
  }

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
  const easyGenerationNotice = buildTrainingGenerationButtonNotice({
    slotLabel: 'Easy direct session',
    displayLabel: 'Easy session',
    notices: trainingGenerationNotices,
    jobNotifications: openRouterJobNotifications,
    activeJobs: activeOpenRouterJobs,
    nowMs: trainingGenerationNowMs,
  });
  const mediumGenerationNotice = buildTrainingGenerationButtonNotice({
    slotLabel: 'Intermediate direct session',
    displayLabel: 'Medium session',
    notices: trainingGenerationNotices,
    jobNotifications: openRouterJobNotifications,
    activeJobs: activeOpenRouterJobs,
    nowMs: trainingGenerationNowMs,
  });
  const hardGenerationNotice = buildTrainingGenerationButtonNotice({
    slotLabel: 'Advanced direct session',
    displayLabel: 'Hard session',
    notices: trainingGenerationNotices,
    jobNotifications: openRouterJobNotifications,
    activeJobs: activeOpenRouterJobs,
    nowMs: trainingGenerationNowMs,
  });
  const expressEasyGenerationNotice = buildTrainingGenerationButtonNotice({
    slotLabel: 'Express easy direct session',
    displayLabel: 'Express easy session',
    notices: trainingGenerationNotices,
    jobNotifications: openRouterJobNotifications,
    activeJobs: activeOpenRouterJobs,
    nowMs: trainingGenerationNowMs,
  });
  const expressMediumGenerationNotice = buildTrainingGenerationButtonNotice({
    slotLabel: 'Express intermediate direct session',
    displayLabel: 'Express medium session',
    notices: trainingGenerationNotices,
    jobNotifications: openRouterJobNotifications,
    activeJobs: activeOpenRouterJobs,
    nowMs: trainingGenerationNowMs,
  });
  const expressHardGenerationNotice = buildTrainingGenerationButtonNotice({
    slotLabel: 'Express advanced direct session',
    displayLabel: 'Express hard session',
    notices: trainingGenerationNotices,
    jobNotifications: openRouterJobNotifications,
    activeJobs: activeOpenRouterJobs,
    nowMs: trainingGenerationNowMs,
  });
  const easyDirectGenerationRunning = activeOpenRouterJobs.some((job) => job.slotLabel === 'Easy direct session');
  const mediumDirectGenerationRunning = activeOpenRouterJobs.some((job) => job.slotLabel === 'Intermediate direct session');
  const hardDirectGenerationRunning = activeOpenRouterJobs.some((job) => job.slotLabel === 'Advanced direct session');
  const expressEasyGenerationRunning = activeOpenRouterJobs.some((job) => job.slotLabel === 'Express easy direct session');
  const expressMediumGenerationRunning = activeOpenRouterJobs.some((job) => job.slotLabel === 'Express intermediate direct session');
  const expressHardGenerationRunning = activeOpenRouterJobs.some((job) => job.slotLabel === 'Express advanced direct session');

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
    generationButtons: openRouterAccessAllowed ? [
      {
        id: 'easy',
        label: directOpenRouterBusy ? 'Requesting easy...' : easyDirectGenerationRunning ? 'Generating easy...' : 'New Easy Session',
        onClick: () => void generateEasyNextSessionFromOpenRouter(),
        disabled: !isOnline || directOpenRouterBusy || easyDirectGenerationRunning || !activeSession || !effectiveOpenRouterDefaultModel.trim() || sessionQuotaStatus.blocked,
        title: sessionQuotaStatus.blocked
          ? sessionQuotaStatus.message
          : openRouterOfflineTitle || (effectiveOpenRouterDefaultModel.trim() ? 'Generate an easy two-minute session with OpenRouter.' : 'Set a default OpenRouter model first.'),
        helpText: 'About 2 minutes. Easy level with simpler vocabulary, shorter clauses, and roughly 300 spoken words.',
        statusMessage: easyGenerationNotice?.message,
        statusTone: easyGenerationNotice?.tone,
      },
      {
        id: 'express-easy',
        label: expressEasyOpenRouterBusy ? 'Requesting express easy...' : expressEasyGenerationRunning ? 'Generating express easy...' : 'Express Easy Session',
        onClick: () => void generateExpressEasyNextSessionFromOpenRouter(),
        disabled: !isOnline || expressEasyOpenRouterBusy || expressEasyGenerationRunning || !activeSession || !effectiveOpenRouterDefaultModel.trim() || sessionQuotaStatus.blocked,
        title: sessionQuotaStatus.blocked
          ? sessionQuotaStatus.message
          : openRouterOfflineTitle || (effectiveOpenRouterDefaultModel.trim() ? 'Generate an easy one-minute express session with OpenRouter.' : 'Set a default OpenRouter model first.'),
        helpText: 'About 1 minute. Easy level, simpler vocabulary, and roughly half the spoken words of the standard easy session.',
        statusMessage: expressEasyGenerationNotice?.message,
        statusTone: expressEasyGenerationNotice?.tone,
      },
      {
        id: 'medium',
        label: directIntermediateOpenRouterBusy ? 'Requesting medium...' : mediumDirectGenerationRunning ? 'Generating medium...' : 'New Medium Session',
        onClick: () => void generateIntermediateNextSessionFromOpenRouter(),
        disabled: !isOnline || directIntermediateOpenRouterBusy || mediumDirectGenerationRunning || !activeSession || !effectiveOpenRouterDefaultModel.trim() || sessionQuotaStatus.blocked,
        title: sessionQuotaStatus.blocked
          ? sessionQuotaStatus.message
          : openRouterOfflineTitle || (effectiveOpenRouterDefaultModel.trim() ? 'Generate a medium two-minute session with OpenRouter.' : 'Set a default OpenRouter model first.'),
        helpText: 'About 2 minutes. Medium level with balanced vocabulary, natural phrasing, and roughly 300 spoken words.',
        statusMessage: mediumGenerationNotice?.message,
        statusTone: mediumGenerationNotice?.tone,
      },
      {
        id: 'express-medium',
        label: expressIntermediateOpenRouterBusy ? 'Requesting express medium...' : expressMediumGenerationRunning ? 'Generating express medium...' : 'Express Medium Session',
        onClick: () => void generateExpressIntermediateNextSessionFromOpenRouter(),
        disabled: !isOnline || expressIntermediateOpenRouterBusy || expressMediumGenerationRunning || !activeSession || !effectiveOpenRouterDefaultModel.trim() || sessionQuotaStatus.blocked,
        title: sessionQuotaStatus.blocked
          ? sessionQuotaStatus.message
          : openRouterOfflineTitle || (effectiveOpenRouterDefaultModel.trim() ? 'Generate a medium one-minute express session with OpenRouter.' : 'Set a default OpenRouter model first.'),
        helpText: 'About 1 minute. Medium level, balanced phrasing, and roughly half the spoken words of the standard medium session.',
        statusMessage: expressMediumGenerationNotice?.message,
        statusTone: expressMediumGenerationNotice?.tone,
      },
      {
        id: 'hard',
        label: directAdvancedOpenRouterBusy ? 'Requesting hard...' : hardDirectGenerationRunning ? 'Generating hard...' : 'New Hard Session',
        onClick: () => void generateAdvancedNextSessionFromOpenRouter(),
        disabled: !isOnline || directAdvancedOpenRouterBusy || hardDirectGenerationRunning || !activeSession || !effectiveOpenRouterDefaultModel.trim() || sessionQuotaStatus.blocked,
        title: sessionQuotaStatus.blocked
          ? sessionQuotaStatus.message
          : openRouterOfflineTitle || (effectiveOpenRouterDefaultModel.trim() ? 'Generate a hard two-minute session with OpenRouter.' : 'Set a default OpenRouter model first.'),
        helpText: 'About 2 minutes. Hard level with denser vocabulary, more complex grammar, and roughly 300 spoken words.',
        statusMessage: hardGenerationNotice?.message,
        statusTone: hardGenerationNotice?.tone,
      },
      {
        id: 'express-hard',
        label: expressAdvancedOpenRouterBusy ? 'Requesting express hard...' : expressHardGenerationRunning ? 'Generating express hard...' : 'Express Hard Session',
        onClick: () => void generateExpressAdvancedNextSessionFromOpenRouter(),
        disabled: !isOnline || expressAdvancedOpenRouterBusy || expressHardGenerationRunning || !activeSession || !effectiveOpenRouterDefaultModel.trim() || sessionQuotaStatus.blocked,
        title: sessionQuotaStatus.blocked
          ? sessionQuotaStatus.message
          : openRouterOfflineTitle || (effectiveOpenRouterDefaultModel.trim() ? 'Generate a hard one-minute express session with OpenRouter.' : 'Set a default OpenRouter model first.'),
        helpText: 'About 1 minute. Hard level, denser vocabulary, and roughly half the spoken words of the standard hard session.',
        statusMessage: expressHardGenerationNotice?.message,
        statusTone: expressHardGenerationNotice?.tone,
      },
      {
        id: 'custom',
        label: 'New Custom Session',
        onClick: openOpenRouterGenerateForActiveInput,
        disabled: !isOnline || !activeSession || sessionQuotaStatus.blocked,
        title: sessionQuotaStatus.blocked ? sessionQuotaStatus.message : openRouterOfflineTitle || 'Open the existing OpenRouter custom generation workspace.',
      },
    ] : [],
  };

  void openAdaptiveExportsForActiveInput;

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
              <OpenRouterWorkspace
                defaultModel={effectiveOpenRouterDefaultModel}
                assignedModel={assignedOpenRouterModel || null}
                authHeaders={getAuthHeaders()}
                onSetDefaultModel={(value) => {
                  setOpenRouterDefaultModel(value);
                  persistOpenRouterDefaultModel(value);
                }}
                models={openRouterModels}
                status={openRouterStatus}
                error={openRouterError}
                onRefreshModels={refreshOpenRouterModels}
                onBackToTraining={showLeaderboardWorkspace}
                exportProfile={selectedBenchmarkProfile}
                exportSessionFeedback={selectedSessionFeedback}
                exportActiveSessionStatus={getBenchmarkActiveSessionStatus(selectedBenchmarkProfile)}
                benchmarks={adaptiveBenchmarksByInputLanguage}
                sessionFeedbackByInputLanguage={adaptiveSessionFeedbackByInputLanguage}
                onSelectExportProfile={(inputMode, language) => {
                  setSelectedBenchmarkInputMode(inputMode);
                  setSelectedBenchmarkLanguage(language);
                  setBenchmarkExportMessage('');
                  setSessionFeedbackMessage('');
                }}
                defaultGenerateInputMode={selectedBenchmarkInputMode}
                defaultGenerateLanguage={selectedBenchmarkLanguage}
                focusGenerateRequest={openRouterGenerateFocusRequest}
                activeJobs={activeOpenRouterJobs}
                jobNotifications={openRouterJobNotifications}
                generationNowMs={trainingGenerationNowMs}
                onTrackJob={trackOpenRouterJob}
                onCreateGenerationErrorSession={createOpenRouterErrorSession}
                onCopyBenchmark={(profile) => void copySelectedBenchmarkJson(profile)}
                onExportBenchmark={(profile) => downloadSelectedBenchmarkJson(profile)}
                onCopyBenchmarkWithScriptPrompt={(profile) => void copyBenchmarkWithDictationScriptPrompt(profile)}
                onCopyBenchmarkFeedbackPrompt={(profile, feedback) => void copyBenchmarkFeedbackPrompt(profile, feedback)}
                onCopyBenchmarkFeedback={(profile, feedback) => void copyBenchmarkFeedbackJson(profile, feedback)}
                onCopySessionFeedback={(profile, feedback) => void copySessionFeedbackJson(profile, feedback)}
                onCopyScriptPrompt={(profile) => void copyDictationScriptPrompt(profile)}
                onCopyScriptTemplate={(profile) => void copyDictationScriptTemplate(profile)}
                onCopyBenchmarkFeedbackPromptWithHumanFeedback={(profile, feedback, humanFeedback) =>
                  void copyBenchmarkFeedbackPromptWithHumanFeedback(profile, feedback, humanFeedback)
                }
              />
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
