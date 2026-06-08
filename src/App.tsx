import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import type { Session as SupabaseAuthSession } from '@supabase/supabase-js';
import './App.css';
import type {
  BrowserTtsEnvironmentFingerprint,
  ControlAction,
  SessionTelemetry,
  Transcript,
  TtsChunkTelemetry,
  TtsPacingMode,
} from './types/dictation';
import type {
  AdaptiveTimelinePoint,
  AdaptiveSessionFeedback,
  InputLanguageBenchmarkMetrics,
  InputMode,
  LanguageCode,
  ListeningTrainingIntent,
  LiveTelemetryFrame,
  PhrasePlaybackEvent,
  PhraseBoundaryType,
  PhraseSize,
  PacingMode,
} from './core/adaptive/types';
import { COSYVOICE_CACHE_INPUT_MODE, LEGACY_QWEN_CLOUD_INPUT_MODE } from './core/adaptive/inputModes';
import { configForDifficulty, type Difficulty } from './core/config';
import {
  evaluateTranscriptAttempt,
  buildSessionPointsHelpText,
  computeSessionMaxPoints,
  formatSessionPointsForSession,
  formatSessionPointsLabel,
} from './core/evaluation';
import { buildSessionScoreHelpText, computeSessionScore } from './core/sessionScore';
import { normalizeWord } from './core/normalization';
import { planSemanticPhrases, type SemanticPhrase } from './core/adaptive/SemanticPhrasePlanner';
import {
  clampBrowserTtsDeDecisionToRecommendation,
  createEmptyInputLanguageBenchmark,
  getBrowserTtsDeBenchmarkRejectionReason,
  normalizeBenchmarkLanguage,
} from './core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildBenchmarkFilename, buildSelectedBenchmarkExportPayload } from './core/adaptive/benchmarkJson';
import { buildDictationScriptPrompt, buildDictationScriptTemplate } from './core/adaptive/dictationScriptPrompt';
import {
  buildOpenRouterGenerationPrompt,
  estimateOpenRouterPromptSize,
  getOpenRouterGenerationMaxTokens,
  type OpenRouterDurationMinutes,
} from './core/adaptive/openRouterGenerationPrompt';
import { buildAdaptiveUserSystemReport } from './core/adaptive/adaptiveUserSystemReport';
import {
  type ActiveOpenRouterJob,
  type OpenRouterJobResponse,
} from './core/openRouterJobs';
import {
  isTransientGenerationErrorSessionLike,
  isTransientOpenRouterGenerationError,
} from './core/adaptive/openRouterFallbackScript';
import {
  parseDictationScriptJson,
  validateDictationScript,
  type DictationScript,
  type DictationScriptDifficulty,
  type DictationScriptValidationResult,
} from './core/adaptive/dictationScriptValidation';
import {
  buildBenchmarkFeedbackPackage,
  buildBenchmarkFeedbackPromptPackage,
  buildSessionFeedbackJsonPayload,
  derivePlaybackDiagnosticsFromTimeline,
  selectLatestAdaptiveSessionFeedback,
  type SessionFeedbackReference,
} from './core/adaptive/sessionFeedback';
import { buildBrowserTtsTelemetryFrame, buildAdaptiveBrowserTtsInput } from './inputs/browserTts/browserTtsTelemetryAdapter';
import { planBrowserTtsAdaptiveChunk } from './inputs/browserTts/ttsDynamicChunkPlanner';
import { applyBrowserTtsMobilePacingFallback, applyBrowserTtsRuntimeRateFloor, buildBrowserTtsControlLagSample } from './inputs/browserTts/browserTtsRatePolicy';
import { applyBrowserTtsUnsafeBoundaryPolicy } from './inputs/browserTts/browserTtsUnsafePolicy';
import { applyBrowserTtsDeRecoveryPolicy, summarizeBrowserTtsDeRecoveryState } from './inputs/browserTts/browserTtsRecoveryPolicy';
import { resolveBrowserTtsAdaptiveProfile } from './inputs/browserTts/browserTtsAdaptiveProfiles';
import {
  chooseDiverseBrowserTtsVoiceURIForSession,
  chooseRandomBrowserTtsVoiceURIForSession,
  resolveBrowserTtsSessionVoice,
} from './inputs/browserTts/browserTtsVoices';
import {
  collectBrowserTtsEnvironmentFingerprint,
  normalizeBrowserTtsEnvironmentFingerprint,
} from './inputs/browserTts/browserTtsEnvironment';
import { buildKokoroTelemetryFrame, buildAdaptiveKokoroInput } from './inputs/kokoro/kokoroTelemetryAdapter';
import { buildQwenCloudTelemetryFrame, buildAdaptiveQwenCloudInput } from './inputs/qwenCloud/qwenCloudTelemetryAdapter';
import { QwenCloudAudioAdapter, buildQwenCloudPhraseId } from './inputs/qwenCloud/qwenCloudAudioAdapter';
import { buildQwenCloudCacheManifestFromSemanticPhrases, qwenCloudCacheManifestJson } from './inputs/qwenCloud/qwenCloudCacheManifest';
import { trackAction, trackSample } from './core/telemetry';
import { KokoroAudioEngine } from './core/kokoroAudioEngine';
import { generateKokoroChunk, type KokoroChunkResponse } from './core/kokoroClient';
import {
  bootstrapCosyVoiceCacheSidecar,
  fetchCosyVoiceCacheHealth,
  generateCosyVoiceCache,
  startCosyVoiceCacheSidecar,
} from './core/cosyvoiceCacheClient';
import { buildKokoroSourceWords, type KokoroPhraseChunk } from './core/kokoroPhraseChunking';
import { getKokoroLanguageWarning, isKokoroLanguageBlocked } from './core/kokoroSupport';
import { cloneTelemetry, isSubmittedFinishedAttempt, normalizeSessionForPersistence } from './core/sessionNormalization';
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  formatSupportedLanguage,
  getDefaultSpeechSynthesisLang,
  isSupportedLanguage,
  type SupportedLanguage,
} from './core/languages';
import { PerfDiagnosticsOverlay } from './components/PerfDiagnosticsOverlay';
import { TrainingView, type TrainingViewProps } from './components/TrainingView';
import { AppShellHeader } from './components/app-shell/AppShellHeader';
import { AuthWorkspace } from './components/auth/AuthWorkspace';
import { PendingSessionLane } from './components/training/PendingSessionLane';
import { TrainingHeader } from './components/training/TrainingHeader';
import { OpenRouterWorkspace } from './components/openrouter/OpenRouterWorkspace';
import { OllamaWorkspace } from './components/ollama/OllamaWorkspace';
import { LeaderboardWorkspace } from './components/leaderboard/LeaderboardWorkspace';
import { SessionCreateCard } from './components/runtime-workspaces/SessionCreateCard';
import { BrowserTtsSetupCard } from './components/runtime-workspaces/BrowserTtsSetupCard';
import { Input4SetupCard } from './components/runtime-workspaces/Input4SetupCard';
import { KokoroSetupCard } from './components/runtime-workspaces/KokoroSetupCard';
import { LiveMetricsDock } from './components/runtime-workspaces/LiveMetricsDock';
import { SessionDashboard } from './components/session-dashboard/SessionDashboard';
import type {
  AdaptiveAdapterCardConfig,
  AdaptiveWorkspaceFocusAnchor,
  RepeatWordStat,
} from './components/adaptive-workspace/types';
import { AdaptiveBenchmarkSection } from './components/adaptive-workspace/AdaptiveBenchmarkWorkspace';
import { AdaptiveAdvancedDiagnostics } from './components/adaptive-workspace/AdaptiveAdvancedDiagnostics';
import { AdminHeader } from './components/admin/AdminHeader';
import { AdminKpiGrid } from './components/admin/AdminKpiGrid';
import { AdminUsersCard } from './components/admin/AdminUsersCard';
import { AdminMemberAccessCard } from './components/admin/AdminMemberAccessCard';
import { AdminCreateUserCard } from './components/admin/AdminCreateUserCard';
import { AdminBrowserStorageCard } from './components/admin/AdminBrowserStorageCard';
import { AdminProjectFilesCard } from './components/admin/AdminProjectFilesCard';
import { AdminSessionInventoryCard } from './components/admin/AdminSessionInventoryCard';
import {
  buildOpenRouterModelOptions,
  buildTrainingGenerationButtonNotice,
  formatInterruptedOpenRouterMessage,
  parseTimestampMs,
  shouldCreatePersistentGenerationErrorSession,
} from './components/openrouter/openRouterViewHelpers';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
  BenchmarkLanguageButton,
  OpenRouterModelSummary,
} from './components/openrouter/types';
import type { OllamaModelSummary } from './components/ollama/types';
import { perfDiagnostics } from './core/perfDiagnostics';
import {
  normalizeLiveSessionStatusForPersistence,
  normalizeRestoredSessionStatus,
} from './core/sessionStatusNormalization';
import { estimateSessionVoiceDurationSec } from './core/sessionDuration';
import { sessionSnapshotJson } from './core/sessionSnapshot';
import { buildTrainingSubmitMessage } from './core/trainingSubmitMessage';
import {
  DICTA_SYNC_TABLE,
  createDictaSupabaseClient,
  getDictaSyncConfig,
  type DictaSyncState,
} from './core/supabaseSync';
import {
  getDictaSessionQuotaStatus,
  isDictaAdmin,
  loadDictaAppProfile,
  loadVisibleDictaAppProfiles,
  normalizeDictaAppProfile,
  resolveOpenRouterAccessState,
  resolveEffectiveSyncProfileId,
  type DictaAppProfile,
  type DictaAppRole,
} from './core/appProfiles';
import {
  detectCreatedDeviceMetadata,
  formatCreatedDeviceIcon,
  formatCreatedDeviceTooltip,
  normalizeCreatedDeviceKind,
  type CreatedDeviceKind,
} from './core/sessionDevice';
import {
  buildRangeSummaryForLanguage,
  findLastSessionForLanguage,
  resolveSessionLanguage,
  type MetricsLanguageView,
  type MetricsRangeView,
} from './core/liveMetrics';
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
import { useTrainingSessionLifecycle } from './app/useTrainingSessionLifecycle';
import { useBrowserTtsRuntime } from './app/useBrowserTtsRuntime';
import { useKokoroRuntime } from './app/useKokoroRuntime';
import {
  ADAPTIVE_BENCHMARKS_KEY,
  ADAPTIVE_SESSION_FEEDBACK_KEY,
  SESSION_STORAGE_KEY,
  loadDeletedSessionIds,
  useSessionPersistenceSync,
  type SupabaseSyncStatus,
} from './app/useSessionPersistenceSync';
import { useAdaptiveRuntime } from './app/useAdaptiveRuntime';

declare const __DICTA_BUILD_INFO__: DictaBuildInfo;

const OPENROUTER_DEFAULT_MODEL_STORAGE_KEY = 'dicta.openrouterDefaultModel.v1';
const OLLAMA_DEFAULT_MODEL_STORAGE_KEY = 'dicta.ollamaDefaultModel.v1';
const OLLAMA_RECOMMENDED_DEFAULT_MODEL = 'gemma3:27b-cloud';
const THEME_MODE_KEY = 'dicta.themeMode.v1';
const LIVE_METRICS_LANGUAGE_KEY = 'dicta.liveMetricsLanguage.v1';
const LIVE_METRICS_RANGE_KEY = 'dicta.liveMetricsRange.v1';
const INSIGHTS_COLLAPSED_KEY = 'dicta.insightsCollapsed.v1';
const LEADERBOARD_LANGUAGE_KEY = 'dicta.leaderboardLanguage.v1';
const ADMIN_LANGUAGE_KEY = 'dicta.adminLanguage.v1';
const TTS_BASE_WORDS_PER_SECOND = 2.6;
const LOCAL_DEV_FEATURES_AVAILABLE = import.meta.env.DEV;
const DICTA_BUILD_INFO = __DICTA_BUILD_INFO__;
const DICTA_BUILD_INFO_LABEL = buildBuildInfoLabel(DICTA_BUILD_INFO);
const DICTA_BUILD_INFO_TITLE = buildBuildInfoTitle(DICTA_BUILD_INFO);

type StoredSession = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  inputMode: SessionInputMode;
  inputSettingsLocked: boolean;
  ttsText: string;
  ttsLanguage: TtsLanguage | null;
  ttsVoiceURI?: string | null;
  ttsEnvironment?: BrowserTtsEnvironmentFingerprint | null;
  ttsPracticeText: string;
  kokoroText: string;
  kokoroLanguage: TtsLanguage | null;
  kokoroVoice: string;
  kokoroPracticeText: string;
  kokoroChunks: KokoroGeneratedChunk[];
  difficulty: Difficulty;
  status: SessionStatus;
  metrics: SessionMetrics;
  telemetry: SessionTelemetry;
  sessionSource: SessionSource;
  generationOrigin: GenerationOrigin;
  createdDeviceKind: CreatedDeviceKind;
  createdDeviceLabel?: string;
  dictationScript: DictationScript | null;
  generationError?: string;
};

type SessionStatus = 'ready' | 'running' | 'paused' | 'finished' | 'error';
type SessionInputMode = 'input2' | 'input3' | 'input4';
type SessionSource = 'plainText' | 'dictationScript';
type AuthView = 'signIn' | 'forgotPassword' | 'updatePassword';
type GenerationOrigin = 'manual' | 'openrouter' | 'fallback-template';
type TrainingSessionSubmissionMeta = {
  positionLabel: string;
  scoreLabel: string;
  scoreHelpText: string;
  accuracyLabel: string;
  pointsLabel: string;
  pointsHelpText: string;
  durationLabel: string;
  submittedAtLabel: string;
};
type TtsLanguage = SupportedLanguage;
type TypingLanguage = SupportedLanguage;
type KeyboardProfile = 'es-virtual' | 'de-keyboard' | null;
type ThemeMode = 'light' | 'dark';
type TtsStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'finished';
type PerformanceTrend = 'improving' | 'stable' | 'declining';
type LeaderboardSessionLength = 'express' | 'standard';
type LeaderboardSectionId =
  | 'easy-express'
  | 'medium-express'
  | 'hard-express'
  | 'easy-standard'
  | 'medium-standard'
  | 'hard-standard';
type LeaderboardRangeMetric = {
  range: MetricsRangeView;
  label: string;
  sessionCount: number;
  durationLabel: string;
  avgPointsLabel: string;
  avgScoreLabel: string;
  avgAccuracyLabel: string;
  avgWpmLabel: string;
};
type LeaderboardSection = {
  id: LeaderboardSectionId;
  label: string;
  difficulty: Difficulty;
  length: LeaderboardSessionLength;
  sessions: Array<{ rank: number; session: StoredSession }>;
  rangeMetrics: LeaderboardRangeMetric[];
};

const LEADERBOARD_SECTION_DEFINITIONS: Array<{
  id: LeaderboardSectionId;
  label: string;
  difficulty: Difficulty;
  length: LeaderboardSessionLength;
}> = [
  { id: 'easy-express', label: 'Easy Express', difficulty: 'easy', length: 'express' },
  { id: 'medium-express', label: 'Medium Express', difficulty: 'normal', length: 'express' },
  { id: 'hard-express', label: 'Hard Express', difficulty: 'hard', length: 'express' },
  { id: 'easy-standard', label: 'Easy Standard', difficulty: 'easy', length: 'standard' },
  { id: 'medium-standard', label: 'Medium Standard', difficulty: 'normal', length: 'standard' },
  { id: 'hard-standard', label: 'Hard Standard', difficulty: 'hard', length: 'standard' },
];

const LEADERBOARD_RANGE_DEFINITIONS: Array<{ range: MetricsRangeView; label: string }> = [
  { range: 'today', label: 'Today' },
  { range: 'week', label: 'Week' },
  { range: 'twoWeeks', label: '2 Weeks' },
  { range: 'threeWeeks', label: '3 Weeks' },
  { range: 'month', label: 'Month' },
];

function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 640px)').matches;
}

type KokoroGeneratedChunk = KokoroPhraseChunk &
  KokoroChunkResponse & {
    pacingMode: TtsPacingMode;
    rate: number;
  };

type SessionMetrics = {
  controllerState: ControlAction;
  rate: number;
  lagSec: number;
  lagWords: number;
  wpm: number;
  accuracy: number;
  trend: PerformanceTrend;
  score: number;
  points: number;
};

type DictaDebugSampleAudit = {
  acceptedForBenchmark: boolean;
  rejectionReason: string | null;
  event: AdaptiveTimelinePoint['event'];
  phraseId?: string;
  phraseIndex?: number;
  rawLagSec?: number;
  lagSec: number;
  stableLagSec?: number;
  phraseBoundaryType?: PhraseBoundaryType;
  semanticCompleteness?: number;
  accuracy: number;
  wpm: number;
  sessionId?: string;
  timestampMs: number;
};

type LocalStorageEntry = {
  key: string;
  bytes: number;
  valuePreview: string;
};

type AdminStorageSummary = {
  sessionCount: number;
  finishedSessions: number;
  inputModeCounts: Record<SessionInputMode, number>;
  localStorageEntries: LocalStorageEntry[];
  dictaLocalStorageBytes: number;
  ttsTextChars: number;
  kokoroTextChars: number;
  typedTextChars: number;
  telemetrySamples: number;
  telemetryActions: number;
  ttsChunks: number;
};

type PendingSyncSummary = {
  count: number;
  hasPending: boolean;
};

type TtsPerformanceSampleResult = {
  metrics: SessionMetrics;
  telemetry: SessionTelemetry;
};

type TtsPublishedUiState = {
  controllerState: ControlAction;
  rate: number;
  lagSec: number;
  lagWords: number;
  wpm: number;
  accuracy: number;
  trend: PerformanceTrend;
};

type AdminFileInventory = {
  projectRoot: string;
  folders: Array<{
    label: string;
    relativePath: string;
    absolutePath: string;
    exists: boolean;
    fileCount: number;
    totalBytes: number;
    wavCount: number;
    jsonCount: number;
    transcriptCount: number;
  }>;
};

type LockedInputSummaryItem = {
  label: string;
  value: string;
};

type AdaptiveSemanticDebug = {
  semanticCutPenalty: number;
  unsafePauseCount: number;
  safePauseCount: number;
  deferredPauseCount: number;
  replayDeniedByBoundaryCount: number;
  averageSemanticCompleteness: number;
  averagePhraseDifficulty: number;
  inputExecutionFidelityScore: number;
  currentPhraseIndex: number;
  currentPhraseId: string;
  currentPhraseTextPreview: string;
  totalSemanticPhrases: number;
  phraseAdvanceCount: number;
  phraseReplayCount: number;
  lastPhraseAdvanceReason: string;
};

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
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = window.localStorage.getItem(THEME_MODE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [ttsExpanded, setTtsExpanded] = useState(true);
  const [ttsText, setTtsText] = useState('');

  useEffect(() => {
    window.localStorage.setItem(THEME_MODE_KEY, themeMode);
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    qwenCloudAdapterRef.current = new QwenCloudAudioAdapter((message) => setError(message));
  }, []);


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
  const [qwenExpanded, setQwenExpanded] = useState(true);
  const [qwenCloudFallbackDetails, setQwenCloudFallbackDetails] = useState<{
    phraseId: string;
    path: string;
    startWordIndex: number;
    chunkIndex: number;
  } | null>(null);
  const [qwenCloudBrowserFallbackActive, setQwenCloudBrowserFallbackActive] = useState(false);
  const [qwenCloudManifestMessage, setQwenCloudManifestMessage] = useState('');
  const [cosyVoiceCacheReady, setCosyVoiceCacheReady] = useState<boolean | null>(null);
  const [cosyVoiceCacheConfigured, setCosyVoiceCacheConfigured] = useState<boolean | null>(null);
  const [cosyVoiceCacheMessage, setCosyVoiceCacheMessage] = useState('');
  const [cosyVoiceCacheGenerating, setCosyVoiceCacheGenerating] = useState(false);
  const [cosyVoiceCacheRuntime, setCosyVoiceCacheRuntime] = useState<Record<string, unknown> | null>(null);
  const [kokoroExpanded, setKokoroExpanded] = useState(true);
  const [kokoroText, setKokoroText] = useState('');
  const [kokoroLanguage, setKokoroLanguage] = useState<TtsLanguage>('en');
  const [kokoroVoice, setKokoroVoice] = useState('default');
  const [kokoroPracticeText, setKokoroPracticeText] = useState('');
  const [kokoroStatus, setKokoroStatus] = useState<TtsStatus>('idle');
  const [kokoroCurrentChunk, setKokoroCurrentChunk] = useState<KokoroGeneratedChunk | null>(null);
  const [kokoroChunks, setKokoroChunks] = useState<KokoroGeneratedChunk[]>([]);
  const [kokoroPlayerProgressTick, setKokoroPlayerProgressTick] = useState(0);
  const [kokoroPacingMode, setKokoroPacingMode] = useState<TtsPacingMode>('balanced');
  const [kokoroSpeechRate, setKokoroSpeechRate] = useState(1);
  const [kokoroManualBias, setKokoroManualBias] = useState(0);
  const {
    kokoroEnabled,
    kokoroServiceReady,
    setKokoroServiceReady,
    toggleKokoroEnabled,
  } = useKokoroRuntime({
    localDevFeaturesAvailable: LOCAL_DEV_FEATURES_AVAILABLE,
    kokoroText,
    kokoroStatus,
    setError,
    onStopActivePlayback: () => stopKokoroPlayback('hold'),
  });

  useEffect(() => {
    if (browserTtsVoices.length === 0) return;
    setSessions((prev) => {
      let changed = false;
      const usedVoiceURIs = prev
        .filter((session) => session.inputMode === 'input2' && session.ttsLanguage)
        .map((session) => session.ttsVoiceURI);
      const next = prev.map((session) => {
        if (
          session.inputMode !== 'input2' ||
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
  const [openRouterDefaultModel, setOpenRouterDefaultModel] = useState('');
  const [ollamaDefaultModel, setOllamaDefaultModel] = useState(OLLAMA_RECOMMENDED_DEFAULT_MODEL);

  useEffect(() => {
    ttsPracticeLiveTextRef.current = ttsPracticeText;
  }, [ttsPracticeText]);

  useEffect(() => {
    kokoroPracticeLiveTextRef.current = kokoroPracticeText;
  }, [kokoroPracticeText]);
  const [directOpenRouterBusy, setDirectOpenRouterBusy] = useState(false);
  const [directIntermediateOpenRouterBusy, setDirectIntermediateOpenRouterBusy] = useState(false);
  const [directAdvancedOpenRouterBusy, setDirectAdvancedOpenRouterBusy] = useState(false);
  const [expressEasyOpenRouterBusy, setExpressEasyOpenRouterBusy] = useState(false);
  const [expressIntermediateOpenRouterBusy, setExpressIntermediateOpenRouterBusy] = useState(false);
  const [expressAdvancedOpenRouterBusy, setExpressAdvancedOpenRouterBusy] = useState(false);
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModelSummary[]>([]);
  const [openRouterStatus, setOpenRouterStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [openRouterError, setOpenRouterError] = useState('');
  const [ollamaModels, setOllamaModels] = useState<OllamaModelSummary[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [ollamaError, setOllamaError] = useState('');
  const [adminFileInventory, setAdminFileInventory] = useState<AdminFileInventory | null>(null);
  const [adminFileInventoryError, setAdminFileInventoryError] = useState('');
  const [dictaLanguageView, setDictaLanguageView] = useState<MetricsLanguageView>(() =>
    loadPersistedDictaLanguageView(),
  );
  const metricsLanguageView = dictaLanguageView;
  const leaderboardLanguageView = dictaLanguageView;
  const adminLanguageView = dictaLanguageView;
  const setMetricsLanguageView = setDictaLanguageView;
  const setLeaderboardLanguageView = setDictaLanguageView;
  const setAdminLanguageView = setDictaLanguageView;
  const [insightsCollapsed, setInsightsCollapsed] = useState<boolean>(() => {
    return window.localStorage.getItem(INSIGHTS_COLLAPSED_KEY) === 'true';
  });
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(true);
  const [leaderboardSectionExpanded, setLeaderboardSectionExpanded] = useState<Record<LeaderboardSectionId, boolean>>({
    'easy-express': false,
    'medium-express': false,
    'hard-express': false,
    'easy-standard': false,
    'medium-standard': false,
    'hard-standard': false,
  });
  const [insightsDiagnosticInputMode, setInsightsDiagnosticInputMode] = useState<InputMode>('browser-tts');
  const [insightsDiagnosticMessage, setInsightsDiagnosticMessage] = useState('');
  const [insightsDiagnosticFallbackReport, setInsightsDiagnosticFallbackReport] = useState('');
  const [metricsRangeView, setMetricsRangeView] = useState<MetricsRangeView>(() => {
    const saved = window.localStorage.getItem(LIVE_METRICS_RANGE_KEY);
    if (saved === 'today' || saved === 'week' || saved === 'twoWeeks' || saved === 'threeWeeks' || saved === 'month') {
      return saved;
    }
    return 'today';
  });
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
  const [adaptiveSectionExpanded, setAdaptiveSectionExpanded] = useState(() => ({
    decision: false,
    architecture: false,
    adapters: false,
    latest: false,
    live: false,
    telemetry: false,
    benchmarks: !isMobileViewport(),
  }));
  const [benchmarkExportMessage, setBenchmarkExportMessage] = useState('');
  const [sessionFeedbackMessage, setSessionFeedbackMessage] = useState('');
  const syncConfig = useMemo(() => getDictaSyncConfig(import.meta.env), []);
  const supabaseClient = useMemo(() => createDictaSupabaseClient(syncConfig), [syncConfig]);
  const [authSession, setAuthSession] = useState<SupabaseAuthSession | null>(null);
  const [authLoading, setAuthLoading] = useState(() => Boolean(syncConfig.authRequired));
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authView, setAuthView] = useState<AuthView>(() => {
    const authParams = `${window.location.hash}${window.location.search}`;
    return authParams.includes('type=recovery') || authParams.includes('type%3Drecovery') ? 'updatePassword' : 'signIn';
  });
  const [authNewPassword, setAuthNewPassword] = useState('');
  const [authNewPasswordConfirm, setAuthNewPasswordConfirm] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authMessageTone, setAuthMessageTone] = useState<'hint' | 'success' | 'error'>('hint');
  const [authBusy, setAuthBusy] = useState(false);
  const [appProfile, setAppProfile] = useState<DictaAppProfile | null>(null);
  const [appProfileError, setAppProfileError] = useState('');
  const openRouterAccessState = resolveOpenRouterAccessState({
    authRequired: syncConfig.authRequired,
    authLoading,
    hasAuthSession: Boolean(authSession),
    profile: appProfile,
    profileError: appProfileError,
  });
  const openRouterAccessAllowed = openRouterAccessState === 'allowed';
  const openRouterAccessMessage = 'OpenRouter access is disabled for this Dicta account. Contact the admin.';
  const [visibleProfiles, setVisibleProfiles] = useState<DictaAppProfile[]>([]);
  const [adminProfileFilter, setAdminProfileFilter] = useState<string>('self');
  const [adminRemoteSessions, setAdminRemoteSessions] = useState<StoredSession[]>([]);
  const [adminRemoteStatus, setAdminRemoteStatus] = useState('');
  const effectiveProfileId = resolveEffectiveSyncProfileId({
    authRequired: syncConfig.authRequired,
    profile: appProfile,
    legacyProfileId: syncConfig.legacyProfileId,
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
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const previousLagRef = useRef(0);
  const previousAccuracyRef = useRef(100);
  const ttsPracticeLiveTextRef = useRef('');
  const kokoroPracticeLiveTextRef = useRef('');

  const ttsUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const qwenCloudAdapterRef = useRef<QwenCloudAudioAdapter | null>(null);
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
  const kokoroEngineRef = useRef<KokoroAudioEngine | null>(null);
  const kokoroStartedAtMsRef = useRef<number | null>(null);
  const kokoroChunkStartMsRef = useRef<number | null>(null);
  const kokoroChunkStartWordIndexRef = useRef(0);
  const kokoroChunkWordCountRef = useRef(0);
  const kokoroCompletedSourceWordsRef = useRef(0);
  const kokoroChunkIndexRef = useRef(0);
  const kokoroLastControllerActionRef = useRef<ControlAction>('hold');
  const kokoroCancelledRef = useRef(false);
  const suppressSidebarAutoSelectRef = useRef(false);
  const hydratingSessionIdRef = useRef<string | null>(null);
  const allowFinishedSessionResetRef = useRef<string | null>(null);
  const applyKokoroPerformanceSampleRef = useRef<() => void>(() => undefined);
  const kokoroSemanticPhrasesRef = useRef<SemanticPhrase[]>([]);
  const kokoroSemanticPhraseAdvanceCountRef = useRef(0);
  const kokoroSemanticPhraseReplayCountRef = useRef(0);
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

  useEffect(() => {
    if (!supabaseClient || !syncConfig.authRequired) {
      setAuthLoading(false);
      return;
    }
    let cancelled = false;

    supabaseClient.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setAuthSession(data.session ?? null);
        setAuthLoading(false);
      }
    });

    const { data: listener } = supabaseClient.auth.onAuthStateChange((event, session) => {
      setAuthSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setAuthView('updatePassword');
        setAuthError('');
        setAuthMessage('Enter a new password to finish recovery.');
        setAuthMessageTone('hint');
      }
      if (!session) {
        setAppProfile(null);
        setVisibleProfiles([]);
        setAdminProfileFilter('self');
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [supabaseClient, syncConfig.authRequired]);

  useEffect(() => {
    if (!supabaseClient || !syncConfig.authRequired || !authSession?.user) return;
    let cancelled = false;

    setAppProfileError('');
    loadDictaAppProfile(supabaseClient, authSession.user)
      .then((profile) => {
        if (cancelled) return;
        setAppProfile(profile);
        if (!profile) {
          setAppProfileError('Your Dicta account exists, but no app profile is mapped yet. Create a dicta_app_profiles row for this user.');
        } else if (!profile.active) {
          setAppProfileError('This Dicta profile is inactive.');
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAppProfile(null);
          setAppProfileError(error instanceof Error ? error.message : 'Failed to load Dicta profile.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authSession?.user, supabaseClient, syncConfig.authRequired]);

  useEffect(() => {
    if (!supabaseClient || !isDictaAdmin(appProfile)) {
      setVisibleProfiles(appProfile ? [appProfile] : []);
      return;
    }
    let cancelled = false;
    loadVisibleDictaAppProfiles(supabaseClient)
      .then((profiles) => {
        if (!cancelled) setVisibleProfiles(profiles);
      })
      .catch(() => {
        if (!cancelled) setVisibleProfiles(appProfile ? [appProfile] : []);
      });
    return () => {
      cancelled = true;
    };
  }, [appProfile, supabaseClient]);

  useEffect(() => {
    if (adminProfileFilter === 'self') {
      setAdminRemoteSessions([]);
      setAdminRemoteStatus('');
      return;
    }
    if (!supabaseClient || !isDictaAdmin(appProfile)) return;
    let cancelled = false;

    setAdminRemoteStatus('Loading remote admin sessions...');
    let query = supabaseClient
      .from(DICTA_SYNC_TABLE)
      .select('profile_id,item_key,payload,updated_at')
      .eq('item_type', 'session')
      .order('updated_at', { ascending: false });
    if (adminProfileFilter !== 'all') {
      query = query.eq('profile_id', adminProfileFilter);
    }
    void (async () => {
      try {
        const { data, error } = await query;
        if (cancelled) return;
        if (error) throw error;
        const nextSessions = (data ?? [])
          .map((row) => asAdminRemoteStoredSession(row.payload))
          .filter((session): session is StoredSession => Boolean(session));
        setAdminRemoteSessions(nextSessions);
        setAdminRemoteStatus(`Loaded ${nextSessions.length} remote session${nextSessions.length === 1 ? '' : 's'} for admin view.`);
      } catch (error) {
        if (!cancelled) {
          setAdminRemoteSessions([]);
          setAdminRemoteStatus(error instanceof Error ? error.message : 'Failed to load remote admin sessions.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adminProfileFilter, appProfile, supabaseClient]);

  const config = useMemo(() => configForDifficulty(difficulty), [difficulty]);
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );
  const dashboardSession = useMemo(
    () => sessions.find((session) => session.id === dashboardSessionId) ?? activeSession,
    [activeSession, dashboardSessionId, sessions],
  );
  const activeInputMode = activeSession?.inputMode ?? 'input2';
  const activeInputLabel =
    activeInputMode === 'input2'
      ? 'Input # 2 - Text to Speech (TTS)'
      : activeInputMode === 'input3'
        ? 'Input # 3 - Kokoro TTS Local'
        : 'Input # 4 - CosyVoice2 Cache';
  const activeInputFeatureLabel =
    activeInputMode === 'input2'
      ? 'Built-in browser feature'
      : activeInputMode === 'input3'
        ? 'Local Python sidecar'
        : activeInputMode === 'input4'
          ? 'Cached CosyVoice2 audio'
          : '';
  const activeInputWorkspaceMode: WorkspaceMode =
    activeInputMode === 'input2' || activeInputMode === 'input4' ? 'tts' : 'kokoro';
  const activeSessionFinished = sessionStatus === 'finished' || activeSession?.status === 'finished';
  const assignedOpenRouterModel =
    syncConfig.authRequired && appProfile?.role === 'member' ? appProfile.assignedOpenRouterModel?.trim() ?? '' : '';
  const effectiveOpenRouterDefaultModel = assignedOpenRouterModel || openRouterDefaultModel;
  const sessionQuotaStatus = getDictaSessionQuotaStatus(syncConfig.authRequired ? appProfile : null, sessions.length);
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
    () => sessions.map((session) => ({ ...session, voiceDurationSec: getSessionVoiceDurationSec(session) })),
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
    () => buildLeaderboardSections(sessionsWithVoiceDuration, leaderboardLanguageView),
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
    const storedModel = window.localStorage.getItem(OPENROUTER_DEFAULT_MODEL_STORAGE_KEY);
    if (storedModel) {
      try {
        setOpenRouterDefaultModel(JSON.parse(storedModel) as string);
      } catch {
        setOpenRouterDefaultModel(storedModel);
      }
    }
  }, []);

  useEffect(() => {
    const storedModel = window.localStorage.getItem(OLLAMA_DEFAULT_MODEL_STORAGE_KEY);
    if (storedModel) {
      try {
        const parsed = JSON.parse(storedModel) as string;
        setOllamaDefaultModel(parsed.trim() || OLLAMA_RECOMMENDED_DEFAULT_MODEL);
      } catch {
        setOllamaDefaultModel(storedModel.trim() || OLLAMA_RECOMMENDED_DEFAULT_MODEL);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LIVE_METRICS_LANGUAGE_KEY, dictaLanguageView);
    window.localStorage.setItem(LEADERBOARD_LANGUAGE_KEY, dictaLanguageView);
    window.localStorage.setItem(ADMIN_LANGUAGE_KEY, dictaLanguageView);
  }, [dictaLanguageView]);

  useEffect(() => {
    window.localStorage.setItem(LIVE_METRICS_RANGE_KEY, metricsRangeView);
  }, [metricsRangeView]);

  useEffect(() => {
    window.localStorage.setItem(INSIGHTS_COLLAPSED_KEY, String(insightsCollapsed));
  }, [insightsCollapsed]);

  useEffect(() => {
    if (!localStorageReadyForEffectiveProfile) return;
    window.localStorage.setItem(ADAPTIVE_BENCHMARKS_KEY, JSON.stringify(adaptiveBenchmarksByInputLanguage));
  }, [adaptiveBenchmarksByInputLanguage, localStorageReadyForEffectiveProfile]);

  useEffect(() => {
    adaptiveBenchmarksRef.current = adaptiveBenchmarksByInputLanguage;
  }, [adaptiveBenchmarksByInputLanguage]);

  useEffect(() => {
    adaptiveSessionFeedbackRef.current = adaptiveSessionFeedbackByInputLanguage;
    if (!localStorageReadyForEffectiveProfile) return;
    window.localStorage.setItem(ADAPTIVE_SESSION_FEEDBACK_KEY, JSON.stringify(adaptiveSessionFeedbackByInputLanguage));
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

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine);
    updateOnlineState();
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);
    return () => {
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, []);

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
  const ttsPracticeMissing = Math.max((ttsTranscript?.words.length ?? 0) - ttsPracticeEvaluation.matchedWords, 0);
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
  const kokoroHasText = kokoroText.trim().length > 0;
  const kokoroLanguageWarning = getKokoroLanguageWarning(kokoroLanguage);
  const kokoroTranscript = useMemo(() => buildTextTranscript(kokoroText), [kokoroText]);
  const kokoroPracticeEvaluation = useMemo(
    () => evaluateTranscriptAttempt(kokoroPracticeText, kokoroTranscript),
    [kokoroPracticeText, kokoroTranscript],
  );
  const kokoroPracticeWords = kokoroPracticeEvaluation.typedWords;
  const kokoroPracticeMissing = Math.max((kokoroTranscript?.words.length ?? 0) - kokoroPracticeEvaluation.matchedWords, 0);
  const kokoroVisibleAccuracy =
    kokoroPracticeWords.length > 0 && (kokoroTranscript?.words.length ?? 0) > 0 ? kokoroPracticeEvaluation.accuracy : 0;
  const kokoroVisibleScore =
    kokoroPracticeWords.length > 0 && (kokoroTranscript?.words.length ?? 0) > 0
      ? computeSessionScore({
          accuracy: kokoroVisibleAccuracy,
          lagSec,
          wpm,
          rate,
          points: kokoroPracticeEvaluation.points,
        })
      : 0;
  const activePoints =
    activeInputMode === 'input2' || activeInputMode === 'input4'
      ? ttsPracticeEvaluation.points
      : kokoroPracticeEvaluation.points;
  const activeVisibleAccuracy =
    activeInputMode === 'input2' || activeInputMode === 'input4'
      ? ttsVisibleAccuracy
      : kokoroVisibleAccuracy;
  const activeVisibleScore =
    activeInputMode === 'input2' || activeInputMode === 'input4'
      ? ttsVisibleScore
      : kokoroVisibleScore;
  const activeMaxPoints = useMemo(
    () =>
      computeSessionMaxPoints({
        inputMode: activeInputMode,
        ttsText,
        kokoroText,
      }),
    [activeInputMode, kokoroText, ttsText],
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
    if (activeInputMode !== 'input2' || activeSessionFinished || !ttsHasText) {
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
    if (activeInputMode !== 'input3' || activeSessionFinished || !kokoroHasText || kokoroStatus !== 'playing') {
      return;
    }

    const id = window.setInterval(() => {
      applyKokoroPerformanceSampleRef.current();
    }, config.tickMs);

    return () => window.clearInterval(id);
  }, [
    activeInputMode,
    config.tickMs,
    kokoroHasText,
    kokoroPracticeEvaluation.lastMatchedTargetIndex,
    kokoroPracticeEvaluation.points,
    kokoroPracticeWords.length,
    kokoroSpeechRate,
    kokoroStatus,
    kokoroTranscript,
    kokoroVisibleAccuracy,
    sessionStatus,
  ]);

  useEffect(() => {
    if (!activeSession) return;

    hydratingSessionIdRef.current = activeSession.id;
    setDifficulty(activeSession.difficulty);
    setInputSettingsLocked(Boolean(activeSession.inputSettingsLocked));
    setTtsLanguage(activeSession.ttsLanguage ?? 'de');
    setTtsPracticeText(activeSession.ttsPracticeText ?? '');
    ttsPracticeLiveTextRef.current = activeSession.ttsPracticeText ?? '';
    setKokoroText(activeSession.kokoroText ?? '');
    setKokoroLanguage(activeSession.kokoroLanguage ?? 'en');
    setKokoroVoice(activeSession.kokoroVoice ?? 'default');
    setKokoroPracticeText(activeSession.kokoroPracticeText ?? '');
    kokoroPracticeLiveTextRef.current = activeSession.kokoroPracticeText ?? '';
    setKokoroChunks(activeSession.kokoroChunks ?? []);
    setSessionStatus(activeSession.status);
    setTtsText(activeSession.ttsText ?? '');
    setTtsStatus(activeSession.inputMode === 'input2' && activeSession.status === 'finished' ? 'finished' : activeSession.ttsText ? 'ready' : 'idle');
    setKokoroStatus(activeSession.inputMode === 'input3' && activeSession.status === 'finished' ? 'finished' : activeSession.kokoroText ? 'ready' : 'idle');
    setTtsCurrentChunk('');
    setKokoroCurrentChunk(null);
    setTtsPacingMode('balanced');
    setTtsSpeechRate(1);
    setKokoroPacingMode('balanced');
    setKokoroSpeechRate(1);
    setKokoroManualBias(0);
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
    kokoroStartedAtMsRef.current = null;
    kokoroChunkStartMsRef.current = null;
    kokoroChunkStartWordIndexRef.current = 0;
    kokoroChunkWordCountRef.current = 0;
    kokoroCompletedSourceWordsRef.current = 0;
    kokoroChunkIndexRef.current = 0;
    kokoroSemanticPhraseAdvanceCountRef.current = 0;
    kokoroSemanticPhraseReplayCountRef.current = 0;
    kokoroLastControllerActionRef.current = 'hold';
    kokoroCancelledRef.current = false;
    resetAdaptiveSessionFeedbackTracking(activeSessionId);
    kokoroEngineRef.current?.stop();
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSession || activeSession.status !== 'finished' || sessionStatus === 'finished') return;

    setRunning(false);
    setSessionStatus('finished');
    if (activeSession.inputMode === 'input2' || activeSession.inputMode === 'input4') {
      setTtsStatus('finished');
    }
    if (activeSession.inputMode === 'input3') {
      setKokoroStatus('finished');
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
          session.kokoroText !== kokoroText ||
          session.kokoroLanguage !== kokoroLanguage ||
          session.kokoroVoice !== kokoroVoice ||
          session.kokoroPracticeText !== kokoroPracticeText ||
          JSON.stringify(session.kokoroChunks) !== JSON.stringify(kokoroChunks) ||
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
          kokoroText,
          kokoroLanguage,
          kokoroVoice,
          kokoroPracticeText,
          kokoroChunks,
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
    kokoroLanguage,
    kokoroChunks,
    kokoroPracticeText,
    kokoroText,
    kokoroVoice,
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

  useEffect(() => {
    if (kokoroStatus !== 'playing') return;
    const interval = window.setInterval(() => setKokoroPlayerProgressTick((value) => value + 1), 500);
    return () => window.clearInterval(interval);
  }, [kokoroStatus]);

  function resetSession(options: { preserveInputSettingsLock?: boolean } = {}): void {
    const nextInputSettingsLocked = options.preserveInputSettingsLock ? inputSettingsLocked : false;
    if (activeSession?.status === 'finished') {
      allowFinishedSessionResetRef.current = activeSession.id;
    }
    stopTtsPlayback();
    stopKokoroPlayback();
    setTtsPracticeText('');
    ttsPracticeLiveTextRef.current = '';
    setKokoroPracticeText('');
    kokoroPracticeLiveTextRef.current = '';
    setKokoroChunks([]);
    setTtsStatus(ttsText.trim() ? 'ready' : 'idle');
    setKokoroStatus(kokoroText.trim() ? 'ready' : 'idle');
    setTtsCurrentChunk('');
    setKokoroCurrentChunk(null);
    setTtsPacingMode('balanced');
    setTtsSpeechRate(1);
    setKokoroPacingMode('balanced');
    setKokoroSpeechRate(1);
    setKokoroManualBias(0);
    ttsStartedAtMsRef.current = null;
    ttsChunkStartMsRef.current = null;
    ttsChunkStartWordIndexRef.current = 0;
    ttsChunkWordCountRef.current = 0;
    ttsCompletedSourceWordsRef.current = 0;
    ttsLastControllerActionRef.current = 'hold';
    kokoroStartedAtMsRef.current = null;
    kokoroChunkStartMsRef.current = null;
    kokoroChunkStartWordIndexRef.current = 0;
    kokoroChunkWordCountRef.current = 0;
    kokoroCompletedSourceWordsRef.current = 0;
    kokoroChunkIndexRef.current = 0;
    kokoroLastControllerActionRef.current = 'hold';
    kokoroCancelledRef.current = false;
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
      if (activeInputMode === 'input2') {
        setTtsExpanded(true);
      } else if (activeInputMode === 'input4') {
        setQwenExpanded(true);
      } else {
        setKokoroExpanded(true);
      }
    }
    telemetryRef.current = null;
    resetAdaptiveSessionFeedbackTracking(activeSession?.id);
  }

  function getAuthHeaders(): Record<string, string> {
    const token = authSession?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function refreshOpenRouterModels(): Promise<void> {
    setOpenRouterStatus('loading');
    setOpenRouterError('');
    try {
      const response = await fetch('/api/openrouter/models', { headers: getAuthHeaders() });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `OpenRouter request failed (${response.status}).`);
      }
      const payload = (await response.json()) as {
        data?: Array<{
          id: string;
          name?: string;
          context_length?: number;
          pricing?: { prompt?: string | number; completion?: string | number };
        }>;
      };
      const data = Array.isArray(payload.data) ? payload.data : [];
      const freeModels = data
        .filter((model) => {
          const prompt = Number(model.pricing?.prompt ?? NaN);
          const completion = Number(model.pricing?.completion ?? NaN);
          return Number.isFinite(prompt) && Number.isFinite(completion) && prompt === 0 && completion === 0;
        })
        .map((model) => ({ id: model.id, name: model.name, context_length: model.context_length }))
        .sort((a, b) => a.id.localeCompare(b.id));
      setOpenRouterModels(freeModels);
      setOpenRouterStatus('ready');
      if (!assignedOpenRouterModel && !openRouterDefaultModel && freeModels.length > 0) {
        setOpenRouterDefaultModel(freeModels[0].id);
        window.localStorage.setItem(OPENROUTER_DEFAULT_MODEL_STORAGE_KEY, JSON.stringify(freeModels[0].id));
      }
    } catch (err) {
      setOpenRouterModels([]);
      setOpenRouterStatus('error');
      setOpenRouterError(err instanceof Error ? err.message : 'OpenRouter model fetch failed.');
    }
  }

  async function refreshOllamaModels(): Promise<void> {
    setOllamaStatus('loading');
    setOllamaError('');
    try {
      const response = await fetch('/api/ollama/models', { headers: getAuthHeaders() });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Ollama request failed (${response.status}).`);
      }
      const payload = (await response.json()) as {
        data?: Array<{
          id: string;
          name?: string;
          modified_at?: string;
          size?: number;
          details?: OllamaModelSummary['details'];
        }>;
      };
      const data = Array.isArray(payload.data) ? payload.data : [];
      const nextModels = data
        .filter((model) => typeof model.id === 'string' && model.id.trim())
        .map((model) => ({
          id: model.id,
          name: model.name,
          modified_at: model.modified_at,
          size: model.size,
          details: model.details,
        }))
        .sort((a, b) => {
          if (a.id === OLLAMA_RECOMMENDED_DEFAULT_MODEL) return -1;
          if (b.id === OLLAMA_RECOMMENDED_DEFAULT_MODEL) return 1;
          return a.id.localeCompare(b.id);
        });
      setOllamaModels(nextModels);
      setOllamaStatus('ready');
      if (!ollamaDefaultModel.trim()) {
        const nextDefault = nextModels[0]?.id ?? OLLAMA_RECOMMENDED_DEFAULT_MODEL;
        setOllamaDefaultModel(nextDefault);
        window.localStorage.setItem(OLLAMA_DEFAULT_MODEL_STORAGE_KEY, JSON.stringify(nextDefault));
      }
    } catch (err) {
      setOllamaModels([]);
      setOllamaStatus('error');
      setOllamaError(err instanceof Error ? err.message : 'Ollama model fetch failed.');
    }
  }

  async function updateAdminProfileAccess(
    profile: DictaAppProfile,
    patch: { canAccessOpenRouter: boolean; assignedOpenRouterModel: string; sessionLimit: number },
  ): Promise<DictaAppProfile> {
    const response = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        userId: profile.userId,
        canAccessOpenRouter: patch.canAccessOpenRouter,
        assignedOpenRouterModel: patch.assignedOpenRouterModel,
        sessionLimit: patch.sessionLimit,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Profile access update failed (${response.status}).`);
    }
    const payload = (await response.json()) as {
      profile?: {
        user_id: string;
        profile_id: string;
        display_name: string | null;
        role: string;
        active: boolean | null;
        can_access_openrouter?: boolean | null;
        assigned_openrouter_model?: string | null;
        session_limit?: number | null;
        created_at?: string;
        updated_at?: string;
      };
    };
    if (!payload.profile) throw new Error('Profile access update did not return a profile.');
    const updated = normalizeDictaAppProfile(payload.profile);
    setVisibleProfiles((current) => current.map((item) => (item.userId === updated.userId ? updated : item)));
    if (appProfile?.userId === updated.userId) {
      setAppProfile(updated);
    }
    return updated;
  }

  function ensureCanCreateDictationSession(messageTarget: 'error' | 'openrouter' | 'export' = 'error'): boolean {
    if (!sessionQuotaStatus.blocked) return true;
    const message = sessionQuotaStatus.message;
    if (messageTarget === 'openrouter') {
      setOpenRouterError(message);
    } else if (messageTarget === 'export') {
      setExportMessage(message);
    } else {
      setError(message);
    }
    return false;
  }

  async function signInWithSupabase(event?: FormEvent<HTMLFormElement>): Promise<void> {
    event?.preventDefault();
    if (!supabaseClient) return;
    setAuthError('');
    setAuthMessage('');
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    });
    if (error) {
      setAuthError(error.message);
      return;
    }
    setAuthPassword('');
  }

  function showAuthView(view: AuthView): void {
    setAuthView(view);
    setAuthError('');
    setAuthMessage('');
    if (view !== 'updatePassword') {
      setAuthNewPassword('');
      setAuthNewPasswordConfirm('');
    }
  }

  async function requestSupabasePasswordReset(event?: FormEvent<HTMLFormElement>): Promise<void> {
    event?.preventDefault();
    if (!supabaseClient) return;
    const email = authEmail.trim();
    if (!email) {
      setAuthError('Enter the account email first.');
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/training`,
      });
      if (error) throw error;
      setAuthMessage(`Password reset email sent to ${email}. Open the newest email on this device.`);
      setAuthMessageTone('success');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to send password reset email.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function updateSupabasePassword(event?: FormEvent<HTMLFormElement>): Promise<void> {
    event?.preventDefault();
    if (!supabaseClient) return;
    if (!authSession) {
      setAuthError('Open the latest password reset email again, then set a new password.');
      return;
    }
    if (authNewPassword.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }
    if (authNewPassword !== authNewPasswordConfirm) {
      setAuthError('Passwords do not match.');
      return;
    }
    const email = authSession.user.email ?? authEmail;
    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');
    try {
      const { error } = await supabaseClient.auth.updateUser({ password: authNewPassword });
      if (error) throw error;
      await supabaseClient.auth.signOut();
      setAuthSession(null);
      setAppProfile(null);
      setAuthEmail(email);
      setAuthPassword('');
      setAuthNewPassword('');
      setAuthNewPasswordConfirm('');
      setAuthView('signIn');
      setAuthMessage('Password updated. Sign in with the new password.');
      setAuthMessageTone('success');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to update password.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut(): Promise<void> {
    try {
      await supabaseClient?.auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      if (syncConfig.authRequired) {
        setAuthSession(null);
        setAppProfile(null);
        setAuthView('signIn');
        setAuthPassword('');
        setAuthNewPassword('');
        setAuthNewPasswordConfirm('');
      } else {
        window.location.href = '/login.html';
      }
    }
  }

  function createSessionWithMode(inputMode: SessionInputMode): void {
    if (!ensureCanCreateDictationSession('error')) return;
    const name = sessionCreationName.trim();
    if (!name) {
      setError('Enter a session name before creating the session.');
      return;
    }
    suppressSidebarAutoSelectRef.current = true;
    const nextSession = prependSessionAndPersistNow((prev) =>
      createStoredSession(
        getNextSessionIndex(prev),
        inputMode,
        name,
      ),
    );
    setActiveSessionId(nextSession.id);
    showSessionInputWorkspace(inputMode);
    setSessionCreationMode(null);
    setSessionCreationSource('plainText');
    setSessionCreationName('');
    setDictationScriptJson('');
    setDictationScriptValidation(null);
    setTtsExpanded(true);
    setQwenExpanded(true);
    setKokoroExpanded(true);
  }

  function validateScriptImport(): void {
    setDictationScriptValidation(parseDictationScriptJson(dictationScriptJson));
  }

  function createSessionFromDictationScript(): void {
    if (!ensureCanCreateDictationSession('error')) return;
    const result = dictationScriptValidation?.ok ? dictationScriptValidation : parseDictationScriptJson(dictationScriptJson);
    setDictationScriptValidation(result);
    if (!result.ok) {
      return;
    }

    const inputMode = mapDictationScriptInputModeToSession(result.script.inputMode);
    if (!inputMode) {
      setDictationScriptValidation({
        ok: false,
        script: null,
        errors: ['inputMode must match input2/input3/input4 or browser-tts/kokoro/cosyvoice-cache. Legacy qwen-cloud is still accepted for Input 4.'],
      });
      return;
    }

    suppressSidebarAutoSelectRef.current = true;
    const nextSession = prependSessionAndPersistNow((prev) =>
      createSessionFromScript(result.script, getNextSessionIndex(prev), inputMode, { browserTtsVoices }),
    );
    setActiveSessionId(nextSession.id);
    showSessionInputWorkspace(inputMode);
    setSessionCreationMode(null);
    setSessionCreationSource('plainText');
    setSessionCreationName('');
    setDictationScriptJson('');
    setDictationScriptValidation(null);
    setTtsExpanded(false);
    setQwenExpanded(false);
    setKokoroExpanded(false);
    setError('');
    setExportMessage('DictationScript session created and locked.');
  }

  function createSessionFromOpenRouterScript(
    script: DictationScript,
    options: { navigateToLeaderboard?: boolean; generationOrigin?: GenerationOrigin } = {},
  ): void {
    if (!ensureCanCreateDictationSession('openrouter')) return;
    const navigateToLeaderboard = options.navigateToLeaderboard ?? true;
    const generationOrigin = options.generationOrigin ?? 'openrouter';
    const inputMode = mapDictationScriptInputModeToSession(script.inputMode);
    if (!inputMode) {
      setOpenRouterError('Generated script inputMode must match input2/input3/input4 or browser-tts/kokoro/cosyvoice-cache. Legacy qwen-cloud is still accepted for Input 4.');
      return;
    }

    suppressSidebarAutoSelectRef.current = true;
    const nextSession = prependSessionAndPersistNow((prev) => ({
      ...createSessionFromScript(script, getNextSessionIndex(prev), inputMode, { browserTtsVoices }),
      generationOrigin,
    }));
    setLeaderboardLanguageView(scriptLanguageToTtsLanguage(script.language));
    if (navigateToLeaderboard) {
      setActiveSessionId(nextSession.id);
      showLeaderboardWorkspace();
    }
    setSessionCreationMode(null);
    setSessionCreationSource('plainText');
    setSessionCreationName('');
    setDictationScriptJson('');
    setDictationScriptValidation(null);
    setTtsExpanded(false);
    setQwenExpanded(false);
    setKokoroExpanded(false);
    setError('');
    setOpenRouterError('');
    setExportMessage('OpenRouter DictationScript session created and locked.');
  }

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
    const sessionInputMode = mapDictationScriptInputModeToSession(inputMode) ?? 'input2';
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

  function deleteSession(sessionId: string): void {
    if (dashboardSessionId === sessionId) {
      clearDashboardSession();
      if (workspaceMode === 'dashboard') {
        showLeaderboardWorkspace();
      }
    }
    deleteSessionAndSync(sessionId);
  }

  function openDashboardForSession(sessionId: string): void {
    setActiveSessionId(sessionId);
    showDashboardWorkspace(sessionId);
  }

  function openWorkspaceForSession(session: StoredSession): void {
    setActiveSessionId(session.id);
    showSessionInputWorkspace(session.inputMode);
  }

  function getActiveTypingLanguage(): TypingLanguage | null {
    if (activeInputMode === 'input2' || activeInputMode === 'input4') {
      return ttsLanguage;
    }
    if (activeInputMode === 'input3') {
      return kokoroLanguage;
    }
    return null;
  }

  function resolveKeyboardProfile(): KeyboardProfile {
    if (!inputSettingsLocked) {
      return null;
    }
    const language = getActiveTypingLanguage();
    if (language === 'es') {
      return 'es-virtual';
    }
    if (language === 'en' || language === 'de' || language === 'fr' || language === 'pt') {
      return 'de-keyboard';
    }
    return null;
  }

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

  const keyboardProfile = resolveKeyboardProfile();
  const keyboardProfileLabel = keyboardProfile === 'es-virtual'
    ? 'ES virtual layout'
    : keyboardProfile === 'de-keyboard'
      ? 'DE keyboard layout'
      : null;

  function normalizePhysicalKey(event: KeyboardEvent<HTMLTextAreaElement>, language: TypingLanguage | null): string | null {
    if (language !== 'es') {
      return null;
    }
    if (event.code === 'KeyY') {
      return event.shiftKey ? 'Z' : 'z';
    }
    if (event.code === 'KeyZ') {
      return event.shiftKey ? 'Y' : 'y';
    }
    return null;
  }

  function handleEsKeyboardRemapKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
    applyValue: (value: string) => void,
  ): void {
    if (event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) {
      return;
    }
    if (keyboardProfile !== 'es-virtual') {
      return;
    }
    const mappedChar = normalizePhysicalKey(event, getActiveTypingLanguage());
    if (!mappedChar) {
      return;
    }
    event.preventDefault();
    const textarea = event.currentTarget;
    const selectionStart = textarea.selectionStart ?? textarea.value.length;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;
    textarea.setRangeText(mappedChar, selectionStart, selectionEnd, 'end');
    applyValue(textarea.value);
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
    if (!session || session.inputMode !== 'input2') return null;
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
    if (session.inputMode !== 'input2') return session;
    const ttsEnvironment = collectBrowserTtsEnvironmentForSession(session, selectedVoice, selectedVoiceURI);
    if (sameBrowserTtsEnvironment(session.ttsEnvironment, ttsEnvironment)) return session;
    return { ...session, ttsEnvironment };
  }

  function resolveActiveBrowserTtsVoice(): SpeechSynthesisVoice | null {
    if (!activeSession || activeSession.inputMode !== 'input2') return null;
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

  function onKokoroTextChange(value: string): void {
    if (inputSettingsLocked || activeSessionFinished) return;
    setKokoroText(value);
    setKokoroStatus(value.trim().length > 0 ? 'ready' : 'idle');
  }

  function onKokoroPracticeChange(value: string): void {
    if (activeSessionFinished) return;
    if (!telemetryRef.current || !telemetryRef.current.startedAt) {
      telemetryRef.current = { ...cloneTelemetry(telemetryRef.current), startedAt: new Date().toISOString() };
    }
    if (kokoroStartedAtMsRef.current === null) {
      kokoroStartedAtMsRef.current = performance.now();
    }
    kokoroPracticeLiveTextRef.current = value;
    setKokoroPracticeText(value);
  }

  function onKokoroPracticeKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    handleEsKeyboardRemapKeyDown(event, onKokoroPracticeChange);
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

  function getKokoroElapsedSeconds(now = performance.now()): number {
    if (kokoroStartedAtMsRef.current === null) {
      return 0;
    }
    return Math.max(0, (now - kokoroStartedAtMsRef.current) / 1000);
  }

  function estimateKokoroSpokenWordIndex(now = performance.now()): number {
    const sourceWordCount = kokoroTranscript?.words.length ?? 0;
    if (sourceWordCount === 0) {
      return 0;
    }

    if (kokoroStatus === 'playing' && kokoroChunkStartMsRef.current !== null) {
      const elapsedSec = Math.max(0, (now - kokoroChunkStartMsRef.current) / 1000);
      const wordsPerSecond = Math.max(1, TTS_BASE_WORDS_PER_SECOND * kokoroSpeechRate);
      const spokenInChunk = Math.min(kokoroChunkWordCountRef.current, Math.floor(elapsedSec * wordsPerSecond));
      return clamp(kokoroChunkStartWordIndexRef.current + spokenInChunk, 0, sourceWordCount);
    }

    if (kokoroStatus === 'finished') {
      return sourceWordCount;
    }

    return clamp(kokoroCompletedSourceWordsRef.current, 0, sourceWordCount);
  }

  function recordKokoroTelemetryAction(action: ControlAction, actionRate = kokoroSpeechRate): void {
    const telemetry = ensureAttemptTelemetry();
    const next = cloneTelemetry(telemetry);
    trackAction(next, getKokoroElapsedSeconds(), action, actionRate);
    telemetryRef.current = next;
  }

  function recordKokoroChunkTelemetry(chunk: Omit<TtsChunkTelemetry, 't'>): void {
    const telemetry = ensureAttemptTelemetry();
    const next = cloneTelemetry(telemetry);
    next.ttsChunks.push({
      t: getKokoroElapsedSeconds(),
      engine: 'kokoro',
      ...chunk,
    });
    telemetryRef.current = next;
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
        activeSession?.inputMode === 'input2'
          ? resolveBrowserTtsSessionVoice(browserTtsVoices, ttsLanguage, activeSession.ttsVoiceURI)
          : null;
      const finalVoiceURI = finalVoiceResolution?.voiceURI ?? activeSession?.ttsVoiceURI ?? null;
      const finalTtsEnvironment = collectBrowserTtsEnvironmentForSession(activeSession, finalVoiceResolution?.voice ?? null, finalVoiceURI);
      const nextSessions = sessions.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              ttsVoiceURI: session.inputMode === 'input2' ? finalVoiceURI : session.ttsVoiceURI,
              ttsEnvironment: session.inputMode === 'input2' ? finalTtsEnvironment : session.ttsEnvironment,
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

    if (activeInputMode === 'input4') {
      setQwenCloudFallbackDetails(null);
      void playQwenCloud();
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

  function formatTimestampForFilename(now: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    return `${yyyy}-${mm}-${dd}-${hh}${min}${ss}`;
  }

  function buildQwenCloudCacheManifestPayload(): string | null {
    if (!ttsText.trim()) return null;
    const semanticPhrases = buildSemanticPhrasesForCurrentSession(ttsText, ttsLanguage, ttsPacingMode);
    const manifest = buildQwenCloudCacheManifestFromSemanticPhrases(semanticPhrases, ttsLanguage);
    if (manifest.phrases.length === 0) return null;
    return qwenCloudCacheManifestJson(manifest);
  }

  async function copyQwenCloudCacheManifest(): Promise<void> {
    try {
      const payload = buildQwenCloudCacheManifestPayload();
      if (!payload) {
        setQwenCloudManifestMessage('Paste text first so Dicta can build a cache manifest.');
        return;
      }
      await navigator.clipboard.writeText(payload);
      setQwenCloudManifestMessage(`Cache manifest copied for ${ttsLanguage}.`);
    } catch {
      setQwenCloudManifestMessage('Could not copy cache manifest.');
    }
  }

  function downloadQwenCloudCacheManifest(): void {
    const payload = buildQwenCloudCacheManifestPayload();
    if (!payload) {
      setQwenCloudManifestMessage('Paste text first so Dicta can build a cache manifest.');
      return;
    }

    const stamp = formatTimestampForFilename(new Date());
    const filename = `cosyvoice-cache-manifest-${ttsLanguage}-${stamp}.json`;
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setQwenCloudManifestMessage(`Downloaded ${filename}.`);
  }

  function importDictaLocalStorageSnapshot(rawJson: string): void {
    try {
      const parsed = JSON.parse(rawJson) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Import file must be a JSON object exported from Dicta Admin.');
      }

      const incoming = Object.entries(parsed).filter(
        (entry): entry is [string, string] => entry[0].startsWith('dicta.') && typeof entry[1] === 'string',
      );
      if (incoming.length === 0) {
        throw new Error('No Dicta localStorage keys found in this file.');
      }

      const sessionEntry = incoming.find(([key]) => key === SESSION_STORAGE_KEY);
      if (sessionEntry) {
        const parsedSessions = JSON.parse(sessionEntry[1]) as unknown;
        if (!Array.isArray(parsedSessions)) {
          throw new Error('Imported sessions are not in the expected format.');
        }
      }

      const confirmed = window.confirm(
        'Import this Dicta storage snapshot into this browser? This replaces the current Vercel browser sessions, leaderboard, benchmarks, and feedback.',
      );
      if (!confirmed) return;

      for (const key of Object.keys(getDictaLocalStorageSnapshot())) {
        window.localStorage.removeItem(key);
      }
      for (const [key, value] of incoming) {
        window.localStorage.setItem(key, value);
      }

      const importedSessions = loadSessions();
      setSessions(importedSessions);
      setActiveSessionId(importedSessions[0]?.id ?? '');
      clearDashboardSession();
      setAdaptiveBenchmarksByInputLanguage(loadAdaptiveBenchmarks());
      setAdaptiveSessionFeedbackByInputLanguage(loadAdaptiveSessionFeedback());
      setDictaLanguageView(loadPersistedDictaLanguageView());

      const storedModel = window.localStorage.getItem(OPENROUTER_DEFAULT_MODEL_STORAGE_KEY);
      if (storedModel) {
        try {
          setOpenRouterDefaultModel(JSON.parse(storedModel) as string);
        } catch {
          setOpenRouterDefaultModel(storedModel);
        }
      } else {
        setOpenRouterDefaultModel('');
      }

      const storedOllamaModel = window.localStorage.getItem(OLLAMA_DEFAULT_MODEL_STORAGE_KEY);
      if (storedOllamaModel) {
        try {
          const parsed = JSON.parse(storedOllamaModel) as string;
          setOllamaDefaultModel(parsed.trim() || OLLAMA_RECOMMENDED_DEFAULT_MODEL);
        } catch {
          setOllamaDefaultModel(storedOllamaModel.trim() || OLLAMA_RECOMMENDED_DEFAULT_MODEL);
        }
      } else {
        setOllamaDefaultModel(OLLAMA_RECOMMENDED_DEFAULT_MODEL);
      }

      showLeaderboardWorkspace();
      setExportMessage(`Imported ${incoming.length} Dicta storage key(s). Leaderboard and adaptive profiles restored in this browser.`);
    } catch (error) {
      setExportMessage(error instanceof Error ? `Import failed: ${error.message}` : 'Import failed.');
    }
  }

  async function ensureCosyVoiceCacheSidecar(): Promise<boolean> {
    if (!LOCAL_DEV_FEATURES_AVAILABLE) {
      setCosyVoiceCacheReady(false);
      setCosyVoiceCacheConfigured(false);
      setCosyVoiceCacheMessage('CosyVoice2 cache generation is local-only in the Vercel build.');
      return false;
    }
    try {
      const healthBefore = await fetchCosyVoiceCacheHealth();
      if (healthBefore?.ok) {
        setCosyVoiceCacheReady(true);
        setCosyVoiceCacheConfigured(Boolean(healthBefore.configured));
        setCosyVoiceCacheRuntime((healthBefore.runtime as Record<string, unknown> | undefined) ?? null);
        if (!healthBefore.configured) {
          setCosyVoiceCacheMessage('CosyVoice2 is running but not configured (missing model/deps).');
        }
        return true;
      }
      await startCosyVoiceCacheSidecar();
      const healthAfter = await fetchCosyVoiceCacheHealth();
      const okAfter = Boolean(healthAfter?.ok);
      setCosyVoiceCacheReady(okAfter);
      setCosyVoiceCacheConfigured(healthAfter?.configured ?? null);
      setCosyVoiceCacheRuntime((healthAfter?.runtime as Record<string, unknown> | undefined) ?? null);
      if (!okAfter) {
        setCosyVoiceCacheMessage('CosyVoice2 cache sidecar started, but is not healthy yet.');
      } else if (!healthAfter?.configured) {
        setCosyVoiceCacheMessage('CosyVoice2 is running but not configured (missing model/deps).');
      }
      return okAfter;
    } catch (e) {
      setCosyVoiceCacheReady(false);
      setCosyVoiceCacheConfigured(false);
      setCosyVoiceCacheMessage(e instanceof Error ? e.message : 'Could not start CosyVoice2 cache sidecar.');
      return false;
    }
  }

  async function bootstrapCosyVoiceSidecar(): Promise<void> {
    if (!LOCAL_DEV_FEATURES_AVAILABLE) {
      setCosyVoiceCacheMessage('CosyVoice2 bootstrap is local-only in the Vercel build.');
      return;
    }
    setCosyVoiceCacheMessage('');
    try {
      await bootstrapCosyVoiceCacheSidecar();
      setCosyVoiceCacheMessage('Bootstrapped CosyVoice repo requirements. Restart the generator.');
      setCosyVoiceCacheRuntime(null);
    } catch (e) {
      setCosyVoiceCacheMessage(e instanceof Error ? e.message : 'CosyVoice bootstrap failed.');
    }
  }

  async function generateCosyVoiceCacheFromCurrentText(): Promise<void> {
    if (!ttsText.trim()) {
      setCosyVoiceCacheMessage('Paste text first so Dicta can generate cache WAV files.');
      return;
    }

    setCosyVoiceCacheMessage('');
    const ready = await ensureCosyVoiceCacheSidecar();
    if (!ready) return;
    if (cosyVoiceCacheConfigured === false) {
      setCosyVoiceCacheMessage('CosyVoice2 is running but not configured. Install model/deps (see services/cosyvoice_cache/README.md).');
      return;
    }

    const semanticPhrases = buildSemanticPhrasesForCurrentSession(ttsText, ttsLanguage, ttsPacingMode);
    const manifest = buildQwenCloudCacheManifestFromSemanticPhrases(semanticPhrases, ttsLanguage);
    if (manifest.phrases.length === 0) {
      setCosyVoiceCacheMessage('No semantic phrases found to generate.');
      return;
    }

    setCosyVoiceCacheGenerating(true);
    try {
      const response = await generateCosyVoiceCache({ manifest, overwrite: false });
      if (response.ok) {
        setCosyVoiceCacheMessage(`Generated ${response.generatedCount} WAVs (skipped ${response.skippedCount}).`);
      } else {
        setCosyVoiceCacheMessage(
          response.errors.length > 0 ? `Generation had errors: ${response.errors[0]}` : 'Generation finished with errors.',
        );
      }
    } catch (e) {
      setCosyVoiceCacheMessage(e instanceof Error ? e.message : 'CosyVoice2 cache generation failed.');
    } finally {
      setCosyVoiceCacheGenerating(false);
    }
  }

  async function playQwenCloud(): Promise<void> {
    if (activeSessionFinished) {
      setError('Reset the finished session before playing Input #4 cached audio again.');
      return;
    }

    if (!ttsText.trim()) {
      setError('Paste text before playing Input #4 cached audio.');
      return;
    }

    const sourceWords = buildTtsSourceWords(ttsText);
    if (sourceWords.length === 0) {
      setError('Paste text before playing Input #4 cached audio.');
      return;
    }

    const adapter = qwenCloudAdapterRef.current;
    if (!adapter) {
      setError('Input #4 audio adapter is not available.');
      return;
    }

    stopTtsPlayback();
    setQwenCloudFallbackDetails(null);
    setQwenCloudBrowserFallbackActive(false);
    let chunkIndex = 0;
    let currentPhraseIndex = 0;
    let cancelled = false;
    const semanticPhrases = buildSemanticPhrasesForCurrentSession(ttsText, ttsLanguage, ttsPacingMode);
    beginAdaptiveSessionFeedback(COSYVOICE_CACHE_INPUT_MODE, ttsLanguage, semanticPhrases.length);
    ttsSemanticPhraseAdvanceCountRef.current = 0;
    ttsSemanticPhraseReplayCountRef.current = 0;
    ttsStartedAtMsRef.current = performance.now();
    ttsCompletedSourceWordsRef.current = 0;
    ttsLastControllerActionRef.current = 'hold';
    ensureAttemptTelemetry();
    recordTtsTelemetryAction('play', ttsSpeechRate);
    setError('');
    setTtsStatus('playing');
    setRunning(true);
    setSessionStatus('running');

    const playNext = async (): Promise<void> => {
      if (cancelled || currentPhraseIndex >= semanticPhrases.length) {
        setTtsCurrentChunk('');
        setTtsStatus('finished');
        setRunning(false);
        setSessionStatus((current) => (current === 'finished' ? current : 'paused'));
        ttsCompletedSourceWordsRef.current = ttsTranscript?.words.length ?? ttsCompletedSourceWordsRef.current;
        ttsChunkStartMsRef.current = null;
        applyTtsPerformanceSample();
        return;
      }

      const historyProfile = getHistoricalPerformanceProfile(COSYVOICE_CACHE_INPUT_MODE, ttsLanguage);
      const liveSignal = ttsLiveSignalRef.current;
      const semanticPhrase = semanticPhrases[currentPhraseIndex];
      const wordIndex = wordIndexForSemanticPhrase(semanticPhrases, currentPhraseIndex);
      recordPhrasePlaybackEvent('phrase_started', COSYVOICE_CACHE_INPUT_MODE, ttsLanguage, semanticPhrase, currentPhraseIndex);
      const qwenTelemetry = buildQwenCloudTelemetryFrame({
        inputMode: COSYVOICE_CACHE_INPUT_MODE,
        phraseId: `qwen-${chunkIndex}`,
        estimatedSpokenRatio: sourceWords.length > 0 ? estimateTtsSpokenWordIndex() / sourceWords.length : 0,
        typedProgressRatio: sourceWords.length > 0 ? Math.max(0, ttsPracticeEvaluation.lastMatchedTargetIndex + 1) / sourceWords.length : 0,
        lagSec: liveSignal.lagSec,
        lagWords: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND)),
        lagChars: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND * 5)),
        accuracy: clamp01(liveSignal.accuracy / 100),
        errorRate: clamp01(1 - liveSignal.accuracy / 100),
        wpm: liveSignal.wpm,
        charsPerMinute: 0,
        pauseMs: ttsPlaybackProfile.pauseMs,
        longestPauseMs: 0,
        backspaceRate: 0,
        correctionRate: 0,
        phraseDifficulty: 1,
        phraseLengthWords: sourceWords.length,
        phraseLengthChars: ttsText.length,
        currentPlaybackRate: ttsSpeechRate,
        currentPauseAfterPhraseMs: ttsPlaybackProfile.pauseMs,
        language: ttsLanguage,
        trend: liveSignal.trend,
      });
      const initialDecision = adaptiveControllerRef.current.decide(buildAdaptiveQwenCloudInput(qwenTelemetry, historyProfile));
      const initialPacingMode = mapAdaptivePacingMode(initialDecision.mode);
      const chunk = buildAdaptiveTtsChunk(
        sourceWords,
        wordIndex,
        initialPacingMode,
        chunkWordsForPhraseSize(initialDecision.nextPhraseSize),
        ttsLanguage,
        semanticPhrase,
      );
      const semanticTelemetry = buildQwenCloudTelemetryFrame({
        inputMode: COSYVOICE_CACHE_INPUT_MODE,
        phraseId: `${qwenTelemetry.phraseId}-semantic`,
        estimatedSpokenRatio: sourceWords.length > 0 ? estimateTtsSpokenWordIndex() / sourceWords.length : 0,
        typedProgressRatio: sourceWords.length > 0 ? Math.max(0, ttsPracticeEvaluation.lastMatchedTargetIndex + 1) / sourceWords.length : 0,
        lagSec: liveSignal.lagSec,
        lagWords: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND)),
        lagChars: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND * 5)),
        accuracy: clamp01(liveSignal.accuracy / 100),
        errorRate: clamp01(1 - liveSignal.accuracy / 100),
        wpm: liveSignal.wpm,
        charsPerMinute: 0,
        pauseMs: ttsPlaybackProfile.pauseMs,
        longestPauseMs: 0,
        backspaceRate: 0,
        correctionRate: 0,
        phraseDifficulty: chunk.phraseDifficulty ?? qwenTelemetry.phraseDifficulty,
        phraseLengthWords: chunk.wordCount,
        phraseLengthChars: chunk.text.length,
        currentPlaybackRate: ttsSpeechRate,
        currentPauseAfterPhraseMs: ttsPlaybackProfile.pauseMs,
        language: ttsLanguage,
        trend: liveSignal.trend,
        phraseBoundaryType: chunk.phraseBoundaryType,
        canPauseAfter: chunk.canPauseAfter,
        canReplayIndependently: chunk.canReplayIndependently,
        semanticCompleteness: chunk.semanticCompleteness,
        punctuationLoad: chunk.punctuationLoad,
        rareWordLoad: chunk.rareWordLoad,
        syntaxComplexity: chunk.syntaxComplexity,
      });
      const decision = adaptiveControllerRef.current.decide(buildAdaptiveQwenCloudInput(semanticTelemetry, historyProfile));
      const pacingMode = mapAdaptivePacingMode(decision.mode);
      const pauseAtBoundary = chunk.canPauseAfter ?? true;
      const replayAtBoundary = chunk.canReplayIndependently ?? true;
      const semanticCompleteness = chunk.semanticCompleteness ?? 1;
      const rate = decision.playbackRate;
      const effectivePauseNow = decision.shouldPauseNow && pauseAtBoundary;
      const effectiveReplay = decision.shouldReplayPhrase && replayAtBoundary && semanticCompleteness >= 0.65;
      const phraseId = buildQwenCloudPhraseId(chunk.text, ttsLanguage);

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
      recordAdaptiveBenchmark(semanticTelemetry, decision, {
        actualPlaybackRate: rate,
        actualPauseMs: effectivePauseNow ? decision.pauseAfterPhraseMs : 0,
        replayExecuted: effectiveReplay,
        actualBoundaryType: chunk.phraseBoundaryType,
        event: effectiveReplay ? 'replay' : effectivePauseNow ? 'pause' : decision.deferPauseUntilSafeBoundary ? 'defer_pause' : 'phrase_advance',
        phraseIndex: currentPhraseIndex,
        totalSemanticPhrases: semanticPhrases.length,
      });
      setAdaptiveSemanticDebug((current) => {
        const phraseCount = current.safePauseCount + current.unsafePauseCount + current.deferredPauseCount + 1;
        const avgCompleteness = ((current.averageSemanticCompleteness * (phraseCount - 1)) + semanticCompleteness) / phraseCount;
        const difficulty = chunk.phraseDifficulty ?? 0.5;
        const avgDifficulty = ((current.averagePhraseDifficulty * (phraseCount - 1)) + difficulty) / phraseCount;
        const unsafePauseCount = current.unsafePauseCount + (decision.shouldPauseNow && !pauseAtBoundary ? 1 : 0);
        const safePauseCount = current.safePauseCount + (effectivePauseNow ? 1 : 0);
        const deferredPauseCount = current.deferredPauseCount + (decision.deferPauseUntilSafeBoundary ? 1 : 0);
        const replayDeniedByBoundaryCount = current.replayDeniedByBoundaryCount + (decision.shouldReplayPhrase && !effectiveReplay ? 1 : 0);
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
          currentPhraseIndex,
          currentPhraseId: semanticPhrase?.id ?? `phrase-${currentPhraseIndex}`,
          currentPhraseTextPreview: chunk.text.slice(0, 80),
          totalSemanticPhrases: semanticPhrases.length,
          phraseAdvanceCount: ttsSemanticPhraseAdvanceCountRef.current,
          phraseReplayCount: ttsSemanticPhraseReplayCountRef.current,
          lastPhraseAdvanceReason: 'phrase_start',
        };
      });

      adapter.setOnEnded(() => {
        if (cancelled) return;
        recordPhrasePlaybackEvent('phrase_completed', COSYVOICE_CACHE_INPUT_MODE, ttsLanguage, semanticPhrase, currentPhraseIndex);
        ttsCompletedSourceWordsRef.current = chunk.startWordIndex + chunk.wordCount;
        chunkIndex += 1;
        if (effectiveReplay) {
          ttsSemanticPhraseReplayCountRef.current += 1;
          recordPhrasePlaybackEvent('phrase_replayed', COSYVOICE_CACHE_INPUT_MODE, ttsLanguage, semanticPhrase, currentPhraseIndex);
        } else {
          currentPhraseIndex += 1;
          ttsSemanticPhraseAdvanceCountRef.current += 1;
          recordPhrasePlaybackEvent('phrase_advanced', COSYVOICE_CACHE_INPUT_MODE, ttsLanguage, semanticPhrase, currentPhraseIndex);
        }
        setAdaptiveSemanticDebug((current) => ({
          ...current,
          currentPhraseIndex,
          currentPhraseId: semanticPhrases[currentPhraseIndex]?.id ?? 'complete',
          currentPhraseTextPreview: semanticPhrases[currentPhraseIndex]?.text.slice(0, 80) ?? '',
          totalSemanticPhrases: semanticPhrases.length,
          phraseAdvanceCount: ttsSemanticPhraseAdvanceCountRef.current,
          phraseReplayCount: ttsSemanticPhraseReplayCountRef.current,
          lastPhraseAdvanceReason: effectiveReplay ? 'replay_same_phrase' : 'phrase_complete',
        }));
        if (effectivePauseNow) {
          window.setTimeout(() => {
            void playNext();
          }, decision.pauseAfterPhraseMs);
        } else {
          void playNext();
        }
      });

      try {
        await adapter.loadPhrase(phraseId);
        await adapter.play(decision);
      } catch (e) {
        cancelled = true;
        const message = e instanceof Error ? e.message : 'Could not load Input #4 cached audio.';
        const phraseHash = phraseId.split(':')[1] ?? phraseId;
        const missingPath = `/tts-cache/cosyvoice/${ttsLanguage}/${phraseHash}.wav`;
        setQwenCloudFallbackDetails({
          phraseId,
          path: missingPath,
          startWordIndex: wordIndex,
          chunkIndex,
        });
        setError(`${message} Missing phraseId: ${phraseId}. Expected path: ${missingPath}`);
        setTtsStatus('paused');
        setRunning(false);
        setSessionStatus((current) => (current === 'finished' ? current : 'paused'));
      }
    };

    await playNext();
  }

  function fallbackToBrowserTtsFromQwen(): void {
    const fallback = qwenCloudFallbackDetails;
    if (!fallback) {
      return;
    }

    if (!ttsText.trim()) {
      setError('Paste text before playing Input #4 cached audio.');
      return;
    }

    if (!('speechSynthesis' in window)) {
      setError('This browser does not support speech synthesis.');
      return;
    }

    stopTtsPlayback();
    const sourceWords = buildTtsSourceWords(ttsText);
    if (sourceWords.length === 0) {
      setError('Paste text before playing Input #4 cached audio.');
      return;
    }

    const speech = window.speechSynthesis;
    let chunkIndex = fallback.chunkIndex;
    let cancelled = false;
    const semanticPhrases = buildSemanticPhrasesForCurrentSession(ttsText, ttsLanguage, ttsPacingMode);
    let currentPhraseIndex = semanticPhraseIndexForWordIndex(semanticPhrases, fallback.startWordIndex);
    ttsSemanticPhraseAdvanceCountRef.current = 0;
    ttsSemanticPhraseReplayCountRef.current = 0;
    ttsStartedAtMsRef.current = performance.now();
    ttsCompletedSourceWordsRef.current = fallback.startWordIndex;
    ttsLastControllerActionRef.current = 'hold';
    ensureAttemptTelemetry();
    recordTtsTelemetryAction('play', ttsSpeechRate);
    setError('');
    setTtsStatus('playing');
    setRunning(true);
    setSessionStatus('running');
    setQwenCloudFallbackDetails(null);
    setQwenCloudBrowserFallbackActive(true);

    const speakNext = () => {
      if (cancelled || currentPhraseIndex >= semanticPhrases.length) {
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

      const historyProfile = getHistoricalPerformanceProfile(COSYVOICE_CACHE_INPUT_MODE, ttsLanguage);
      const liveSignal = ttsLiveSignalRef.current;
      const semanticPhrase = semanticPhrases[currentPhraseIndex];
      const wordIndex = wordIndexForSemanticPhrase(semanticPhrases, currentPhraseIndex);
      const qwenTelemetry = buildQwenCloudTelemetryFrame({
        inputMode: COSYVOICE_CACHE_INPUT_MODE,
        phraseId: `qwen-${chunkIndex}`,
        estimatedSpokenRatio: sourceWords.length > 0 ? estimateTtsSpokenWordIndex() / sourceWords.length : 0,
        typedProgressRatio: sourceWords.length > 0 ? Math.max(0, ttsPracticeEvaluation.lastMatchedTargetIndex + 1) / sourceWords.length : 0,
        lagSec: liveSignal.lagSec,
        lagWords: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND)),
        lagChars: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND * 5)),
        accuracy: clamp01(liveSignal.accuracy / 100),
        errorRate: clamp01(1 - liveSignal.accuracy / 100),
        wpm: liveSignal.wpm,
        charsPerMinute: 0,
        pauseMs: ttsPlaybackProfile.pauseMs,
        longestPauseMs: 0,
        backspaceRate: 0,
        correctionRate: 0,
        phraseDifficulty: 1,
        phraseLengthWords: sourceWords.length,
        phraseLengthChars: ttsText.length,
        currentPlaybackRate: ttsSpeechRate,
        currentPauseAfterPhraseMs: ttsPlaybackProfile.pauseMs,
        language: ttsLanguage,
        trend: liveSignal.trend,
      });
      const initialDecision = adaptiveControllerRef.current.decide(buildAdaptiveQwenCloudInput(qwenTelemetry, historyProfile));
      const initialPacingMode = mapAdaptivePacingMode(initialDecision.mode);
      const chunk = buildAdaptiveTtsChunk(
        sourceWords,
        wordIndex,
        initialPacingMode,
        chunkWordsForPhraseSize(initialDecision.nextPhraseSize),
        ttsLanguage,
        semanticPhrase,
      );
      const semanticTelemetry = buildQwenCloudTelemetryFrame({
        inputMode: COSYVOICE_CACHE_INPUT_MODE,
        phraseId: `${qwenTelemetry.phraseId}-semantic`,
        estimatedSpokenRatio: sourceWords.length > 0 ? estimateTtsSpokenWordIndex() / sourceWords.length : 0,
        typedProgressRatio: sourceWords.length > 0 ? Math.max(0, ttsPracticeEvaluation.lastMatchedTargetIndex + 1) / sourceWords.length : 0,
        lagSec: liveSignal.lagSec,
        lagWords: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND)),
        lagChars: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND * 5)),
        accuracy: clamp01(liveSignal.accuracy / 100),
        errorRate: clamp01(1 - liveSignal.accuracy / 100),
        wpm: liveSignal.wpm,
        charsPerMinute: 0,
        pauseMs: ttsPlaybackProfile.pauseMs,
        longestPauseMs: 0,
        backspaceRate: 0,
        correctionRate: 0,
        phraseDifficulty: chunk.phraseDifficulty ?? qwenTelemetry.phraseDifficulty,
        phraseLengthWords: chunk.wordCount,
        phraseLengthChars: chunk.text.length,
        currentPlaybackRate: ttsSpeechRate,
        currentPauseAfterPhraseMs: ttsPlaybackProfile.pauseMs,
        language: ttsLanguage,
        trend: liveSignal.trend,
        phraseBoundaryType: chunk.phraseBoundaryType,
        canPauseAfter: chunk.canPauseAfter,
        canReplayIndependently: chunk.canReplayIndependently,
        semanticCompleteness: chunk.semanticCompleteness,
        punctuationLoad: chunk.punctuationLoad,
        rareWordLoad: chunk.rareWordLoad,
        syntaxComplexity: chunk.syntaxComplexity,
      });
      const decision = adaptiveControllerRef.current.decide(buildAdaptiveQwenCloudInput(semanticTelemetry, historyProfile));
      const pacingMode = mapAdaptivePacingMode(decision.mode);
      const pauseAtBoundary = chunk.canPauseAfter ?? true;
      const replayAtBoundary = chunk.canReplayIndependently ?? true;
      const semanticCompleteness = chunk.semanticCompleteness ?? 1;
      const rate = decision.playbackRate;
      const effectivePauseNow = decision.shouldPauseNow && pauseAtBoundary;
      const effectiveReplay = decision.shouldReplayPhrase && replayAtBoundary && semanticCompleteness >= 0.65;
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      utterance.rate = rate;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = getTtsVoiceLang(ttsLanguage);
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
      recordAdaptiveBenchmark(semanticTelemetry, decision, {
        actualPlaybackRate: rate,
        actualPauseMs: effectivePauseNow ? decision.pauseAfterPhraseMs : 0,
        replayExecuted: effectiveReplay,
        actualBoundaryType: chunk.phraseBoundaryType,
        event: effectiveReplay ? 'replay' : effectivePauseNow ? 'pause' : decision.deferPauseUntilSafeBoundary ? 'defer_pause' : 'phrase_advance',
        phraseIndex: currentPhraseIndex,
        totalSemanticPhrases: semanticPhrases.length,
      });

      utterance.onend = () => {
        if (cancelled) return;
        ttsCompletedSourceWordsRef.current = chunk.startWordIndex + chunk.wordCount;
        chunkIndex += 1;
        if (effectiveReplay) {
          ttsSemanticPhraseReplayCountRef.current += 1;
        } else {
          currentPhraseIndex += 1;
          ttsSemanticPhraseAdvanceCountRef.current += 1;
        }
        setAdaptiveSemanticDebug((current) => ({
          ...current,
          currentPhraseIndex,
          currentPhraseId: semanticPhrases[currentPhraseIndex]?.id ?? 'complete',
          currentPhraseTextPreview: semanticPhrases[currentPhraseIndex]?.text.slice(0, 80) ?? '',
          totalSemanticPhrases: semanticPhrases.length,
          phraseAdvanceCount: ttsSemanticPhraseAdvanceCountRef.current,
          phraseReplayCount: ttsSemanticPhraseReplayCountRef.current,
          lastPhraseAdvanceReason: effectiveReplay ? 'replay_same_phrase' : 'phrase_complete',
        }));
        if (effectivePauseNow) {
          window.setTimeout(() => {
            speakNext();
          }, decision.pauseAfterPhraseMs);
        } else {
          speakNext();
        }
      };
      setAdaptiveSemanticDebug((current) => {
        const phraseCount = current.safePauseCount + current.unsafePauseCount + current.deferredPauseCount + 1;
        const avgCompleteness = ((current.averageSemanticCompleteness * (phraseCount - 1)) + semanticCompleteness) / phraseCount;
        const difficulty = chunk.phraseDifficulty ?? 0.5;
        const avgDifficulty = ((current.averagePhraseDifficulty * (phraseCount - 1)) + difficulty) / phraseCount;
        const unsafePauseCount = current.unsafePauseCount + (decision.shouldPauseNow && !pauseAtBoundary ? 1 : 0);
        const safePauseCount = current.safePauseCount + (effectivePauseNow ? 1 : 0);
        const deferredPauseCount = current.deferredPauseCount + (decision.deferPauseUntilSafeBoundary ? 1 : 0);
        const replayDeniedByBoundaryCount = current.replayDeniedByBoundaryCount + (decision.shouldReplayPhrase && !effectiveReplay ? 1 : 0);
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
        };
      });

      utterance.onerror = () => {
        if (cancelled) return;
        cancelled = true;
        ttsUtteranceRef.current = null;
        setQwenCloudBrowserFallbackActive(false);
        setTtsStatus('paused');
        setError('Browser TTS fallback stopped unexpectedly.');
      };

      speech.speak(utterance);
    };

    speakNext();
  }

  function pauseTts(): void {
    if (activeInputMode === 'input4') {
      if (qwenCloudBrowserFallbackActive) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.pause();
      } else {
        qwenCloudAdapterRef.current?.pause();
      }
    } else if (isBrowserTtsSupported()) {
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
    if (activeInputMode === 'input4') {
      if (qwenCloudBrowserFallbackActive) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.resume();
      } else {
        qwenCloudAdapterRef.current?.play({
          mode: 'balanced',
          playbackRate: ttsSpeechRate,
          pauseAfterPhraseMs: ttsPlaybackProfile.pauseMs,
          shouldPauseNow: false,
          shouldReplayPhrase: false,
          boundaryStrictness: 'phrase',
          allowMidPhrasePause: false,
          deferPauseUntilSafeBoundary: false,
          replayRate: ttsSpeechRate,
          nextPhraseSize: 'medium',
          reason: 'resume',
          lagScore: 0,
          accuracyScore: 0,
          hesitationScore: 0,
          confidenceScore: 1,
        });
      }
      recordTtsTelemetryAction('resume');
      if (ttsStartedAtMsRef.current === null) {
        ttsStartedAtMsRef.current = performance.now();
      }
      setRunning(true);
      setSessionStatus((current) => (current === 'finished' ? current : 'running'));
      setTtsStatus('playing');
      return;
    }

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
    setQwenCloudFallbackDetails(null);
    setQwenCloudBrowserFallbackActive(false);
    if (activeInputMode === 'input4') {
      if (qwenCloudBrowserFallbackActive && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      } else {
        qwenCloudAdapterRef.current?.reset();
      }
    } else if (isBrowserTtsSupported()) {
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
    if (activeInputMode !== 'input2' || !ttsHasText || activeSessionFinished) return;
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

  function applyKokoroPerformanceSample(
    options: { action?: ControlAction; finalize?: boolean; practiceTextOverride?: string } = {},
  ): { metrics: SessionMetrics; telemetry: SessionTelemetry } {
    const now = performance.now();
    if (kokoroStartedAtMsRef.current === null) {
      kokoroStartedAtMsRef.current = now;
    }

    const practiceEvaluation = options.practiceTextOverride === undefined
      ? kokoroPracticeEvaluation
      : evaluateTranscriptAttempt(options.practiceTextOverride, kokoroTranscript);
    const practiceWords = practiceEvaluation.typedWords;
    const visiblePracticeAccuracy =
      practiceWords.length > 0 && (kokoroTranscript?.words.length ?? 0) > 0 ? practiceEvaluation.accuracy : 0;
    const sourceWordCount = kokoroTranscript?.words.length ?? 0;
    const typedProgress = Math.max(0, practiceEvaluation.lastMatchedTargetIndex + 1);
    const spokenPosition = estimateKokoroSpokenWordIndex(now);
    const nextLagWords = sourceWordCount > 0 ? spokenPosition - typedProgress : 0;
    const wordsPerSecond = Math.max(1, TTS_BASE_WORDS_PER_SECOND * kokoroSpeechRate);
    const nextLagSec = nextLagWords / wordsPerSecond;
    const elapsedMinutes = Math.max(getKokoroElapsedSeconds(now) / 60, 1 / 60);
    const nextWpm = practiceWords.length > 0 ? practiceWords.length / elapsedMinutes : 0;
    const nextAccuracy = practiceWords.length > 0 ? visiblePracticeAccuracy : 100;
    const nextPoints = practiceEvaluation.points;
    const nextScore =
      sourceWordCount > 0
        ? computeSessionScore({
            accuracy: nextAccuracy,
            lagSec: nextLagSec,
            wpm: nextWpm,
            rate: kokoroSpeechRate,
            points: nextPoints,
          })
        : 0;
    const nextControllerAction = deriveTtsControlAction({
      accuracy: nextAccuracy,
      lagSec: nextLagSec,
      wpm: nextWpm,
      typedWords: practiceWords.length,
    });
    const nextTrend = derivePerformanceTrend(nextLagSec, nextAccuracy, previousLagRef.current, previousAccuracyRef.current);

    ttsLiveSignalRef.current = {
      accuracy: nextAccuracy,
      lagSec: nextLagSec,
      rawLagSec: nextLagSec,
      stableLagSec: nextLagSec,
      lagOutlierCount: ttsLagOutlierCountRef.current,
      wpm: nextWpm,
      trend: nextTrend,
      controllerState: nextControllerAction,
    };

    setControllerState(nextControllerAction);
    setRate(kokoroSpeechRate);
    setLagSec(nextLagSec);
    setLagWords(nextLagWords);
    setWpm(nextWpm);
    setAccuracy(nextAccuracy);
    setTrend(nextTrend);
    previousLagRef.current = nextLagSec;
    previousAccuracyRef.current = nextAccuracy;

    const telemetry = ensureAttemptTelemetry();
    const nextTelemetry = cloneTelemetry(telemetry);
    trackSample(nextTelemetry, nextLagSec, nextWpm, nextAccuracy, kokoroSpeechRate);

    if (options.action) {
      trackAction(nextTelemetry, getKokoroElapsedSeconds(now), options.action, kokoroSpeechRate);
    } else if (nextControllerAction !== kokoroLastControllerActionRef.current) {
      trackAction(nextTelemetry, getKokoroElapsedSeconds(now), nextControllerAction, kokoroSpeechRate);
      kokoroLastControllerActionRef.current = nextControllerAction;
    }

    if (options.finalize) {
      nextTelemetry.finishedAt = new Date().toISOString();
    }

    telemetryRef.current = nextTelemetry;
    return {
      metrics: {
        controllerState: nextControllerAction,
        rate: kokoroSpeechRate,
        lagSec: nextLagSec,
        lagWords: nextLagWords,
        wpm: nextWpm,
        accuracy: nextAccuracy,
        trend: nextTrend,
        score: nextScore,
        points: nextPoints,
      },
      telemetry: nextTelemetry,
    };
  }

  applyKokoroPerformanceSampleRef.current = applyKokoroPerformanceSample;

  async function playKokoro(): Promise<void> {
    if (!kokoroEnabled) {
      setError('Kokoro TTS is disabled. Turn it on with the toggle.');
      return;
    }
    if (activeSessionFinished) {
      setError('Reset the finished session before playing Kokoro audio again.');
      return;
    }
    if (!kokoroText.trim()) {
      setError('Paste text before playing Kokoro TTS.');
      return;
    }
    if (isKokoroLanguageBlocked(kokoroLanguage)) {
      setError(getKokoroLanguageWarning(kokoroLanguage));
      return;
    }

    kokoroCancelledRef.current = false;
    kokoroStartedAtMsRef.current = performance.now();
    kokoroCompletedSourceWordsRef.current = 0;
    kokoroChunkIndexRef.current = 0;
    kokoroSemanticPhrasesRef.current = buildSemanticPhrasesForCurrentSession(kokoroText, kokoroLanguage, kokoroPacingMode);
    beginAdaptiveSessionFeedback('kokoro', kokoroLanguage, kokoroSemanticPhrasesRef.current.length);
    kokoroSemanticPhraseAdvanceCountRef.current = 0;
    kokoroSemanticPhraseReplayCountRef.current = 0;
    kokoroLastControllerActionRef.current = 'hold';
    ensureAttemptTelemetry();
    recordKokoroTelemetryAction('play', kokoroSpeechRate);
    setError('');
    setKokoroStatus('playing');
    setRunning(true);
    setSessionStatus('running');
    await playKokoroFromWord(0);
  }

  async function playKokoroFromWord(wordIndex: number): Promise<void> {
    const sourceWords = buildKokoroSourceWords(kokoroText);
    const semanticPhrases =
      kokoroSemanticPhrasesRef.current.length > 0
        ? kokoroSemanticPhrasesRef.current
        : buildSemanticPhrasesForCurrentSession(kokoroText, kokoroLanguage, kokoroPacingMode);
    const currentPhraseIndex = semanticPhraseIndexForWordIndex(semanticPhrases, wordIndex);
    if (kokoroCancelledRef.current) return;
    if (isKokoroLanguageBlocked(kokoroLanguage)) {
      setKokoroServiceReady(false);
      setKokoroStatus(kokoroText.trim() ? 'ready' : 'idle');
      setRunning(false);
      setSessionStatus((current) => (current === 'finished' ? current : 'ready'));
      setError(getKokoroLanguageWarning(kokoroLanguage));
      return;
    }
    if (currentPhraseIndex >= semanticPhrases.length || wordIndex >= sourceWords.length) {
      setKokoroCurrentChunk(null);
      setKokoroStatus('finished');
      setRunning(false);
      setSessionStatus((current) => (current === 'finished' ? current : 'paused'));
      kokoroCompletedSourceWordsRef.current = kokoroTranscript?.words.length ?? kokoroCompletedSourceWordsRef.current;
      kokoroChunkStartMsRef.current = null;
      applyKokoroPerformanceSample();
      return;
    }

    try {
      const historyProfile = getHistoricalPerformanceProfile('kokoro', kokoroLanguage);
      const liveSignal = ttsLiveSignalRef.current;
      const semanticPhrase = semanticPhrases[currentPhraseIndex];
      const phraseStartWordIndex = wordIndexForSemanticPhrase(semanticPhrases, currentPhraseIndex);
      recordPhrasePlaybackEvent('phrase_started', 'kokoro', kokoroLanguage, semanticPhrase, currentPhraseIndex);
      const kokoroTelemetry = buildKokoroTelemetryFrame({
        inputMode: 'kokoro',
        phraseId: `kokoro-${currentPhraseIndex}`,
        spokenProgressRatio: sourceWords.length > 0 ? Math.min(1, phraseStartWordIndex / sourceWords.length) : 0,
        typedProgressRatio: sourceWords.length > 0 ? Math.max(0, kokoroPracticeEvaluation.lastMatchedTargetIndex + 1) / sourceWords.length : 0,
        lagSec: liveSignal.lagSec,
        lagWords: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND)),
        lagChars: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND * 5)),
        accuracy: clamp01(liveSignal.accuracy / 100),
        errorRate: clamp01(1 - liveSignal.accuracy / 100),
        wpm: liveSignal.wpm,
        charsPerMinute: 0,
        pauseMs: ttsPlaybackProfile.pauseMs,
        longestPauseMs: 0,
        backspaceRate: 0,
        correctionRate: 0,
        phraseDifficulty: 1,
        phraseLengthWords: sourceWords.length,
        phraseLengthChars: kokoroText.length,
        currentPlaybackRate: kokoroSpeechRate,
        currentPauseAfterPhraseMs: ttsPlaybackProfile.pauseMs,
        language: kokoroLanguage,
        trend: liveSignal.trend,
      });
      const initialDecision = adaptiveControllerRef.current.decide(buildAdaptiveKokoroInput(kokoroTelemetry, historyProfile));
      const initialPacingMode = mapAdaptivePacingMode(initialDecision.mode);
      const chunk = buildAdaptiveTtsChunk(
        sourceWords,
        phraseStartWordIndex,
        initialPacingMode,
        chunkWordsForPhraseSize(initialDecision.nextPhraseSize),
        kokoroLanguage,
        semanticPhrase,
      );
      const semanticTelemetry = buildKokoroTelemetryFrame({
        inputMode: 'kokoro',
        phraseId: `${kokoroTelemetry.phraseId}-semantic`,
        spokenProgressRatio: sourceWords.length > 0 ? Math.min(1, phraseStartWordIndex / sourceWords.length) : 0,
        typedProgressRatio: sourceWords.length > 0 ? Math.max(0, kokoroPracticeEvaluation.lastMatchedTargetIndex + 1) / sourceWords.length : 0,
        lagSec: liveSignal.lagSec,
        lagWords: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND)),
        lagChars: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND * 5)),
        accuracy: clamp01(liveSignal.accuracy / 100),
        errorRate: clamp01(1 - liveSignal.accuracy / 100),
        wpm: liveSignal.wpm,
        charsPerMinute: 0,
        pauseMs: ttsPlaybackProfile.pauseMs,
        longestPauseMs: 0,
        backspaceRate: 0,
        correctionRate: 0,
        phraseDifficulty: chunk.phraseDifficulty ?? kokoroTelemetry.phraseDifficulty,
        phraseLengthWords: chunk.wordCount,
        phraseLengthChars: chunk.text.length,
        currentPlaybackRate: kokoroSpeechRate,
        currentPauseAfterPhraseMs: ttsPlaybackProfile.pauseMs,
        language: kokoroLanguage,
        trend: liveSignal.trend,
        phraseBoundaryType: chunk.phraseBoundaryType,
        canPauseAfter: chunk.canPauseAfter,
        canReplayIndependently: chunk.canReplayIndependently,
        semanticCompleteness: chunk.semanticCompleteness,
        punctuationLoad: chunk.punctuationLoad,
        rareWordLoad: chunk.rareWordLoad,
        syntaxComplexity: chunk.syntaxComplexity,
      });
      const decision = adaptiveControllerRef.current.decide(buildAdaptiveKokoroInput(semanticTelemetry, historyProfile));
      const pacingMode = mapAdaptivePacingMode(decision.mode);
      const nextRate = decision.playbackRate;
      const pauseAtBoundary = chunk.canPauseAfter ?? true;
      const replayAtBoundary = chunk.canReplayIndependently ?? true;
      const semanticCompleteness = chunk.semanticCompleteness ?? 1;
      const effectivePauseNow = decision.shouldPauseNow && pauseAtBoundary;
      const effectiveReplay = decision.shouldReplayPhrase && replayAtBoundary && semanticCompleteness >= 0.65;
      const generated = await generateKokoroChunk({
        text: chunk.text,
        voice: kokoroVoice.trim() || 'default',
        language: kokoroLanguage,
        baseSpeed: 1,
      });
      const nextChunk: KokoroGeneratedChunk = {
        ...chunk,
        ...generated,
        pacingMode,
        rate: nextRate,
      };

      if (kokoroCancelledRef.current) return;
      kokoroEngineRef.current?.stop();
      kokoroEngineRef.current = new KokoroAudioEngine({
        onEnded: () => {
          recordPhrasePlaybackEvent('phrase_completed', 'kokoro', kokoroLanguage, semanticPhrase, currentPhraseIndex);
          recordKokoroTelemetryAction('phrase_end', nextChunk.rate);
          kokoroCompletedSourceWordsRef.current = nextChunk.startWordIndex + nextChunk.wordCount;
          kokoroChunkIndexRef.current += 1;
          const nextWordIndex = effectiveReplay ? nextChunk.startWordIndex : nextChunk.startWordIndex + nextChunk.wordCount;
          if (effectiveReplay) {
            kokoroSemanticPhraseReplayCountRef.current += 1;
            recordPhrasePlaybackEvent('phrase_replayed', 'kokoro', kokoroLanguage, semanticPhrase, currentPhraseIndex);
          } else {
            kokoroSemanticPhraseAdvanceCountRef.current += 1;
            recordPhrasePlaybackEvent('phrase_advanced', 'kokoro', kokoroLanguage, semanticPhrase, currentPhraseIndex + 1);
          }
          setAdaptiveSemanticDebug((current) => ({
            ...current,
            currentPhraseIndex: effectiveReplay ? currentPhraseIndex : currentPhraseIndex + 1,
            currentPhraseId: effectiveReplay ? (semanticPhrase?.id ?? nextChunk.cacheKey) : (semanticPhrases[currentPhraseIndex + 1]?.id ?? 'complete'),
            currentPhraseTextPreview: effectiveReplay ? nextChunk.text.slice(0, 80) : (semanticPhrases[currentPhraseIndex + 1]?.text.slice(0, 80) ?? ''),
            totalSemanticPhrases: semanticPhrases.length,
            phraseAdvanceCount: kokoroSemanticPhraseAdvanceCountRef.current,
            phraseReplayCount: kokoroSemanticPhraseReplayCountRef.current,
            lastPhraseAdvanceReason: effectiveReplay ? 'replay_same_phrase' : 'phrase_complete',
          }));
          const scheduleNext = () => {
            void playKokoroFromWord(nextWordIndex);
          };
          if (effectivePauseNow) {
            window.setTimeout(scheduleNext, decision.pauseAfterPhraseMs);
          } else {
            scheduleNext();
          }
        },
        onError: () => {
          setKokoroStatus('paused');
          setRunning(false);
          setSessionStatus((current) => (current === 'finished' ? current : 'paused'));
          setError('Kokoro audio playback failed.');
        },
      });

      setKokoroCurrentChunk(nextChunk);
      setKokoroChunks((current) => {
        const existingIndex = current.findIndex((entry) => entry.startWordIndex === nextChunk.startWordIndex);
        if (existingIndex >= 0) {
          const copy = [...current];
          copy[existingIndex] = nextChunk;
          return copy;
        }
        return [...current, nextChunk];
      });
      setKokoroPacingMode(pacingMode);
      setKokoroSpeechRate(nextRate);
      setRate(nextRate);
      setKokoroServiceReady(true);
      kokoroChunkStartMsRef.current = performance.now();
      kokoroChunkStartWordIndexRef.current = nextChunk.startWordIndex;
      kokoroChunkWordCountRef.current = nextChunk.wordCount;
      kokoroCompletedSourceWordsRef.current = nextChunk.startWordIndex;
      recordKokoroTelemetryAction('phrase_start', nextRate);
      recordKokoroChunkTelemetry({
        startWordIndex: nextChunk.startWordIndex,
        wordCount: nextChunk.wordCount,
        rate: nextRate,
        pacingMode,
        cacheKey: nextChunk.cacheKey,
        durationSec: nextChunk.durationSec,
      });
      recordAdaptiveBenchmark(semanticTelemetry, decision, {
        actualPlaybackRate: nextRate,
        actualPauseMs: effectivePauseNow ? decision.pauseAfterPhraseMs : 0,
        replayExecuted: effectiveReplay,
        actualBoundaryType: chunk.phraseBoundaryType,
        event: effectiveReplay ? 'replay' : effectivePauseNow ? 'pause' : decision.deferPauseUntilSafeBoundary ? 'defer_pause' : 'phrase_advance',
        phraseIndex: currentPhraseIndex,
        totalSemanticPhrases: semanticPhrases.length,
      });
      setAdaptiveSemanticDebug((current) => {
        const phraseCount = current.safePauseCount + current.unsafePauseCount + current.deferredPauseCount + 1;
        const avgCompleteness = ((current.averageSemanticCompleteness * (phraseCount - 1)) + semanticCompleteness) / phraseCount;
        const difficulty = chunk.phraseDifficulty ?? 0.5;
        const avgDifficulty = ((current.averagePhraseDifficulty * (phraseCount - 1)) + difficulty) / phraseCount;
        const unsafePauseCount = current.unsafePauseCount + (decision.shouldPauseNow && !pauseAtBoundary ? 1 : 0);
        const safePauseCount = current.safePauseCount + (effectivePauseNow ? 1 : 0);
        const deferredPauseCount = current.deferredPauseCount + (decision.deferPauseUntilSafeBoundary ? 1 : 0);
        const replayDeniedByBoundaryCount = current.replayDeniedByBoundaryCount + (decision.shouldReplayPhrase && !effectiveReplay ? 1 : 0);
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
          currentPhraseIndex,
          currentPhraseId: semanticPhrase?.id ?? `phrase-${currentPhraseIndex}`,
          currentPhraseTextPreview: chunk.text.slice(0, 80),
          totalSemanticPhrases: semanticPhrases.length,
          phraseAdvanceCount: kokoroSemanticPhraseAdvanceCountRef.current,
          phraseReplayCount: kokoroSemanticPhraseReplayCountRef.current,
          lastPhraseAdvanceReason: 'phrase_start',
        };
      });
      kokoroEngineRef.current.load(nextChunk.audioUrl, nextRate);
      await kokoroEngineRef.current.play();
    } catch (e) {
      setKokoroServiceReady(false);
      setKokoroStatus(kokoroText.trim() ? 'ready' : 'idle');
      setRunning(false);
      setSessionStatus((current) => (current === 'finished' ? current : 'ready'));
      setError(e instanceof Error ? e.message : 'Could not generate Kokoro audio.');
    }
  }

  function pauseKokoro(): void {
    kokoroEngineRef.current?.pause();
    recordKokoroTelemetryAction('pause');
    setRunning(false);
    setSessionStatus((current) => (current === 'finished' ? current : 'paused'));
    setKokoroStatus((current) => (current === 'playing' ? 'paused' : current));
  }

  async function resumeKokoro(): Promise<void> {
    if (!kokoroEngineRef.current) return;
    recordKokoroTelemetryAction('resume');
    setRunning(true);
    setSessionStatus((current) => (current === 'finished' ? current : 'running'));
    setKokoroStatus('playing');
    await kokoroEngineRef.current.play();
  }

  function stopKokoroPlayback(action?: ControlAction): void {
    kokoroCancelledRef.current = true;
    if (action) {
      recordKokoroTelemetryAction(action);
    }
    kokoroEngineRef.current?.stop();
    setKokoroCurrentChunk(null);
    setKokoroPacingMode('balanced');
    setRunning(false);
    setSessionStatus((current) => {
      if (current === 'finished') return current;
      return kokoroPracticeText.trim() ? 'paused' : 'ready';
    });
    setKokoroStatus(kokoroText.trim() ? 'ready' : 'idle');
  }

  function replayKokoroPhrase(): void {
    if (!kokoroCurrentChunk) return;
    recordKokoroTelemetryAction('replay_phrase');
    void playKokoroFromWord(kokoroCurrentChunk.startWordIndex);
  }

  function rewindKokoroPhrase(): void {
    recordKokoroTelemetryAction('rewind_phrase');
    kokoroEngineRef.current?.rewind(2);
  }

  function adjustKokoroManualPace(delta: number, action: ControlAction): void {
    const nextBias = clamp(kokoroManualBias + delta, -0.2, 0.2);
    const nextRate = clamp(kokoroSpeechRate + delta, 0.75, 1.15);
    setKokoroManualBias(nextBias);
    setKokoroSpeechRate(nextRate);
    setRate(nextRate);
    kokoroEngineRef.current?.setRate(nextRate);
    recordKokoroTelemetryAction(action, nextRate);
  }

  function resetKokoroPace(): void {
    setKokoroManualBias(0);
    setKokoroSpeechRate(1);
    setRate(1);
    kokoroEngineRef.current?.setRate(1);
    recordKokoroTelemetryAction('reset_pace', 1);
  }

  function submitKokoroSession(latestPracticeText = kokoroPracticeText): void {
    if (!canSubmitKokoroSession || !latestPracticeText.trim()) {
      setError('Paste Kokoro text and type your attempt before submitting.');
      setTrainingSubmitMessage('');
      return;
    }

    if (latestPracticeText !== kokoroPracticeText) {
      kokoroPracticeLiveTextRef.current = latestPracticeText;
      setKokoroPracticeText(latestPracticeText);
    }
    const finalSample = applyKokoroPerformanceSample({ action: 'submit', finalize: true, practiceTextOverride: latestPracticeText });
    const finishedAt = new Date().toISOString();
    const nextSessions = sessions.map((session) =>
      session.id === activeSessionId
        ? {
            ...session,
            kokoroPracticeText: latestPracticeText,
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
    stopKokoroPlayback();
    setRunning(false);
    setSessionStatus('finished');
    setKokoroStatus('finished');
    completeAdaptiveSessionFeedback(finalizedSession);
    setError('');
    if (activeSessionId) {
      setTrainingSubmitMessage(buildTrainingSubmitMessage(nextSessions, activeSessionId));
    }
  }

  function buildAdaptiveEventCounts(
    timelinePoints: AdaptiveTimelinePoint[],
    phraseEvents: PhrasePlaybackEvent[],
  ): Record<string, number> {
    const trackedEvents: Array<string> = [
      'pause',
      'defer_pause',
      'phrase_advance',
      'phrase_completed',
      'rate_change',
      'support_entered',
      'flow_entered',
      'phrase_started',
      'phrase_completed',
    ];
    const counts = Object.fromEntries(trackedEvents.map((event) => [event, 0])) as Record<string, number>;
    for (const point of timelinePoints) {
      const event = point.event;
      if (event && event in counts) counts[event] += 1;
    }
    for (const event of phraseEvents) {
      if (event.event in counts) counts[event.event] += 1;
    }
    return counts;
  }

  function getBenchmarkActiveSessionStatus(profile: InputLanguageBenchmarkMetrics): string | undefined {
    if (!activeSession || activeSessionFinished) return undefined;
    const activeInputMode = mapSessionInputMode(activeSession.inputMode);
    const activeLanguage = normalizeBenchmarkLanguage(getActiveTypingLanguage() ?? resolveStoredSessionLanguage(activeSession));
    if (profile.inputMode !== activeInputMode || profile.language !== activeLanguage) return undefined;
    return sessionStatus;
  }

  async function copySelectedBenchmarkJson(profile: InputLanguageBenchmarkMetrics): Promise<void> {
    try {
      const payload = buildSelectedBenchmarkExportPayload(profile);
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setBenchmarkExportMessage('Benchmark JSON copied.');
    } catch {
      setBenchmarkExportMessage('Could not copy benchmark JSON.');
    }
  }

  function downloadSelectedBenchmarkJson(profile: InputLanguageBenchmarkMetrics): void {
    const payload = buildSelectedBenchmarkExportPayload(profile);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildBenchmarkFilename(profile.inputMode, String(profile.language), new Date());
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setBenchmarkExportMessage('Benchmark JSON exported.');
  }

  async function copyDictationScriptPrompt(profile: InputLanguageBenchmarkMetrics): Promise<void> {
    try {
      await navigator.clipboard.writeText(buildDictationScriptPrompt(profile));
      setExportMessage('LLM prompt copied.');
    } catch {
      setExportMessage('Could not copy LLM prompt.');
    }
  }

  async function copyBenchmarkWithDictationScriptPrompt(profile: InputLanguageBenchmarkMetrics): Promise<void> {
    try {
      const benchmarkJson = JSON.stringify(buildSelectedBenchmarkExportPayload(profile), null, 2);
      const prompt = buildDictationScriptPrompt(profile);
      await navigator.clipboard.writeText(`Benchmark JSON context:\n${benchmarkJson}\n\nLLM prompt:\n${prompt}`);
      setExportMessage('Benchmark JSON and LLM prompt copied.');
    } catch {
      setExportMessage('Could not copy benchmark and LLM prompt.');
    }
  }

  async function copyDictationScriptTemplate(profile: InputLanguageBenchmarkMetrics): Promise<void> {
    try {
      await navigator.clipboard.writeText(buildDictationScriptTemplate(profile.inputMode, profile.language));
      setExportMessage('Sample output template copied.');
    } catch {
      setExportMessage('Could not copy sample output template.');
    }
  }

  async function copySessionFeedbackJson(profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null): Promise<void> {
    try {
      const latestFinishedSession = buildLatestFinishedSessionFeedbackReference(sessions, profile);
      await navigator.clipboard.writeText(JSON.stringify(buildSessionFeedbackJsonPayload(profile.inputMode, profile.language, feedback, {
        activeSessionStatus: getBenchmarkActiveSessionStatus(profile),
        fallbackDiagnostics: derivePlaybackDiagnosticsFromTimeline(profile.timeline.slice(-60)),
        latestFinishedSession,
      }), null, 2));
      setSessionFeedbackMessage('Session feedback JSON copied.');
    } catch {
      setSessionFeedbackMessage('Could not copy session feedback JSON.');
    }
  }

  async function copyBenchmarkFeedbackJson(profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null): Promise<void> {
    try {
      const latestFinishedSession = buildLatestFinishedSessionFeedbackReference(sessions, profile);
      await navigator.clipboard.writeText(JSON.stringify(buildBenchmarkFeedbackPackage(profile, feedback, {
        activeSessionStatus: getBenchmarkActiveSessionStatus(profile),
        activitySummary: buildBenchmarkActivitySummary(sessions, profile),
        latestFinishedSession,
      }), null, 2));
      setSessionFeedbackMessage('Benchmark + feedback package copied.');
    } catch {
      setSessionFeedbackMessage('Could not copy benchmark + feedback package.');
    }
  }

  async function copyInsightsDiagnosticPackage(): Promise<void> {
    try {
      const latestFinishedSession = buildLatestFinishedSessionFeedbackReference(sessions, insightsDiagnosticProfile);
      const latestFinishedFullSession = findLatestFinishedSessionForProfile(sessions, insightsDiagnosticProfile);
      const technicalDebugData = buildBenchmarkFeedbackPackage(insightsDiagnosticProfile, insightsDiagnosticFeedback, {
        activeSessionStatus: getBenchmarkActiveSessionStatus(insightsDiagnosticProfile),
        activitySummary: buildBenchmarkActivitySummary(sessions, insightsDiagnosticProfile),
        latestFinishedSession,
      });
      const report = buildAdaptiveUserSystemReport({
        profile: insightsDiagnosticProfile,
        feedback: insightsDiagnosticFeedback,
        technicalDebugData,
        inputModeLabel: formatInputModeLabel(insightsDiagnosticInputMode),
        languageLabel: metricsLanguageView.toUpperCase(),
        latestSession: latestFinishedFullSession
          ? {
              ...latestFinishedFullSession,
              inputModeLabel: formatSessionInputMode(latestFinishedFullSession.inputMode),
              language: String(resolveStoredSessionLanguage(latestFinishedFullSession)),
              durationLabel: formatSessionPlaybackDuration(latestFinishedFullSession),
            }
          : null,
      });
      const reportJson = JSON.stringify(report, null, 2);
      const copied = await writeTextToClipboard(reportJson);
      if (copied) {
        setInsightsDiagnosticFallbackReport('');
        setInsightsDiagnosticMessage(
          `Copied adaptive user/system report for ${formatInputModeLabel(insightsDiagnosticInputMode)} / ${metricsLanguageView.toUpperCase()}.`,
        );
        return;
      }

      setInsightsDiagnosticFallbackReport(reportJson);
      setInsightsDiagnosticMessage('Clipboard access is blocked. Report generated below; select it and press Ctrl+C.');
      window.setTimeout(selectInsightsDiagnosticFallbackReport, 0);
    } catch (error) {
      console.error('Copy insights report failed.', error);
      const message = error instanceof Error ? error.message : String(error);
      setInsightsDiagnosticFallbackReport('');
      setInsightsDiagnosticMessage(`Could not prepare the insights report. ${message}`);
    }
  }

  function selectInsightsDiagnosticFallbackReport(): void {
    const textarea = document.getElementById('insights-diagnostic-fallback-report') as HTMLTextAreaElement | null;
    if (!textarea) return;
    textarea.focus();
    textarea.select();
  }

  async function copyBenchmarkFeedbackPrompt(profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null): Promise<void> {
    try {
      const latestFinishedSession = buildLatestFinishedSessionFeedbackReference(sessions, profile);
      await navigator.clipboard.writeText(buildBenchmarkFeedbackPromptPackage(profile, feedback, buildDictationScriptPrompt(profile), {
        activeSessionStatus: getBenchmarkActiveSessionStatus(profile),
        activitySummary: buildBenchmarkActivitySummary(sessions, profile),
        latestFinishedSession,
      }));
      setSessionFeedbackMessage('Benchmark + feedback + LLM prompt copied.');
    } catch {
      setSessionFeedbackMessage('Could not copy benchmark + feedback + LLM prompt.');
    }
  }

  async function copyBenchmarkFeedbackPromptWithHumanFeedback(
    profile: InputLanguageBenchmarkMetrics,
    feedback: AdaptiveSessionFeedback | null,
    humanFeedback: string,
  ): Promise<void> {
    try {
      const latestFinishedSession = buildLatestFinishedSessionFeedbackReference(sessions, profile);
      const base = buildBenchmarkFeedbackPackage(profile, feedback, {
        activeSessionStatus: getBenchmarkActiveSessionStatus(profile),
        activitySummary: buildBenchmarkActivitySummary(sessions, profile),
        latestFinishedSession,
      }) as Record<string, unknown>;
      const payload = {
        ...base,
        llmPrompt: buildDictationScriptPrompt(profile),
        humanFeedback: humanFeedback.trim(),
      };
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setSessionFeedbackMessage('Copied JSON Benchmark + Feedback + LLM Prompt + Human feedback');
    } catch {
      setSessionFeedbackMessage('Could not copy benchmark + feedback + LLM prompt + human feedback.');
    }
  }

  const {
    inputSettingsReady,
    setupLocked,
    canSubmitTtsSession,
    canSubmitKokoroSession,
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
      kokoroHasText,
      kokoroStatus,
      inputSettingsLocked,
    },
    text: {
      ttsPracticeText,
      kokoroPracticeText,
    },
    actions: {
      resetSession,
      playTts,
      resumeTts,
      pauseTts,
      stopTts: stopTtsPlayback,
      onTtsPracticeChange,
      submitTtsSession,
      playKokoro,
      resumeKokoro,
      pauseKokoro,
      stopKokoro: stopKokoroPlayback,
      onKokoroPracticeChange,
      submitKokoroSession,
      setInputSettingsLocked,
      setError,
      setExportMessage,
      collapseSetupPanels: () => {
        setTtsExpanded(false);
        setQwenExpanded(false);
        setKokoroExpanded(false);
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
  const kokoroPlayerWordCount = kokoroTranscript?.words.length ?? 0;
  const kokoroPlayerCurrentWord = kokoroHasText ? estimateKokoroSpokenWordIndex() : 0;
  const kokoroPlayerWordsPerSecond = Math.max(1, TTS_BASE_WORDS_PER_SECOND * kokoroSpeechRate);
  const kokoroPlayerDurationSec = kokoroPlayerWordCount > 0 ? kokoroPlayerWordCount / kokoroPlayerWordsPerSecond : 0;
  const kokoroPlayerCurrentSec =
    kokoroPlayerWordCount > 0
      ? Math.min(kokoroPlayerDurationSec, (kokoroPlayerCurrentWord / kokoroPlayerWordCount) * kokoroPlayerDurationSec)
      : 0;
  const kokoroPlayerProgressPercent =
    kokoroPlayerDurationSec > 0 ? clamp((kokoroPlayerCurrentSec / kokoroPlayerDurationSec) * 100, 0, 100) : 0;
  void ttsPlayerProgressTick;
  void kokoroPlayerProgressTick;
  const sessionCreationNameTrimmed = sessionCreationName.trim();
  const canCreateSessionFromDialog = sessionCreationNameTrimmed.length > 0 && !sessionQuotaStatus.blocked;
  const validatedDictationScript = dictationScriptValidation?.ok ? dictationScriptValidation.script : null;
  const lockedInputSummaryItems: LockedInputSummaryItem[] =
    activeInputMode === 'input2'
        ? [
            { label: 'Source', value: ttsHasText ? `${ttsTranscript?.words.length ?? 0} words` : 'Not set' },
            { label: 'Text length', value: ttsHasText ? `${ttsText.length} chars` : 'Not set' },
            { label: 'Language', value: ttsLanguage ?? 'Not set' },
            { label: 'Pacing', value: formatTtsPacingMode(ttsPacingMode) },
            { label: 'Engine', value: 'Browser TTS' },
            { label: 'Status', value: ttsStatus },
          ]
        : activeInputMode === 'input4'
          ? [
              { label: 'Source', value: ttsHasText ? `${ttsTranscript?.words.length ?? 0} words` : 'Not set' },
              { label: 'Text length', value: ttsHasText ? `${ttsText.length} chars` : 'Not set' },
              { label: 'Language', value: ttsLanguage ?? 'Not set' },
              { label: 'Pacing', value: formatTtsPacingMode(ttsPacingMode) },
              { label: 'Cache', value: qwenCloudFallbackDetails ? 'Missing cached phrase' : 'CosyVoice cache' },
              { label: 'Status', value: ttsStatus },
            ]
          : [
              { label: 'Source', value: kokoroHasText ? `${kokoroTranscript?.words.length ?? 0} words` : 'Not set' },
              { label: 'Text length', value: kokoroHasText ? `${kokoroText.length} chars` : 'Not set' },
              { label: 'Language', value: kokoroLanguage ?? 'Not set' },
              { label: 'Native support', value: isKokoroLanguageBlocked(kokoroLanguage) ? 'Experimental / not native' : 'Native' },
              { label: 'Voice', value: kokoroVoice.trim() || 'default' },
              { label: 'Service', value: kokoroServiceReady === false ? 'Offline' : kokoroServiceReady ? 'Ready' : 'Not checked' },
            ];
  const lockedInputSummary = setupLocked ? (
    <LockedInputSetupSummary
      inputLabel={activeInputLabel}
      featureLabel={activeInputFeatureLabel}
      items={lockedInputSummaryItems}
      warning={activeInputMode === 'input3' ? kokoroLanguageWarning : ''}
    />
  ) : null;
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
  const repeatWordStats = useMemo(
    () => buildRepeatWordStats({ sessions, inputMode: selectedBenchmarkInputMode, language: selectedBenchmarkLanguage, now: new Date() }),
    [sessions, selectedBenchmarkInputMode, selectedBenchmarkLanguage],
  );
  const latestAdaptiveMode = latestSession ? formatAdaptiveModeFromSession(latestSession) : 'Balanced';
  const latestInputAdapter = latestSession ? adaptiveAdapters.find((adapter) => adapter.inputMode === latestSession.inputMode) ?? null : null;
  const insightsDiagnosticInputOptions: Array<{ inputMode: InputMode; label: string }> = [
    { inputMode: 'browser-tts', label: 'Input 2' },
    { inputMode: 'kokoro', label: 'Input 3' },
    { inputMode: COSYVOICE_CACHE_INPUT_MODE, label: 'Input 4' },
  ];
  const isFocusedTrainingRoute = currentPath === '/training' || currentPath === '/training/';
  const focusedProgressLabel =
    activeInputMode === 'input3'
        ? adaptiveSemanticDebug.totalSemanticPhrases > 0
          ? `Phrase ${Math.min(adaptiveSemanticDebug.currentPhraseIndex + 1, adaptiveSemanticDebug.totalSemanticPhrases)}/${adaptiveSemanticDebug.totalSemanticPhrases}`
          : kokoroPlayerWordCount > 0
            ? `Word ${Math.min(kokoroPlayerCurrentWord, kokoroPlayerWordCount)}/${kokoroPlayerWordCount}`
            : 'No source loaded'
        : adaptiveSemanticDebug.totalSemanticPhrases > 0
          ? `Phrase ${Math.min(adaptiveSemanticDebug.currentPhraseIndex + 1, adaptiveSemanticDebug.totalSemanticPhrases)}/${adaptiveSemanticDebug.totalSemanticPhrases}`
          : ttsPlayerWordCount > 0
            ? `Word ${Math.min(ttsPlayerCurrentWord, ttsPlayerWordCount)}/${ttsPlayerWordCount}`
            : 'No source loaded';
  const focusedSourceLabel =
    activeInputMode === 'input3'
        ? kokoroHasText
          ? `${kokoroTranscript?.words.length ?? 0} words · ${kokoroLanguage?.toUpperCase()}`
          : 'Kokoro source not loaded'
        : ttsHasText
          ? `${ttsTranscript?.words.length ?? 0} words · ${ttsLanguage?.toUpperCase()}`
          : 'TTS source not loaded';
  const focusedTextValue =
    activeInputMode === 'input3'
        ? kokoroPracticeText
        : ttsPracticeText;
  const focusedTextPlaceholder =
    activeSessionFinished
      ? 'Session submitted.'
      : 'Type the dictation here...';
  const focusedInputHandler =
    activeInputMode === 'input3'
        ? onKokoroPracticeChange
        : onTtsPracticeChange;
  const focusedImmediateInputHandler =
    activeInputMode === 'input3'
        ? (value: string) => {
            kokoroPracticeLiveTextRef.current = value;
          }
        : (value: string) => {
            if (!telemetryRef.current || !telemetryRef.current.startedAt) {
              telemetryRef.current = { ...cloneTelemetry(telemetryRef.current), startedAt: new Date().toISOString() };
            }
            if (ttsStartedAtMsRef.current === null) {
              ttsStartedAtMsRef.current = performance.now();
            }
            ttsPracticeLiveTextRef.current = value;
          };
  const focusedKeyDownHandler =
    activeInputMode === 'input3'
        ? onKokoroPracticeKeyDown
        : onTtsPracticeKeyDown;
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
    statusLabel:
      activeInputMode === 'input3'
        ? kokoroStatus
        : ttsStatus,
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
    canReplay:
      activeInputMode === 'input3'
          ? Boolean(kokoroCurrentChunk)
          : ttsHasText && ttsPlayerDurationSec > 0,
    onReplay:
      activeInputMode === 'input3'
          ? replayKokoroPhrase
          : replayFocusedTts,
    canStop: focusedTrainingControls.canStop,
    onStop: focusedTrainingControls.onStop,
    canReset: focusedTrainingControls.canReset,
    onReset: focusedTrainingControls.onReset,
    canSubmit: focusedTrainingControls.canSubmit,
    onSubmit: focusedTrainingControls.onSubmit,
    submitLabel: focusedTrainingControls.submitLabel,
    message: focusedTrainingMessage,
    messageTone: focusedTrainingMessageTone,
    textCommitDelayMs: activeInputMode === 'input2' || activeInputMode === 'input4' ? 250 : 0,
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

  void toggleKokoroEnabled;
  void ttsPracticeMissing;
  void kokoroPracticeMissing;
  void openAdaptiveExportsForActiveInput;
  void keyboardProfileLabel;
  void rewindKokoroPhrase;
  void adjustKokoroManualPace;
  void resetKokoroPace;
  void canSubmitTtsSession;
  void kokoroPlayerProgressPercent;
  void lockedInputSummary;

  void HelpIcon;
  void RuntimeMetricsPanel;

  const appShellOpenRouterModel = effectiveOpenRouterDefaultModel.trim();
  const appShellSyncStatusText = `${isOnline ? 'Sync' : 'Offline'}: ${isOnline ? formatSupabaseSyncState(supabaseSyncStatus) : 'Saved locally'}${
    supabaseSyncStatus.lastSyncedAt ? ` · ${formatSessionDate(supabaseSyncStatus.lastSyncedAt)}` : ''
  }${supabaseSyncStatus.enabled && pendingSyncSummary.hasPending ? ` · ${pendingSyncSummary.count} pending` : ''}`;

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
          showAdminButton={isDictaAdmin(appProfile) || !syncConfig.authRequired}
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
              activeInputMode === 'input2' ? (
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
              ) : activeInputMode === 'input4' ? (
                <Input4SetupCard
                  activeInputLabel={activeInputLabel}
                  activeInputFeatureLabel={activeInputFeatureLabel}
                  qwenExpanded={qwenExpanded}
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
                  localDevFeaturesAvailable={LOCAL_DEV_FEATURES_AVAILABLE}
                  cosyVoiceCacheReady={cosyVoiceCacheReady}
                  cosyVoiceCacheConfigured={cosyVoiceCacheConfigured}
                  cosyVoiceCacheRuntime={cosyVoiceCacheRuntime}
                  cosyVoiceCacheGenerating={cosyVoiceCacheGenerating}
                  cosyVoiceCacheMessage={cosyVoiceCacheMessage}
                  qwenCloudManifestMessage={qwenCloudManifestMessage}
                  qwenCloudFallbackDetails={qwenCloudFallbackDetails}
                  onToggleExpanded={() => setQwenExpanded((value) => !value)}
                  onTtsTextChange={onTtsTextChange}
                  onTtsLanguageChange={setTtsLanguage}
                  onBootstrapCosyVoiceSidecar={() => void bootstrapCosyVoiceSidecar()}
                  onEnsureCosyVoiceCacheSidecar={() => void ensureCosyVoiceCacheSidecar()}
                  onGenerateCosyVoiceCacheFromCurrentText={() => void generateCosyVoiceCacheFromCurrentText()}
                  onCopyQwenCloudCacheManifest={copyQwenCloudCacheManifest}
                  onDownloadQwenCloudCacheManifest={downloadQwenCloudCacheManifest}
                  onLockInputSettings={lockInputSettings}
                  onFallbackToBrowserTtsFromQwen={fallbackToBrowserTtsFromQwen}
                  formatTtsPacingMode={formatTtsPacingMode}
                />
              ) : (
                <KokoroSetupCard
                  activeInputLabel={activeInputLabel}
                  activeInputFeatureLabel={activeInputFeatureLabel}
                  kokoroExpanded={kokoroExpanded}
                  kokoroHasText={kokoroHasText}
                  kokoroText={kokoroText}
                  kokoroLanguage={kokoroLanguage}
                  kokoroVoice={kokoroVoice}
                  kokoroStatus={kokoroStatus}
                  kokoroSpeechRate={kokoroSpeechRate}
                  kokoroServiceReady={kokoroServiceReady}
                  supportedLanguages={SUPPORTED_LANGUAGES}
                  setupLocked={setupLocked}
                  inputSettingsReady={inputSettingsReady}
                  localDevFeaturesAvailable={LOCAL_DEV_FEATURES_AVAILABLE}
                  kokoroLanguageWarning={kokoroLanguageWarning}
                  error={error}
                  onToggleExpanded={() => setKokoroExpanded((value) => !value)}
                  onKokoroTextChange={onKokoroTextChange}
                  onKokoroLanguageChange={setKokoroLanguage}
                  onKokoroVoiceChange={setKokoroVoice}
                  onLockInputSettings={lockInputSettings}
                  formatSupportedLanguage={formatSupportedLanguage}
                  isKokoroLanguageBlocked={isKokoroLanguageBlocked}
                />
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
                  window.localStorage.setItem(OPENROUTER_DEFAULT_MODEL_STORAGE_KEY, JSON.stringify(value));
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
                  window.localStorage.setItem(OLLAMA_DEFAULT_MODEL_STORAGE_KEY, JSON.stringify(nextModel));
                }}
                onRefreshModels={refreshOllamaModels}
                onBackToTraining={showLeaderboardWorkspace}
              />
            ) : workspaceMode === 'admin' ? (
              isDictaAdmin(appProfile) || !syncConfig.authRequired ? <AdminWorkspace
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
                <p className="hint">Choose Browser TTS, Kokoro, or CosyVoice cache to train.</p>
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
        hasKokoroCurrentChunk={Boolean(kokoroCurrentChunk)}
        kokoroPacingMode={kokoroPacingMode}
        kokoroStatus={kokoroStatus}
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

function AdminWorkspace({
  sessions,
  summary,
  fileInventory,
  fileInventoryError,
  exportMessage,
  syncStatus,
  languageView,
  onChangeLanguage,
  onBackToTraining,
  onCopyLocalStorage,
  onExportLocalStorage,
  onImportLocalStorage,
  onExportSession,
  onCopySession,
  appProfile,
  visibleProfiles,
  selectedProfileFilter,
  onChangeProfileFilter,
  onUpdateProfileAccess,
  authHeaders,
  remoteAdminStatus,
  openRouterModels,
  openRouterModelStatus,
  openRouterModelError,
  onRefreshOpenRouterModels,
}: {
  sessions: StoredSession[];
  summary: AdminStorageSummary;
  fileInventory: AdminFileInventory | null;
  fileInventoryError: string;
  exportMessage: string;
  syncStatus: SupabaseSyncStatus;
  languageView: MetricsLanguageView;
  onChangeLanguage: (value: MetricsLanguageView) => void;
  onBackToTraining: () => void;
  onCopyLocalStorage: () => void;
  onExportLocalStorage: () => void;
  onImportLocalStorage: (rawJson: string) => void;
  onExportSession: (session: StoredSession) => void;
  onCopySession: (session: StoredSession) => void;
  appProfile: DictaAppProfile | null;
  visibleProfiles: DictaAppProfile[];
  selectedProfileFilter: string;
  onChangeProfileFilter: (value: string) => void;
  onUpdateProfileAccess: (
    profile: DictaAppProfile,
    patch: { canAccessOpenRouter: boolean; assignedOpenRouterModel: string; sessionLimit: number },
  ) => Promise<DictaAppProfile>;
  authHeaders: Record<string, string>;
  remoteAdminStatus: string;
  openRouterModels: OpenRouterModelSummary[];
  openRouterModelStatus: 'idle' | 'loading' | 'ready' | 'error';
  openRouterModelError: string;
  onRefreshOpenRouterModels: () => Promise<void>;
}) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserProfileId, setNewUserProfileId] = useState('');
  const [newUserRole, setNewUserRole] = useState<DictaAppRole>('member');
  const [newUserMessage, setNewUserMessage] = useState('');
  const [newUserBusy, setNewUserBusy] = useState(false);
  const [accessDrafts, setAccessDrafts] = useState<Record<string, { canAccessOpenRouter: boolean; assignedOpenRouterModel: string; sessionLimit: string }>>({});
  const [accessBusyProfileId, setAccessBusyProfileId] = useState('');
  const [accessMessage, setAccessMessage] = useState('');
  const memberProfiles = visibleProfiles.filter((profile) => profile.role === 'member');
  const memberModelOptions = buildOpenRouterModelOptions(openRouterModels, memberProfiles.map((profile) => profile.assignedOpenRouterModel));

  useEffect(() => {
    setAccessDrafts((current) => {
      const next = { ...current };
      for (const profile of visibleProfiles) {
        if (profile.role !== 'member') continue;
        if (!next[profile.profileId]) {
          next[profile.profileId] = {
            canAccessOpenRouter: profile.canAccessOpenRouter,
            assignedOpenRouterModel: profile.assignedOpenRouterModel ?? '',
            sessionLimit: String(profile.sessionLimit ?? 15),
          };
        }
      }
      return next;
    });
  }, [visibleProfiles]);

  async function onImportFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    onImportLocalStorage(await file.text());
  }

  async function createDictaUser(): Promise<void> {
    setNewUserBusy(true);
    setNewUserMessage('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          displayName: newUserDisplayName,
          profileId: newUserProfileId,
          role: newUserRole,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `User creation failed (${response.status}).`);
      }
      const payload = (await response.json()) as { displayName?: string; profileId?: string };
      setNewUserMessage(`Created ${payload.displayName ?? newUserEmail} · profile ${payload.profileId ?? newUserProfileId}. Refresh Admin to see the profile list.`);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserDisplayName('');
      setNewUserProfileId('');
      setNewUserRole('member');
    } catch (error) {
      setNewUserMessage(error instanceof Error ? error.message : 'User creation failed.');
    } finally {
      setNewUserBusy(false);
    }
  }

  async function saveProfileAccess(profile: DictaAppProfile): Promise<void> {
    const draft = accessDrafts[profile.profileId] ?? {
      canAccessOpenRouter: profile.canAccessOpenRouter,
      assignedOpenRouterModel: profile.assignedOpenRouterModel ?? '',
      sessionLimit: String(profile.sessionLimit ?? 15),
    };
    const sessionLimitNumber = Number(draft.sessionLimit);
    if (!Number.isFinite(sessionLimitNumber) || sessionLimitNumber < 0) {
      setAccessMessage('Session limit must be zero or higher.');
      return;
    }
    setAccessBusyProfileId(profile.profileId);
    setAccessMessage('');
    try {
      const updated = await onUpdateProfileAccess(profile, {
        canAccessOpenRouter: draft.canAccessOpenRouter,
        assignedOpenRouterModel: draft.assignedOpenRouterModel.trim(),
        sessionLimit: Math.floor(sessionLimitNumber),
      });
      setAccessDrafts((current) => ({
        ...current,
        [updated.profileId]: {
          canAccessOpenRouter: updated.canAccessOpenRouter,
          assignedOpenRouterModel: updated.assignedOpenRouterModel ?? '',
          sessionLimit: String(updated.sessionLimit ?? 15),
        },
      }));
      setAccessMessage(`Updated ${updated.displayName}.`);
    } catch (error) {
      setAccessMessage(error instanceof Error ? error.message : 'Profile access update failed.');
    } finally {
      setAccessBusyProfileId('');
    }
  }

  function updateAccessDraft(
    profileId: string,
    draft: { canAccessOpenRouter: boolean; assignedOpenRouterModel: string; sessionLimit: string },
  ): void {
    setAccessDrafts((current) => ({
      ...current,
      [profileId]: draft,
    }));
  }

  return (
    <section className="panel workspace-panel admin-workspace">
      <AdminHeader
        appProfile={appProfile}
        languageView={languageView}
        onChangeLanguage={onChangeLanguage}
        onBackToTraining={onBackToTraining}
      />

      {exportMessage ? <p className="success">{exportMessage}</p> : null}

      <AdminKpiGrid summary={summary} syncStatus={syncStatus} />

      <div className="admin-grid">
        <AdminUsersCard
          visibleProfiles={visibleProfiles}
          selectedProfileFilter={selectedProfileFilter}
          onChangeProfileFilter={onChangeProfileFilter}
          remoteAdminStatus={remoteAdminStatus}
        />

        <AdminMemberAccessCard
          memberProfiles={memberProfiles}
          accessDrafts={accessDrafts}
          accessBusyProfileId={accessBusyProfileId}
          accessMessage={accessMessage}
          memberModelOptions={memberModelOptions}
          openRouterModels={openRouterModels}
          openRouterModelStatus={openRouterModelStatus}
          openRouterModelError={openRouterModelError}
          onRefreshOpenRouterModels={onRefreshOpenRouterModels}
          onChangeAccessDraft={updateAccessDraft}
          onSaveProfileAccess={saveProfileAccess}
        />

        <AdminCreateUserCard
          newUserEmail={newUserEmail}
          newUserPassword={newUserPassword}
          newUserDisplayName={newUserDisplayName}
          newUserProfileId={newUserProfileId}
          newUserRole={newUserRole}
          newUserMessage={newUserMessage}
          newUserBusy={newUserBusy}
          onChangeNewUserEmail={setNewUserEmail}
          onChangeNewUserPassword={setNewUserPassword}
          onChangeNewUserDisplayName={setNewUserDisplayName}
          onChangeNewUserProfileId={setNewUserProfileId}
          onChangeNewUserRole={setNewUserRole}
          onCreateUser={() => void createDictaUser()}
        />

        <AdminBrowserStorageCard
          localStorageEntries={summary.localStorageEntries}
          syncStatus={syncStatus}
          importInputRef={importInputRef}
          onCopyLocalStorage={onCopyLocalStorage}
          onExportLocalStorage={onExportLocalStorage}
          onImportFileChange={onImportFileChange}
        />

        <AdminProjectFilesCard
          fileInventory={fileInventory}
          fileInventoryError={fileInventoryError}
        />
      </div>

        <AdminSessionInventoryCard
          sessions={sessions}
          languageView={languageView}
          onExportSession={onExportSession}
          onCopySession={onCopySession}
        />
    </section>
  );
}

function HelpIcon({ tooltip, ariaLabel = 'Help' }: { tooltip: string; ariaLabel?: string }) {
  return (
    <button
      type="button"
      className="help-icon"
      aria-label={ariaLabel}
      data-tooltip={tooltip}
      onClick={(event) => event.preventDefault()}
    >
      ?
    </button>
  );
}

function Metric({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="metric" title={title} aria-label={title ? `${label}: ${value}. ${title}` : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LockedInputSetupSummary({
  inputLabel,
  featureLabel,
  items,
  warning,
}: {
  inputLabel: string;
  featureLabel: string;
  items: LockedInputSummaryItem[];
  warning?: string;
}) {
  return (
    <section className="locked-input-summary" aria-label="Locked input setup">
      <div className="locked-input-summary-header">
        <div>
          <p className="dashboard-eyebrow">Locked input setup</p>
          <h3>{inputLabel}</h3>
          {featureLabel ? <p className="dashboard-meta">{featureLabel}</p> : null}
        </div>
        <span className="locked-input-status">Locked</span>
      </div>
      <div className="locked-input-summary-grid">
        {items.map((item) => (
          <Metric key={item.label} label={item.label} value={item.value || 'Not set'} />
        ))}
      </div>
      {warning ? <p className="error locked-input-warning">{warning}</p> : null}
    </section>
  );
}

function RuntimeMetricsPanel({
  controllerState,
  rate,
  lagSec,
  lagWords,
  wpm,
  accuracy,
}: {
  controllerState: ControlAction;
  rate: number;
  lagSec: number;
  lagWords: number;
  wpm: number;
  accuracy: number;
}) {
  return (
    <section className="runtime-metrics-panel" aria-label="Runtime metrics">
      <div className="bottom-summary-header">
        <h3>Runtime</h3>
      </div>
      <div className="runtime-metrics-grid">
        <Metric label="Controller" value={controllerState} />
        <Metric label="Rate" value={`${rate.toFixed(2)}x`} />
        <Metric label="Lag (sec)" value={lagSec.toFixed(2)} />
        <Metric label="Lag (words)" value={String(lagWords)} />
        <Metric label="WPM" value={wpm.toFixed(1)} />
        <Metric label="Accuracy" value={`${accuracy.toFixed(1)}%`} />
      </div>
    </section>
  );
}

function formatDuration(seconds: number): string {
  const roundedSeconds = Math.max(0, Math.round(seconds));
  if (roundedSeconds < 60) return `${roundedSeconds}s`;
  const minutes = Math.floor(roundedSeconds / 60);
  const remaining = roundedSeconds % 60;
  return `${minutes}m ${remaining}s`;
}

function formatSupabaseSyncState(status: SupabaseSyncStatus): string {
  if (!status.enabled) return 'Off';
  if (status.state === 'pulling') return 'Pulling';
  if (status.state === 'pushing') return 'Pushing';
  if (status.state === 'error') return 'Error';
  if (status.state === 'synced') return 'Synced';
  return 'Ready';
}

function countLocalChangesPendingSync({
  sessions,
  benchmarks,
  feedback,
  lastSyncedAt,
}: {
  sessions: StoredSession[];
  benchmarks: AdaptiveBenchmarksByInputLanguage;
  feedback: AdaptiveSessionFeedbackByInputLanguage;
  lastSyncedAt: string | null;
}): PendingSyncSummary {
  if (!lastSyncedAt) {
    const totalFeedback = Object.values(feedback).reduce(
      (inputTotal, byLanguage) => inputTotal + Object.values(byLanguage).reduce((languageTotal, list) => languageTotal + list.length, 0),
      0,
    );
    const totalBenchmarks = Object.values(benchmarks).reduce(
      (inputTotal, byLanguage) => inputTotal + Object.keys(byLanguage).length,
      0,
    );
    const count = sessions.length + totalBenchmarks + totalFeedback;
    return { count, hasPending: count > 0 };
  }

  const lastSyncedTime = new Date(lastSyncedAt).getTime();
  if (!Number.isFinite(lastSyncedTime)) return { count: 0, hasPending: false };

  let count = sessions.filter((session) => isTimestampAfterSync(session.updatedAt, lastSyncedTime)).length;
  for (const byLanguage of Object.values(benchmarks)) {
    for (const benchmark of Object.values(byLanguage)) {
      if (isTimestampAfterSync(benchmark.lastUpdatedAt, lastSyncedTime)) count += 1;
    }
  }
  for (const byLanguage of Object.values(feedback)) {
    for (const list of Object.values(byLanguage)) {
      count += list.filter((item) => isTimestampAfterSync(item.completedAt ?? item.createdAt, lastSyncedTime)).length;
    }
  }
  return { count, hasPending: count > 0 };
}

function isTimestampAfterSync(value: string | null | undefined, lastSyncedTime: number): boolean {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time > lastSyncedTime;
}

function buildAdminStorageSummary(sessions: StoredSession[]): AdminStorageSummary {
  const localStorageEntries = getDictaLocalStorageEntries();
  const inputModeCounts = sessions.reduce<Record<SessionInputMode, number>>(
    (counts, session) => {
      counts[session.inputMode] += 1;
      return counts;
    },
    { input2: 0, input3: 0, input4: 0 },
  );

  return {
    sessionCount: sessions.length,
    finishedSessions: sessions.filter((session) => session.status === 'finished').length,
    inputModeCounts,
    localStorageEntries,
    dictaLocalStorageBytes: localStorageEntries.reduce((sum, entry) => sum + entry.bytes, 0),
    ttsTextChars: sessions.reduce((sum, session) => sum + session.ttsText.length, 0),
    kokoroTextChars: sessions.reduce((sum, session) => sum + session.kokoroText.length, 0),
    typedTextChars: sessions.reduce((sum, session) => sum + session.ttsPracticeText.length + session.kokoroPracticeText.length, 0),
    telemetrySamples: sessions.reduce((sum, session) => sum + countTelemetrySamples(session.telemetry), 0),
    telemetryActions: sessions.reduce((sum, session) => sum + session.telemetry.actions.length, 0),
    ttsChunks: sessions.reduce((sum, session) => sum + session.telemetry.ttsChunks.length + session.kokoroChunks.length, 0),
  };
}

function buildCurrentSyncState(
  sessions: StoredSession[],
  benchmarks: AdaptiveBenchmarksByInputLanguage,
  feedback: AdaptiveSessionFeedbackByInputLanguage,
): DictaSyncState {
  return {
    sessions: sessions.map((session) => normalizeSessionForPersistence(session)),
    benchmarks,
    feedback,
  };
}

function asAdminRemoteStoredSession(value: unknown): StoredSession | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Partial<StoredSession> & { deleted?: boolean };
  if (record.deleted === true || typeof record.id !== 'string') return null;
  const inputMode = coerceSessionInputMode(record.inputMode);
  if (!inputMode) return null;
  const scriptResult = validateDictationScript(record.dictationScript);
  return normalizeRestoredStoredSession({
    id: record.id,
    name: record.name ?? 'Remote session',
    createdAt: record.createdAt ?? new Date(0).toISOString(),
    updatedAt: record.updatedAt ?? new Date(0).toISOString(),
    inputMode,
    inputSettingsLocked: Boolean(record.inputSettingsLocked),
    ttsText: record.ttsText ?? '',
    ttsLanguage: isSupportedLanguage(record.ttsLanguage) ? record.ttsLanguage : null,
    ttsVoiceURI: inputMode === 'input2' && typeof record.ttsVoiceURI === 'string' ? record.ttsVoiceURI : null,
    ttsEnvironment: inputMode === 'input2' ? normalizeBrowserTtsEnvironmentFingerprint(record.ttsEnvironment) : undefined,
    ttsPracticeText: record.ttsPracticeText ?? '',
    kokoroText: record.kokoroText ?? '',
    kokoroLanguage: isSupportedLanguage(record.kokoroLanguage) ? record.kokoroLanguage : null,
    kokoroVoice: record.kokoroVoice ?? 'default',
    kokoroPracticeText: record.kokoroPracticeText ?? '',
    kokoroChunks: record.kokoroChunks ?? [],
    difficulty: record.difficulty ?? 'normal',
    status: normalizeRestoredSessionStatus(isSessionStatus(record.status) ? record.status : 'ready', cloneTelemetry(record.telemetry)),
    metrics: {
      ...createDefaultMetrics(),
      ...record.metrics,
    },
    telemetry: cloneTelemetry(record.telemetry),
    sessionSource: record.sessionSource === 'dictationScript' && scriptResult.ok ? 'dictationScript' : 'plainText',
    generationOrigin:
      record.generationOrigin === 'openrouter' || record.generationOrigin === 'fallback-template' ? record.generationOrigin : 'manual',
    createdDeviceKind: normalizeCreatedDeviceKind(record.createdDeviceKind),
    createdDeviceLabel: typeof record.createdDeviceLabel === 'string' ? record.createdDeviceLabel : undefined,
    dictationScript: scriptResult.ok ? scriptResult.script : null,
    generationError: typeof record.generationError === 'string' ? record.generationError : undefined,
  });
}

function getDictaLocalStorageEntries(): LocalStorageEntry[] {
  return Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
    .filter((key): key is string => Boolean(key && key.startsWith('dicta.')))
    .sort()
    .map((key) => {
      const value = window.localStorage.getItem(key) ?? '';
      return {
        key,
        bytes: byteSize(`${key}${value}`),
        valuePreview: value.length > 96 ? `${value.slice(0, 96)}...` : value,
      };
    });
}

function getDictaLocalStorageSnapshot(): Record<string, string> {
  return Object.fromEntries(getDictaLocalStorageEntries().map((entry) => [entry.key, window.localStorage.getItem(entry.key) ?? '']));
}

function loadAdaptiveBenchmarks(): AdaptiveBenchmarksByInputLanguage {
  const raw = window.localStorage.getItem(ADAPTIVE_BENCHMARKS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as AdaptiveBenchmarksByInputLanguage;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function loadAdaptiveSessionFeedback(): AdaptiveSessionFeedbackByInputLanguage {
  const raw = window.localStorage.getItem(ADAPTIVE_SESSION_FEEDBACK_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as AdaptiveSessionFeedbackByInputLanguage;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function loadPersistedDictaLanguageView(): MetricsLanguageView {
  const keys = [LEADERBOARD_LANGUAGE_KEY, LIVE_METRICS_LANGUAGE_KEY, ADMIN_LANGUAGE_KEY];
  for (const key of keys) {
    const saved = window.localStorage.getItem(key);
    if (isSupportedLanguage(saved)) {
      return saved;
    }
  }
  return 'en';
}

function downloadDictaLocalStorage(): void {
  const payload = JSON.stringify(getDictaLocalStorageSnapshot(), null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dicta-local-storage-${Date.now()}.json`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function copyDictaLocalStorage(setExportMessage: React.Dispatch<React.SetStateAction<string>>): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(getDictaLocalStorageSnapshot(), null, 2));
  setExportMessage('Dicta localStorage JSON copied.');
}

async function writeTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Some embedded browsers expose the Clipboard API but reject writes.
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const copied = document.execCommand('copy');
    return copied;
  } finally {
    document.body.removeChild(textarea);
  }
}

function countTelemetrySamples(telemetry: SessionTelemetry): number {
  return Math.max(
    telemetry.lagSeries.length,
    telemetry.wpmSeries.length,
    telemetry.accuracySeries.length,
  );
}

function byteSize(value: string): number {
  return new TextEncoder().encode(value).length;
}

function formatSessionInputMode(mode: SessionInputMode): string {
  if (mode === 'input2') return 'Browser TTS';
  if (mode === 'input3') return 'Kokoro local';
  return 'CosyVoice cache';
}

function formatInputModeLabel(mode: InputMode): string {
  if (mode === 'browser-tts') return 'Browser TTS';
  if (mode === 'kokoro') return 'Kokoro local';
  return 'CosyVoice cache';
}

function formatSessionGenerationOrigin(origin: GenerationOrigin): string {
  if (origin === 'openrouter') return 'OpenRouter generated';
  if (origin === 'fallback-template') return 'Local fallback template';
  return 'Manual/imported';
}

function formatAdaptiveModeFromSession(session: StoredSession): string {
  if (session.metrics.trend === 'declining') return 'Support';
  if (session.metrics.trend === 'improving') return 'Flow';
  return 'Balanced';
}

function buildAdaptiveAdapterCards(): AdaptiveAdapterCardConfig[] {
  return [
    {
      inputMode: 'input2',
      title: 'Input #2 - Browser TTS',
      adapter: 'browserTtsTelemetryAdapter',
      execution: 'Controls browser utterance rate, phrase chunk size, and pause timing from typed progress.',
      controls: 'Rate + chunks + pauses',
    },
    {
      inputMode: 'input3',
      title: 'Input #3 - Kokoro TTS Local',
      adapter: 'kokoroTelemetryAdapter',
      execution: 'Controls generated phrase size, Kokoro playback rate, replay behavior, and pause timing.',
      controls: 'Generation + replay + rate',
    },
    {
      inputMode: 'input4',
      title: 'Input #4 - CosyVoice2 Cache',
      adapter: 'qwenCloudTelemetryAdapter',
      execution: 'Controls cached phrase chunking, playback decisions, and browser TTS fallback when cached audio is missing.',
      controls: 'Cache chunks + fallback',
    },
  ];
}

function SessionDeviceIcon({ session }: { session: StoredSession }) {
  const icon = formatCreatedDeviceIcon(session.createdDeviceKind);
  if (!icon) return null;
  return (
    <span className="session-device-icon" title={formatCreatedDeviceTooltip(session.createdDeviceKind, session.createdDeviceLabel)} aria-label={formatCreatedDeviceTooltip(session.createdDeviceKind, session.createdDeviceLabel)}>
      {icon}
    </span>
  );
}

export default App;

function createStoredSession(index = 1, inputMode: SessionInputMode = 'input2', name?: string): StoredSession {
  const now = new Date().toISOString();
  const deviceMetadata = detectCreatedDeviceMetadata();
  return {
    id: crypto.randomUUID(),
    name: name?.trim() || `Session ${index}`,
    createdAt: now,
    updatedAt: now,
    inputMode,
    inputSettingsLocked: false,
    ttsText: '',
    ttsLanguage: inputMode === 'input2' || inputMode === 'input4' ? 'de' : null,
    ttsVoiceURI: null,
    ttsPracticeText: '',
    kokoroText: '',
    kokoroLanguage: inputMode === 'input3' ? 'en' : null,
    kokoroVoice: 'default',
    kokoroPracticeText: '',
    kokoroChunks: [],
    difficulty: 'normal',
    status: 'ready',
    metrics: createDefaultMetrics(),
    telemetry: cloneTelemetry(null),
    sessionSource: 'plainText',
    generationOrigin: 'manual',
    ...deviceMetadata,
    dictationScript: null,
  };
}

function createSessionFromScript(
  script: DictationScript,
  index: number,
  inputMode: SessionInputMode,
  options: { browserTtsVoices?: readonly SpeechSynthesisVoice[] } = {},
): StoredSession {
  const titledScript = normalizeGeneratedDictationScriptTitle(script);
  const text = titledScript.phrases.map((phrase) => phrase.text).join(' ');
  const language = scriptLanguageToTtsLanguage(titledScript.language);
  const session: StoredSession = {
    ...createStoredSession(index, inputMode, titledScript.title),
    inputSettingsLocked: true,
    difficulty: titledScript.difficulty,
    sessionSource: 'dictationScript',
    dictationScript: titledScript,
  };

  if (inputMode === 'input3') {
    return {
      ...session,
      kokoroText: text,
      kokoroLanguage: language,
    };
  }

  return {
    ...session,
    ttsText: text,
    ttsLanguage: language,
    ttsVoiceURI: chooseRandomBrowserTtsVoiceURIForSession(
      inputMode,
      options.browserTtsVoices ?? [],
      language,
      seededUnitInterval(`${inputMode}:${language}:${index}:${titledScript.title}`),
    ),
  };
}

function createGeneratedErrorSession({
  index,
  inputMode,
  language,
  name,
  message,
}: {
  index: number;
  inputMode: SessionInputMode;
  language: TtsLanguage;
  name: string;
  message: string;
}): StoredSession {
  const session: StoredSession = {
    ...createStoredSession(index, inputMode, name),
    inputSettingsLocked: true,
    status: 'error',
    generationError: message,
  };

  if (inputMode === 'input3') {
    return { ...session, kokoroLanguage: language };
  }
  return { ...session, ttsLanguage: language };
}

function normalizeRestoredStoredSession(session: StoredSession): StoredSession {
  const telemetry = cloneTelemetry(session.telemetry);
  return normalizeSessionForPersistence({
    ...session,
    ttsEnvironment: session.inputMode === 'input2' ? normalizeBrowserTtsEnvironmentFingerprint(session.ttsEnvironment) : undefined,
    telemetry,
    status: normalizeRestoredSessionStatus(session.status, telemetry),
  });
}

function normalizeGeneratedDictationScriptTitle(script: DictationScript): DictationScript {
  const title = script.title.trim();
  if (!isGenericGeneratedTitle(title)) return script;
  return {
    ...script,
    title: buildFallbackDictationScriptTitle(script),
  };
}

function isGenericGeneratedTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  return (
    normalized.length === 0 ||
    normalized === 'generated dictation' ||
    normalized === 'dictation' ||
    normalized === 'training script' ||
    normalized === 'generated script' ||
    normalized === 'untitled'
  );
}

function buildFallbackDictationScriptTitle(script: DictationScript): string {
  const firstPhrase = script.phrases.find((phrase) => phrase.text.trim().length > 0)?.text.trim() ?? '';
  const words = firstPhrase.match(/[\p{L}\p{N}]+/gu) ?? [];
  const titleWords = words.slice(0, 6);
  if (titleWords.length > 0) {
    return truncateTitle(titleWords.join(' '));
  }

  const language = formatSupportedLanguage(script.language);
  return `${language} ${String(script.inputMode)} practice`;
}

function truncateTitle(title: string): string {
  return title.length > 64 ? `${title.slice(0, 61).trim()}...` : title;
}

function mapDictationScriptInputModeToSession(inputMode: string): SessionInputMode | null {
  const normalized = String(inputMode).trim().toLowerCase().replace(/_/g, '-');
  if (normalized === 'input2' || normalized === 'browser-tts' || normalized === 'browsertts') return 'input2';
  if (normalized === 'input3' || normalized === 'kokoro' || normalized === 'kokoro-tts') return 'input3';
  if (
    normalized === 'input4' ||
    normalized === COSYVOICE_CACHE_INPUT_MODE ||
    normalized === LEGACY_QWEN_CLOUD_INPUT_MODE ||
    normalized === 'qwen'
  ) return 'input4';
  return null;
}

function scriptLanguageToTtsLanguage(language: string): TtsLanguage {
  if (isSupportedLanguage(language)) return language;
  return 'en';
}

function buildSemanticPhrasesFromDictationScript(script: DictationScript): SemanticPhrase[] {
  return script.phrases.map((phrase, index) => {
    const words = buildTtsSourceWords(phrase.text);
    const punctuationLoad = words.length > 0 ? words.filter((word) => /[.!?;:,]/.test(word)).length / words.length : 0;
    const rareWordLoad = words.length > 0 ? words.filter((word) => normalizeWord(word).length >= 10).length / words.length : 0;
    return {
      id: phrase.id || `script-${index}`,
      text: phrase.text,
      language: script.language,
      boundaryType: phrase.boundaryType,
      canPauseAfter: phrase.boundaryType !== 'unsafe' && !phrase.requiresContinuation,
      canReplayIndependently: phrase.canReplayIndependently,
      semanticCompleteness: phrase.semanticCompleteness,
      difficulty: phrase.difficulty,
      wordCount: Math.max(1, words.length),
      charCount: phrase.text.length,
      punctuationLoad,
      rareWordLoad,
      syntaxComplexity: phrase.requiresContinuation ? 0.65 : 0.35,
    };
  });
}

function getNextSessionIndex(sessions: StoredSession[]): number {
  const highestNamedIndex = sessions.reduce((highest, session) => {
    const match = /^Session\s+(\d+)$/i.exec(session.name.trim());
    if (!match) {
      return highest;
    }
    return Math.max(highest, Number(match[1]));
  }, 0);

  return Math.max(highestNamedIndex + 1, sessions.length + 1);
}

function loadSessions(): StoredSession[] {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>[];
    if (parsed.length === 0) {
      return [];
    }
    const deletedIds = loadDeletedSessionIds();
    return parsed.map((session, index) => {
      const inputMode = coerceSessionInputMode(session.inputMode);
      if (!inputMode) return null;
      const scriptResult = validateDictationScript(session.dictationScript);

      const base: StoredSession = {
        id: session.id ?? createStoredSession(index + 1).id,
        name: session.name ?? `Session ${index + 1}`,
        createdAt: session.createdAt ?? new Date().toISOString(),
    updatedAt: session.updatedAt ?? new Date().toISOString(),
    inputMode,
    inputSettingsLocked: Boolean(session.inputSettingsLocked),
    ttsText: session.ttsText ?? '',
        ttsLanguage: isSupportedLanguage(session.ttsLanguage) ? session.ttsLanguage : null,
        ttsVoiceURI: inputMode === 'input2' && typeof session.ttsVoiceURI === 'string' ? session.ttsVoiceURI : null,
        ttsEnvironment: inputMode === 'input2' ? normalizeBrowserTtsEnvironmentFingerprint(session.ttsEnvironment) : undefined,
        ttsPracticeText: session.ttsPracticeText ?? '',
        kokoroText: session.kokoroText ?? '',
        kokoroLanguage: isSupportedLanguage(session.kokoroLanguage) ? session.kokoroLanguage : null,
        kokoroVoice: session.kokoroVoice ?? 'default',
        kokoroPracticeText: session.kokoroPracticeText ?? '',
        kokoroChunks: session.kokoroChunks ?? [],
        difficulty: session.difficulty ?? 'normal',
        status: normalizeRestoredSessionStatus(isSessionStatus(session.status) ? session.status : 'ready', cloneTelemetry(session.telemetry)),
        metrics: {
          ...createDefaultMetrics(),
          ...session.metrics,
        },
        telemetry: cloneTelemetry(session.telemetry),
        sessionSource: session.sessionSource === 'dictationScript' && scriptResult.ok ? 'dictationScript' : 'plainText',
        generationOrigin:
          session.generationOrigin === 'openrouter' || session.generationOrigin === 'fallback-template'
            ? session.generationOrigin
            : 'manual',
        createdDeviceKind: normalizeCreatedDeviceKind(session.createdDeviceKind),
        createdDeviceLabel: typeof session.createdDeviceLabel === 'string' ? session.createdDeviceLabel : undefined,
        dictationScript: scriptResult.ok ? scriptResult.script : null,
        generationError: typeof session.generationError === 'string' ? session.generationError : undefined,
      };

      return normalizeRestoredStoredSession(base);
    }).filter((session): session is StoredSession => Boolean(session && !deletedIds.has(session.id) && !isTransientGenerationErrorSessionLike(session)));
  } catch {
    return [];
  }
}

function formatSessionDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatSessionPlaybackDuration(session: StoredSession): string {
  const durationSec = getSessionVoiceDurationSec(session);
  return durationSec !== null ? formatDuration(durationSec) : 'n/a';
}

function buildTrainingSessionSubmissionMeta(
  sessions: StoredSession[],
  activeSession: StoredSession | null,
): TrainingSessionSubmissionMeta | null {
  if (!activeSession || activeSession.status !== 'finished' || !hasSubmittedSessionStats(activeSession)) {
    return null;
  }

  const language = resolveSessionLanguage(activeSession);
  const rankedByLanguage = [...sessions]
    .filter((session) => resolveSessionLanguage(session) === language)
    .sort((a, b) => b.metrics.points - a.metrics.points || b.metrics.score - a.metrics.score || b.metrics.accuracy - a.metrics.accuracy);
  const rank = rankedByLanguage.findIndex((session) => session.id === activeSession.id) + 1;
  const submittedAt = activeSession.telemetry.finishedAt ?? activeSession.updatedAt;
  const maxPoints = computeSessionMaxPoints(activeSession);

  return {
    positionLabel: rank > 0 ? `#${rank}` : 'n/a',
    scoreLabel: String(activeSession.metrics.score),
    scoreHelpText: buildSessionScoreHelpText(activeSession.metrics),
    accuracyLabel: `${activeSession.metrics.accuracy.toFixed(1)}%`,
    pointsLabel: formatSessionPointsLabel(activeSession.metrics.points, maxPoints),
    pointsHelpText: buildSessionPointsHelpText(maxPoints),
    durationLabel: formatSessionPlaybackDuration(activeSession),
    submittedAtLabel: formatSubmittedAt(submittedAt),
  };
}

function formatSubmittedAt(value: string): string {
  return Number.isFinite(Date.parse(value)) ? formatSessionDate(value) : 'n/a';
}

function getSessionVoiceDurationSec(session: StoredSession): number | null {
  return estimateSessionVoiceDurationSec(session);
}

function isSessionStatus(value: unknown): value is SessionStatus {
  return value === 'ready' || value === 'running' || value === 'paused' || value === 'finished' || value === 'error';
}

function coerceSessionInputMode(value: unknown): SessionInputMode | null {
  return value === 'input2' || value === 'input3' || value === 'input4' ? value : null;
}

function sameBrowserTtsEnvironment(
  left: BrowserTtsEnvironmentFingerprint | null | undefined,
  right: BrowserTtsEnvironmentFingerprint | null | undefined,
): boolean {
  const normalizedLeft = normalizeBrowserTtsEnvironmentFingerprint(left);
  const normalizedRight = normalizeBrowserTtsEnvironmentFingerprint(right);
  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
}

function createDefaultMetrics(): SessionMetrics {
  return {
    controllerState: 'hold',
    rate: 1,
    lagSec: 0,
    lagWords: 0,
    wpm: 0,
    accuracy: 0,
    trend: 'stable',
    score: 0,
    points: 0,
  };
}

function telemetryEquals(a: SessionTelemetry | null | undefined, b: SessionTelemetry | null | undefined): boolean {
  return JSON.stringify(cloneTelemetry(a)) === JSON.stringify(cloneTelemetry(b));
}

function formatSessionStatus(value: SessionStatus): string {
  switch (value) {
    case 'running':
      return 'Running';
    case 'paused':
      return 'Paused';
    case 'finished':
      return 'Finished';
    case 'error':
      return 'Error';
    default:
      return 'Ready';
  }
}

function sortLeaderboardSessions<T extends StoredSession>(sessions: T[]): T[] {
  return [...sessions].sort(
    (a, b) => b.metrics.points - a.metrics.points || b.metrics.score - a.metrics.score || b.metrics.accuracy - a.metrics.accuracy,
  );
}

function buildLeaderboardSections(
  sessions: Array<StoredSession & { voiceDurationSec?: number | null }>,
  language: MetricsLanguageView,
): LeaderboardSection[] {
  const languageSessions = sortLeaderboardSessions(sessions.filter((session) => resolveSessionLanguage(session) === language));
  return LEADERBOARD_SECTION_DEFINITIONS.map((definition) => {
    const sectionSessions = languageSessions.filter((session) => {
      return session.difficulty === definition.difficulty && getLeaderboardSessionLength(session) === definition.length;
    });
    return {
      ...definition,
      sessions: sectionSessions.map((session, index) => ({ rank: index + 1, session })),
      rangeMetrics: buildLeaderboardRangeMetrics(sectionSessions, language),
    };
  });
}

function getLeaderboardSessionLength(session: StoredSession & { voiceDurationSec?: number | null }): LeaderboardSessionLength {
  const scriptDurationSec = session.dictationScript?.estimatedDurationSec;
  if (typeof scriptDurationSec === 'number' && Number.isFinite(scriptDurationSec) && scriptDurationSec > 0) {
    return scriptDurationSec <= 90 ? 'express' : 'standard';
  }
  const voiceDurationSec = typeof session.voiceDurationSec === 'number' ? session.voiceDurationSec : getSessionVoiceDurationSec(session);
  return typeof voiceDurationSec === 'number' && Number.isFinite(voiceDurationSec) && voiceDurationSec > 0 && voiceDurationSec <= 90
    ? 'express'
    : 'standard';
}

function buildLeaderboardRangeMetrics(
  sessions: Array<StoredSession & { voiceDurationSec?: number | null }>,
  language: MetricsLanguageView,
): LeaderboardRangeMetric[] {
  return LEADERBOARD_RANGE_DEFINITIONS.map(({ range, label }) => {
    const summary = buildRangeSummaryForLanguage(sessions, language, range);
    return {
      range,
      label,
      sessionCount: summary.sessionsInRange.length,
      durationLabel: formatDuration(summary.durationSeconds),
      avgPointsLabel: summary.avgPoints !== null ? summary.avgPoints.toFixed(1) : '—',
      avgScoreLabel: summary.avgScore !== null ? summary.avgScore.toFixed(1) : '—',
      avgAccuracyLabel: summary.avgAccuracy !== null ? `${summary.avgAccuracy.toFixed(1)}%` : '—',
      avgWpmLabel: summary.avgWpm !== null ? summary.avgWpm.toFixed(1) : '—',
    };
  });
}

function formatLeaderboardSessionStatus(session: StoredSession): string {
  if (session.status === 'finished' && !hasSubmittedSessionStats(session)) {
    return 'Not submitted';
  }
  return formatSessionStatus(session.status);
}

function getSessionDisplayTitle(session: StoredSession): string {
  if (session.dictationScript) {
    return normalizeGeneratedDictationScriptTitle(session.dictationScript).title;
  }
  return session.name || 'Untitled session';
}

function hasSubmittedSessionStats(session: StoredSession): boolean {
  return isSubmittedFinishedAttempt(session);
}

function isSessionReadyForTraining(session: StoredSession): boolean {
  if (session.status === 'error') return false;
  if (session.status !== 'finished') return false;
  return hasSubmittedSessionStats(session);
}

type TtsPlaybackProfile = {
  label: string;
  baseRate: number;
  chunkWords: number;
  pauseMs: number;
};

type TtsLiveSignal = {
  accuracy: number;
  lagSec: number;
  rawLagSec: number;
  stableLagSec: number;
  lagOutlierCount: number;
  wpm: number;
  trend: PerformanceTrend;
  controllerState: ControlAction;
};

type TtsAdaptiveChunk = {
  text: string;
  startWordIndex: number;
  wordCount: number;
  phraseBoundaryType?: PhraseBoundaryType;
  canPauseAfter?: boolean;
  canReplayIndependently?: boolean;
  semanticCompleteness?: number;
  punctuationLoad?: number;
  rareWordLoad?: number;
  syntaxComplexity?: number;
  phraseDifficulty?: number;
};

function buildOpenRouterDiversificationHints({
  durationMinutes,
  targetDifficulty,
  recentSessions,
  activityHints = [],
}: {
  durationMinutes: OpenRouterDurationMinutes;
  targetDifficulty?: DictationScriptDifficulty;
  recentSessions: Array<{ title: string; opener: string }>;
  activityHints?: string[];
}): string[] {
  const hints: string[] = [
    `Create clearly different content from the last generated scripts while keeping the requested ${durationMinutes}-minute length.`,
    ...activityHints,
  ];
  if (targetDifficulty === 'hard') {
    hints.push('Challenge intent: use richer grammar and vocabulary only if the trainer prescription keeps the session in challenge/hard mode.');
  } else if (targetDifficulty === 'normal') {
    hints.push('Progress intent: keep medium complexity unless the trainer prescription selects recovery or stabilization.');
  } else if (targetDifficulty === 'easy') {
    hints.push('Recovery intent: use simpler vocabulary, shorter clauses, and everyday topics when the trainer prescription selects easy recovery.');
  }
  const recentOpeners = recentSessions
    .map((session) => session.opener.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 3);
  if (recentOpeners.length > 0) {
    hints.push(`Do not start phrases with these recent openings: ${recentOpeners.join(' | ')}`);
  }
  const recentTitles = recentSessions
    .map((session) => session.title.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (recentTitles.length > 0) {
    hints.push(`Avoid repeating these recent themes/titles: ${recentTitles.join(' | ')}`);
  }
  return hints;
}

function buildOpenRouterActivityHints({
  sessions,
  inputMode,
  language,
  benchmarkSessionCount,
}: {
  sessions: StoredSession[];
  inputMode: InputMode;
  language: BenchmarkLanguageButton;
  benchmarkSessionCount: number;
}): string[] {
  const nowMs = Date.now();
  const cutoffMs = nowMs - 30 * 24 * 60 * 60 * 1000;
  const languageSessions = sessions.filter((session) => resolveStoredSessionLanguage(session) === language);
  const profileSessions = languageSessions.filter((session) => mapSessionInputMode(session.inputMode) === inputMode);
  const monthLanguageSessions = languageSessions.filter((session) => isSessionUpdatedWithinWindow(session, cutoffMs, nowMs));
  const monthProfileSessions = profileSessions.filter((session) => isSessionUpdatedWithinWindow(session, cutoffMs, nowMs));
  const finishedMonthProfileSessions = monthProfileSessions.filter((session) => session.status === 'finished');
  const avgAccuracy = averageSessionMetric(finishedMonthProfileSessions, 'accuracy');
  const avgWpm = averageSessionMetric(finishedMonthProfileSessions, 'wpm');
  const hints = [
    `User activity context: ${monthLanguageSessions.length} ${language.toUpperCase()} session(s) in the last 30 days; ${monthProfileSessions.length} match ${inputMode}/${language}.`,
  ];

  if (benchmarkSessionCount !== monthProfileSessions.length) {
    hints.push(
      `Adaptive benchmark sessionCount is ${benchmarkSessionCount} because it counts accepted ${inputMode}/${language} telemetry samples, not every saved monthly session.`,
    );
  }
  if (avgAccuracy !== null || avgWpm !== null) {
    hints.push(
      `Recent finished ${inputMode}/${language} activity averages: ${avgAccuracy === null ? 'accuracy unavailable' : `${avgAccuracy.toFixed(1)}% accuracy`}, ${avgWpm === null ? 'WPM unavailable' : `${avgWpm.toFixed(1)} WPM`}.`,
    );
  }
  return hints;
}

function buildBenchmarkActivitySummary(sessions: StoredSession[], profile: InputLanguageBenchmarkMetrics): Record<string, unknown> {
  const language = String(profile.language);
  const nowMs = Date.now();
  const cutoffMs = nowMs - 30 * 24 * 60 * 60 * 1000;
  const languageSessions = sessions.filter((session) => resolveStoredSessionLanguage(session) === language);
  const profileSessions = languageSessions.filter((session) => mapSessionInputMode(session.inputMode) === profile.inputMode);
  const monthLanguageSessions = languageSessions.filter((session) => isSessionUpdatedWithinWindow(session, cutoffMs, nowMs));
  const monthProfileSessions = profileSessions.filter((session) => isSessionUpdatedWithinWindow(session, cutoffMs, nowMs));
  const finishedMonthProfileSessions = monthProfileSessions.filter((session) => session.status === 'finished');
  const averageAccuracy = averageSessionMetric(finishedMonthProfileSessions, 'accuracy');
  const averageWpm = averageSessionMetric(finishedMonthProfileSessions, 'wpm');
  const recentSessionsForInputLanguage = [...profileSessions]
    .sort((a, b) => getSessionUpdatedAtMs(b) - getSessionUpdatedAtMs(a))
    .slice(0, 5)
    .map((session) => ({
      id: session.id,
      name: session.name,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      sessionSource: session.sessionSource,
      generationOrigin: session.generationOrigin,
      difficulty: session.difficulty,
      ...(profile.inputMode === 'browser-tts' && session.ttsEnvironment ? { ttsEnvironment: session.ttsEnvironment } : {}),
      dictationScript: session.dictationScript
        ? {
            title: session.dictationScript.title,
            difficulty: session.dictationScript.difficulty,
            estimatedDurationSec: session.dictationScript.estimatedDurationSec,
            phraseCount: session.dictationScript.phrases.length,
          }
        : null,
      metrics: {
        accuracy: session.metrics.accuracy,
        wpm: session.metrics.wpm,
        lagSec: session.metrics.lagSec,
        rate: session.metrics.rate,
        score: session.metrics.score,
        points: session.metrics.points,
        trend: session.metrics.trend,
      },
      telemetry: {
        lagSamples: session.telemetry.lagSeries.length,
        wpmSamples: session.telemetry.wpmSeries.length,
        accuracySamples: session.telemetry.accuracySeries.length,
        actionCount: session.telemetry.actions.length,
        ttsChunkCount: session.telemetry.ttsChunks.length,
        repeatCount: session.telemetry.repeatCount,
        rateDistributionBuckets: session.telemetry.rateDistribution.length,
        startedAt: session.telemetry.startedAt,
        finishedAt: session.telemetry.finishedAt ?? null,
      },
    }));

  return {
    scope: {
      inputMode: profile.inputMode,
      language,
      rangeDays: 30,
    },
    savedSessionCounts: {
      allTimeForLanguage: languageSessions.length,
      allTimeForInputLanguage: profileSessions.length,
      last30DaysForLanguage: monthLanguageSessions.length,
      last30DaysForInputLanguage: monthProfileSessions.length,
      finishedLast30DaysForInputLanguage: finishedMonthProfileSessions.length,
    },
    recentFinishedAverages:
      averageAccuracy === null && averageWpm === null
        ? null
        : {
            accuracy: averageAccuracy,
            wpm: averageWpm,
          },
    recentSessionsForInputLanguage,
    benchmarkCountExplanation:
      `benchmarkProfile.sessionCount (${profile.sessionCount}) counts unique sessions represented by accepted adaptive telemetry samples for ${profile.inputMode}/${language}; ` +
      `it is expected to be lower than savedSessionCounts when sessions have no accepted benchmark samples or belong to another input mode.`,
  };
}

function buildLatestFinishedSessionFeedbackReference(
  sessions: StoredSession[],
  profile: InputLanguageBenchmarkMetrics,
): SessionFeedbackReference | null {
  const latestSession = findLatestFinishedSessionForProfile(sessions, profile);
  if (!latestSession) return null;
  return {
    sessionId: latestSession.id,
    createdAt: latestSession.createdAt,
    updatedAt: latestSession.updatedAt,
    finishedAt: latestSession.telemetry.finishedAt ?? latestSession.updatedAt,
    completedAt: latestSession.telemetry.finishedAt ?? latestSession.updatedAt,
    scriptId: latestSession.dictationScript ? `${latestSession.id}:${latestSession.dictationScript.title}` : undefined,
    scriptTitle: latestSession.dictationScript?.title ?? latestSession.name,
  };
}

function findLatestFinishedSessionForProfile(
  sessions: StoredSession[],
  profile: InputLanguageBenchmarkMetrics,
): StoredSession | null {
  const language = String(profile.language);
  return sessions
    .filter((session) => session.status === 'finished')
    .filter((session) => resolveStoredSessionLanguage(session) === language)
    .filter((session) => mapSessionInputMode(session.inputMode) === profile.inputMode)
    .sort((a, b) => getSessionFinishedAtMs(b) - getSessionFinishedAtMs(a))[0] ?? null;
}

function getSessionFinishedAtMs(session: StoredSession): number {
  const finishedAtMs = new Date(session.telemetry.finishedAt ?? session.updatedAt ?? session.createdAt).getTime();
  return Number.isFinite(finishedAtMs) ? finishedAtMs : 0;
}

function getSessionUpdatedAtMs(session: StoredSession): number {
  const updatedAtMs = new Date(session.updatedAt || session.createdAt).getTime();
  return Number.isFinite(updatedAtMs) ? updatedAtMs : 0;
}

function isSessionUpdatedWithinWindow(session: StoredSession, cutoffMs: number, nowMs: number): boolean {
  const updatedAtMs = getSessionUpdatedAtMs(session);
  return Number.isFinite(updatedAtMs) && updatedAtMs >= cutoffMs && updatedAtMs <= nowMs;
}

function averageSessionMetric(sessions: StoredSession[], metric: 'accuracy' | 'wpm'): number | null {
  const values = sessions
    .map((session) => session.metrics[metric])
    .filter((value): value is number => Number.isFinite(value) && value > 0);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function average(values: number[]): number {
  const valid = values.filter((value) => Number.isFinite(value));
  if (valid.length === 0) {
    return 0;
  }

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function buildTtsPlaybackProfile(sessions: StoredSession[], currentSession: StoredSession | null): TtsPlaybackProfile {
  if (!currentSession) {
    return {
      label: 'Balanced coaching pace',
      baseRate: 0.95,
      chunkWords: 6,
      pauseMs: 260,
    };
  }

  const history = sessions.filter(
    (session) => session.id !== currentSession.id && session.status === 'finished' && session.metrics.points > 0,
  );
  const source = history.length > 0 ? history : sessions.filter((session) => session.id !== currentSession.id && session.metrics.points > 0);
  const avgAccuracy = average(source.map((session) => session.metrics.accuracy));
  const avgWpm = average(source.map((session) => session.metrics.wpm));
  const avgLag = average(source.map((session) => Math.abs(session.metrics.lagSec)));
  const current = currentSession.metrics;
  const signalAccuracy = current.accuracy > 0 ? current.accuracy : avgAccuracy || 100;
  const signalWpm = current.wpm > 0 ? current.wpm : avgWpm || 60;
  const signalLag = Math.abs(current.lagSec) > 0 ? Math.abs(current.lagSec) : avgLag || 2;

  const baseRate = clamp(
    0.82 + (signalAccuracy - 85) / 180 + (signalWpm - 55) / 260 - (signalLag - 2) / 24,
    0.72,
    1.35,
  );
  const chunkWords = signalAccuracy < 80 || signalLag > 3 ? 4 : signalAccuracy > 92 && signalWpm < 65 ? 9 : 6;
  const pauseMs = signalLag > 3 ? 520 : signalAccuracy < 80 ? 420 : 260;
  const label =
    signalAccuracy >= 92 && signalWpm < 65
      ? 'Precision pacing'
      : signalLag > 3
        ? 'Slow correction pacing'
        : signalWpm > 85
          ? 'Faster coaching pace'
          : 'Balanced coaching pace';

  return {
    label,
    baseRate,
    chunkWords,
    pauseMs,
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function averageNumbers(values: number[], fallback = 0): number {
  if (values.length === 0) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function mapSessionInputMode(mode: SessionInputMode): InputMode {
  if (mode === 'input2') return 'browser-tts';
  if (mode === 'input4') return COSYVOICE_CACHE_INPUT_MODE;
  return 'kokoro';
}

function resolveStoredSessionLanguage(session: StoredSession): LanguageCode {
  if (session.inputMode === 'input2' || session.inputMode === 'input4') return session.ttsLanguage ?? 'unknown';
  if (session.inputMode === 'input3') return session.kokoroLanguage ?? 'unknown';
  return 'unknown';
}

function mapAdaptivePacingMode(mode: PacingMode): TtsPacingMode {
  if (mode === 'support') return 'slow';
  if (mode === 'flow') return 'flow';
  return 'balanced';
}

function chunkWordsForPhraseSize(size: PhraseSize): number {
  if (size === 'short') return 4;
  if (size === 'long') return 10;
  return 6;
}

function formatTtsPacingMode(mode: TtsPacingMode): string {
  if (mode === 'slow') return 'Slow phrase pacing';
  if (mode === 'flow') return 'Flow pacing';
  return 'Balanced phrase pacing';
}

function getTtsTargetChunkWords(mode: TtsPacingMode, profileChunkWords: number): number {
  if (mode === 'slow') return clamp(Math.round(profileChunkWords - 2), 3, 5);
  if (mode === 'flow') return clamp(Math.round(profileChunkWords + 4), 9, 12);
  return clamp(Math.round(profileChunkWords), 6, 8);
}

function phraseSizeForTtsMode(mode: TtsPacingMode): PhraseSize {
  if (mode === 'slow') return 'short';
  if (mode === 'flow') return 'long';
  return 'medium';
}

function wordIndexForSemanticPhrase(phrases: SemanticPhrase[], phraseIndex: number): number {
  return phrases.slice(0, phraseIndex).reduce((sum, phrase) => sum + phrase.wordCount, 0);
}

function semanticPhraseIndexForWordIndex(phrases: SemanticPhrase[], wordIndex: number): number {
  let cursor = 0;
  for (let index = 0; index < phrases.length; index += 1) {
    const nextCursor = cursor + phrases[index].wordCount;
    if (wordIndex < nextCursor) return index;
    cursor = nextCursor;
  }
  return phrases.length;
}

function buildOrderedSemanticPhrases(text: string, language: string | undefined, mode: TtsPacingMode): SemanticPhrase[] {
  return planSemanticPhrases(text, language, phraseSizeForTtsMode(mode));
}

function buildAdaptiveTtsChunk(
  sourceWords: string[],
  startWordIndex: number,
  mode: TtsPacingMode,
  profileChunkWords: number,
  _language?: string,
  semanticPhrase?: SemanticPhrase,
): TtsAdaptiveChunk {
  const targetWords = getTtsTargetChunkWords(mode, profileChunkWords);
  if (semanticPhrase && semanticPhrase.text.trim()) {
    return {
      text: semanticPhrase.text,
      startWordIndex,
      wordCount: semanticPhrase.wordCount,
      phraseBoundaryType: semanticPhrase.boundaryType,
      canPauseAfter: semanticPhrase.canPauseAfter,
      canReplayIndependently: semanticPhrase.canReplayIndependently,
      semanticCompleteness: semanticPhrase.semanticCompleteness,
      punctuationLoad: semanticPhrase.punctuationLoad,
      rareWordLoad: semanticPhrase.rareWordLoad,
      syntaxComplexity: semanticPhrase.syntaxComplexity,
      phraseDifficulty: semanticPhrase.difficulty,
    };
  }

  const minWords = Math.max(1, targetWords - 1);
  const maxWords = Math.min(sourceWords.length - startWordIndex, targetWords + 1);
  let wordCount = maxWords;

  for (let offset = minWords; offset <= maxWords; offset += 1) {
    const word = sourceWords[startWordIndex + offset - 1] ?? '';
    if (/[.!?,;:]$/.test(word)) {
      wordCount = offset;
      break;
    }
  }

  const words = sourceWords.slice(startWordIndex, startWordIndex + wordCount);
  return {
    text: words.join(' '),
    startWordIndex,
    wordCount,
    phraseBoundaryType: words.length > 0 && /[.!?]$/.test(words[words.length - 1] ?? '') ? 'sentence' : 'minor',
    canPauseAfter: words.length > 0 && /[.!?;:,]$/.test(words[words.length - 1] ?? ''),
    canReplayIndependently: words.length > 0,
    semanticCompleteness: words.length > 0 && /[.!?;:,]$/.test(words[words.length - 1] ?? '') ? 0.85 : 0.62,
    punctuationLoad: words.length > 0 ? words.filter((word) => /[.!?;:,]/.test(word)).length / words.length : 0,
    rareWordLoad: words.length > 0 ? words.filter((word) => normalizeWord(word).length >= 10).length / words.length : 0,
    syntaxComplexity: 0.4,
    phraseDifficulty: 0.45,
  };
}

function deriveTtsControlAction({
  accuracy,
  lagSec,
  wpm,
  typedWords,
}: {
  accuracy: number;
  lagSec: number;
  wpm: number;
  typedWords: number;
}): ControlAction {
  if (typedWords < 3) return 'hold';
  if (accuracy < 75 || lagSec > 3.2) return 'speed_down';
  if (accuracy >= 92 && Math.abs(lagSec) <= 1.5 && wpm >= 35) return 'speed_up';
  return 'hold';
}

function derivePerformanceTrend(
  lagSec: number,
  accuracy: number,
  previousLagSec: number,
  previousAccuracy: number,
): PerformanceTrend {
  const lagImproved = Math.abs(lagSec) < Math.abs(previousLagSec) - 0.25;
  const accuracyImproved = accuracy > previousAccuracy + 0.5;
  const worsening = Math.abs(lagSec) > Math.abs(previousLagSec) + 0.4 && accuracy + 1 < previousAccuracy;
  if (lagImproved || accuracyImproved) return 'improving';
  if (worsening) return 'declining';
  return 'stable';
}

function buildTtsSourceWords(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildTextTranscript(text: string): Transcript | null {
  const words = text
    .split(/\s+/)
    .map((word, index) => {
      const normalized = normalizeWord(word);
      return normalized
        ? { word: normalized, start: index, end: index + 1 }
        : null;
    })
    .filter((word): word is { word: string; start: number; end: number } => Boolean(word));

  return words.length > 0 ? { words } : null;
}

function buildRepeatWordStats({
  sessions,
  inputMode,
  language,
  now,
}: {
  sessions: StoredSession[];
  inputMode: InputMode;
  language: BenchmarkLanguageButton;
  now: Date;
}): RepeatWordStat[] {
  const cutoffMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const withinWindow = sessions.filter((session) => {
    if (session.status !== 'finished') return false;
    if (mapSessionInputMode(session.inputMode) !== inputMode) return false;
    const resolvedLanguage = resolveSessionLanguage(session);
    if (resolvedLanguage !== language) return false;
    const updatedAtMs = new Date(session.updatedAt).getTime();
    return Number.isFinite(updatedAtMs) && updatedAtMs >= cutoffMs;
  });

  const missed = new Map<string, number>();
  const typos = new Map<string, number>();

  const bump = (bucket: Map<string, number>, word: string, delta = 1) => {
    if (!word) return;
    bucket.set(word, (bucket.get(word) ?? 0) + delta);
  };

  for (const session of withinWindow) {
    const transcript =
      session.inputMode === 'input3'
        ? buildTextTranscript(session.kokoroText)
        : buildTextTranscript(session.ttsText);

    const typedText =
      session.inputMode === 'input3'
        ? session.kokoroPracticeText
        : session.ttsPracticeText;

    const evaluation = evaluateTranscriptAttempt(typedText, transcript);
    if (evaluation.targetWords.length === 0) continue;

    const matchedTargetIndices = new Set(evaluation.alignedPairs.map((pair) => pair.targetIndex));
    for (let index = 0; index < evaluation.targetWords.length; index += 1) {
      if (!matchedTargetIndices.has(index)) {
        bump(missed, evaluation.targetWords[index] ?? '');
      }
    }

    for (const pair of evaluation.alignedPairs) {
      if (!pair.exact) {
        bump(typos, evaluation.targetWords[pair.targetIndex] ?? '');
      }
    }
  }

  const words = new Set([...missed.keys(), ...typos.keys()]);
  const combined: RepeatWordStat[] = [];
  for (const word of words) {
    const missedCount = missed.get(word) ?? 0;
    const typoCount = typos.get(word) ?? 0;
    const total = missedCount + typoCount;
    if (total <= 0) continue;
    combined.push({ word, total, missed: missedCount, typos: typoCount });
  }

  return combined
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.missed !== a.missed) return b.missed - a.missed;
      return a.word.localeCompare(b.word);
    })
    .slice(0, 20);
}

function getTtsVoiceLang(language: TtsLanguage): string {
  return getDefaultSpeechSynthesisLang(language);
}

function seededUnitInterval(seed: string): () => number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return () => (hash >>> 0) / 0x100000000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function downloadSessionSnapshot(session: StoredSession): void {
  const payload = sessionSnapshotJson(session);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dicta-session-${session.id}.json`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function copySessionSnapshot(
  session: StoredSession,
  setExportMessage: React.Dispatch<React.SetStateAction<string>>,
): Promise<void> {
  await navigator.clipboard.writeText(sessionSnapshotJson(session));
  setExportMessage(`Session JSON copied for ${session.name || 'session'}.`);
}

declare global {
  interface Window {
    __DICTA_DEBUG_EXPORT__?: () => Record<string, unknown>;
  }
}
