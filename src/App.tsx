import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import './App.css';
import type { ControlAction, SessionTelemetry, Transcript, TtsChunkTelemetry, TtsPacingMode } from './types/dictation';
import type {
  AdaptiveTimelinePoint,
  AdaptiveSessionFeedback,
  InputLanguageBenchmarkMetrics,
  InputMode,
  HistoricalPerformanceProfile,
  LanguageCode,
  LiveTelemetryFrame,
  PacingDecision,
  PhrasePlaybackEvent,
  PhraseBoundaryType,
  PhraseSize,
  PacingMode,
} from './core/adaptive/types';
import { AudioEngine } from './core/audioEngine';
import { configForDifficulty, type Difficulty } from './core/config';
import { evaluateTranscriptAttempt, alignWordPairs } from './core/evaluation';
import { normalizeTranscript, buildTargetWords, normalizeWord } from './core/normalization';
import { deriveSyncState, SyncController } from './core/syncController';
import { AdaptiveDictationController } from './core/adaptive/AdaptiveDictationController';
import { planSemanticPhrases, type SemanticPhrase } from './core/adaptive/SemanticPhrasePlanner';
import { buildLagStabilitySample } from './core/adaptive/lagStability';
import {
  createEmptyInputLanguageBenchmark,
  normalizeBenchmarkLanguage,
  updateInputLanguageBenchmark,
} from './core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildBenchmarkFilename, buildSelectedBenchmarkExportPayload } from './core/adaptive/benchmarkJson';
import { buildDictationScriptPrompt, buildDictationScriptTemplate } from './core/adaptive/dictationScriptPrompt';
import {
  parseDictationScriptJson,
  validateDictationScript,
  type DictationScript,
  type DictationScriptValidationResult,
} from './core/adaptive/dictationScriptValidation';
import {
  buildAdaptiveSessionFeedback,
  buildBenchmarkFeedbackPackage,
  buildBenchmarkFeedbackPromptPackage,
  buildSessionFeedbackJsonPayload,
  derivePlaybackDiagnosticsFromTimeline,
} from './core/adaptive/sessionFeedback';
import { HistoricalPerformanceService } from './core/history/HistoricalPerformanceService';
import { buildAudioTelemetryFrame, buildAdaptiveAudioInput } from './inputs/audio/audioTelemetryAdapter';
import { buildBrowserTtsTelemetryFrame, buildAdaptiveBrowserTtsInput } from './inputs/browserTts/browserTtsTelemetryAdapter';
import { planBrowserTtsAdaptiveChunk } from './inputs/browserTts/ttsDynamicChunkPlanner';
import { buildKokoroTelemetryFrame, buildAdaptiveKokoroInput } from './inputs/kokoro/kokoroTelemetryAdapter';
import { buildQwenCloudTelemetryFrame, buildAdaptiveQwenCloudInput } from './inputs/qwenCloud/qwenCloudTelemetryAdapter';
import { QwenCloudAudioAdapter, buildQwenCloudPhraseId } from './inputs/qwenCloud/qwenCloudAudioAdapter';
import { buildQwenCloudCacheManifestFromSemanticPhrases, qwenCloudCacheManifestJson } from './inputs/qwenCloud/qwenCloudCacheManifest';
import { TypingTracker } from './core/typingTracker';
import { createTelemetry, trackAction, trackSample } from './core/telemetry';
import { parseTranscript } from './core/transcript';
import { KokoroAudioEngine } from './core/kokoroAudioEngine';
import { checkKokoroHealth, generateKokoroChunk, startKokoroSidecar, type KokoroChunkResponse } from './core/kokoroClient';
import {
  bootstrapCosyVoiceCacheSidecar,
  fetchCosyVoiceCacheHealth,
  generateCosyVoiceCache,
  startCosyVoiceCacheSidecar,
} from './core/cosyvoiceCacheClient';
import { buildKokoroSourceWords, type KokoroPhraseChunk } from './core/kokoroPhraseChunking';
import { KOKORO_GERMAN_WARNING, getKokoroLanguageWarning, isKokoroLanguageBlocked } from './core/kokoroSupport';
import { cloneTelemetry, normalizeSessionForPersistence } from './core/sessionNormalization';
import { sessionSnapshotJson } from './core/sessionSnapshot';
import {
  buildRangeSummaryForLanguage,
  findLastSessionForLanguage,
  rangeLabel,
  resolveSessionLanguage,
  type MetricsLanguageView,
  type MetricsRangeView,
} from './core/liveMetrics';
import { MiniTrends, SweetSpotGauge, TargetZoneChart } from './components/AdaptiveBenchmarkCharts';

const SESSION_STORAGE_KEY = 'dicta.sessions.v1';
const WORKSPACE_MODE_KEY = 'dicta.workspaceMode.v1';
const KOKORO_ENABLED_KEY = 'dicta.kokoroEnabled.v1';
const THEME_MODE_KEY = 'dicta.themeMode.v1';
const LIVE_METRICS_LANGUAGE_KEY = 'dicta.liveMetricsLanguage.v1';
const LIVE_METRICS_RANGE_KEY = 'dicta.liveMetricsRange.v1';
const LEADERBOARD_LANGUAGE_KEY = 'dicta.leaderboardLanguage.v1';
const SIDEBAR_SESSIONS_LANGUAGE_KEY = 'dicta.sidebarSessionsLanguage.v1';
const ADMIN_LANGUAGE_KEY = 'dicta.adminLanguage.v1';
const ADAPTIVE_BENCHMARKS_KEY = 'dicta.adaptiveBenchmarks.v1';
const ADAPTIVE_SESSION_FEEDBACK_KEY = 'dicta.adaptiveSessionFeedback.v1';
const TTS_BASE_WORDS_PER_SECOND = 2.6;
const DashboardLineChart = lazy(() =>
  import('./components/DashboardCharts').then((module) => ({ default: module.DashboardLineChart })),
);
const DashboardRateBars = lazy(() =>
  import('./components/DashboardCharts').then((module) => ({ default: module.DashboardRateBars })),
);
const DashboardActionTimeline = lazy(() =>
  import('./components/DashboardCharts').then((module) => ({ default: module.DashboardActionTimeline })),
);

type StoredSession = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  inputMode: SessionInputMode;
  inputSettingsLocked: boolean;
  audioUrl: string;
  audioSourceUrlInput: string;
  audioLabel: string;
  transcriptionLanguage: TtsLanguage | null;
  transcript: Transcript | null;
  inputText: string;
  ttsText: string;
  ttsLanguage: TtsLanguage | null;
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
  dictationScript: DictationScript | null;
};

type SessionStatus = 'ready' | 'running' | 'paused' | 'finished';
type SessionInputMode = 'input1' | 'input2' | 'input3' | 'input4';
type SessionSource = 'plainText' | 'dictationScript';
type TtsLanguage = 'en' | 'de' | 'es';
type TypingLanguage = 'en' | 'de' | 'es';
type KeyboardProfile = 'es-virtual' | 'de-keyboard' | null;
type WorkspaceMode = 'training' | 'leaderboard' | 'dashboard' | 'tts' | 'kokoro' | 'adaptive' | 'admin';
type ThemeMode = 'light' | 'dark';
type TtsStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'finished';
type PerformanceTrend = 'improving' | 'stable' | 'declining';

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
  totalTranscriptWords: number;
  ttsTextChars: number;
  kokoroTextChars: number;
  typedTextChars: number;
  telemetrySamples: number;
  telemetryActions: number;
  ttsChunks: number;
  blobAudioRefs: number;
  remoteAudioRefs: number;
  audioLabels: number;
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

type AdaptiveAdapterCardConfig = {
  inputMode: SessionInputMode;
  title: string;
  adapter: string;
  execution: string;
  controls: string;
};

type AdaptiveBenchmarksByInputLanguage = Record<string, Record<string, InputLanguageBenchmarkMetrics>>;
type AdaptiveSessionFeedbackByInputLanguage = Record<string, Record<string, AdaptiveSessionFeedback[]>>;
type BenchmarkLanguageButton = 'en' | 'es' | 'de';

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const [sessions, setSessions] = useState<StoredSession[]>(() => loadSessions());
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const initialSessions = loadSessions();
    return initialSessions[0]?.id ?? createStoredSession().id;
  });
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioSourceUrlInput, setAudioSourceUrlInput] = useState<string>('');
  const [loadedAudioFromUrl, setLoadedAudioFromUrl] = useState<string>('');
  const [audioReady, setAudioReady] = useState(false);
  const [audioReadyMessage, setAudioReadyMessage] = useState('');
  const [transcriptionLanguage, setTranscriptionLanguage] = useState<TtsLanguage>('de');
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [transcriptReadyMessage, setTranscriptReadyMessage] = useState('');
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [inputText, setInputText] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('ready');
  const [controllerState, setControllerState] = useState<ControlAction>('hold');
  const [rate, setRate] = useState(1);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [lagSec, setLagSec] = useState(0);
  const [lagWords, setLagWords] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [trend, setTrend] = useState<PerformanceTrend>('stable');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [exportMessage, setExportMessage] = useState('');
  const [inputSettingsLocked, setInputSettingsLocked] = useState(false);
  const [sessionCreationMode, setSessionCreationMode] = useState<SessionInputMode | null>(null);
  const [sessionCreationSource, setSessionCreationSource] = useState<SessionSource>('plainText');
  const [sessionCreationName, setSessionCreationName] = useState('');
  const [dictationScriptJson, setDictationScriptJson] = useState('');
  const [dictationScriptValidation, setDictationScriptValidation] = useState<DictationScriptValidationResult | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('leaderboard');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = window.localStorage.getItem(THEME_MODE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [dashboardSessionId, setDashboardSessionId] = useState<string | null>(null);
  const [sessionsExpanded, setSessionsExpanded] = useState(false);
  const [setupExpanded, setSetupExpanded] = useState(true);
  const [ttsExpanded, setTtsExpanded] = useState(true);
  const [ttsText, setTtsText] = useState('');

  useEffect(() => {
    setWorkspaceMode('leaderboard');
    setDashboardSessionId(null);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_MODE_KEY, themeMode);
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    qwenCloudAdapterRef.current = new QwenCloudAudioAdapter((message) => setError(message));
  }, []);

  const [ttsLanguage, setTtsLanguage] = useState<TtsLanguage>('de');
  const [ttsPracticeText, setTtsPracticeText] = useState('');
  const [ttsStatus, setTtsStatus] = useState<TtsStatus>('idle');
  const [ttsCurrentChunk, setTtsCurrentChunk] = useState('');
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
  const [kokoroPacingMode, setKokoroPacingMode] = useState<TtsPacingMode>('balanced');
  const [kokoroSpeechRate, setKokoroSpeechRate] = useState(1);
  const [kokoroManualBias, setKokoroManualBias] = useState(0);
  const [kokoroServiceReady, setKokoroServiceReady] = useState<boolean | null>(null);
  const [kokoroEnabled, setKokoroEnabled] = useState<boolean>(false);
  const [adminFileInventory, setAdminFileInventory] = useState<AdminFileInventory | null>(null);
  const [adminFileInventoryError, setAdminFileInventoryError] = useState('');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [metricsLanguageView, setMetricsLanguageView] = useState<MetricsLanguageView>(() => {
    const saved = window.localStorage.getItem(LIVE_METRICS_LANGUAGE_KEY);
    if (saved === 'en' || saved === 'es' || saved === 'de') {
      return saved;
    }
    return 'en';
  });
  const [leaderboardLanguageView, setLeaderboardLanguageView] = useState<MetricsLanguageView>(() => {
    const saved = window.localStorage.getItem(LEADERBOARD_LANGUAGE_KEY);
    if (saved === 'en' || saved === 'es' || saved === 'de') {
      return saved;
    }
    return 'en';
  });
  const [sessionsLanguageView, setSessionsLanguageView] = useState<MetricsLanguageView>(() => {
    const saved = window.localStorage.getItem(SIDEBAR_SESSIONS_LANGUAGE_KEY);
    if (saved === 'en' || saved === 'es' || saved === 'de') {
      return saved;
    }
    const existing = loadSessions();
    const sorted = [...existing].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    for (const session of sorted) {
      const language = resolveSessionLanguage(session);
      if (language === 'en' || language === 'es' || language === 'de') return language;
    }
    return 'de';
  });
  const [adminLanguageView, setAdminLanguageView] = useState<MetricsLanguageView>(() => {
    const saved = window.localStorage.getItem(ADMIN_LANGUAGE_KEY);
    if (saved === 'en' || saved === 'es' || saved === 'de') {
      return saved;
    }
    return 'en';
  });
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
  const [adaptiveSessionFeedbackByInputLanguage, setAdaptiveSessionFeedbackByInputLanguage] = useState<AdaptiveSessionFeedbackByInputLanguage>(() =>
    loadAdaptiveSessionFeedback(),
  );
  const [adaptiveBenchmarksFocusAnchor, setAdaptiveBenchmarksFocusAnchor] = useState<null | 'sessionFeedback'>(null);
  const [adaptiveSectionExpanded, setAdaptiveSectionExpanded] = useState({
    decision: true,
    architecture: true,
    adapters: true,
    latest: true,
    live: true,
    telemetry: true,
    benchmarks: true,
  });
  const [selectedBenchmarkInputMode, setSelectedBenchmarkInputMode] = useState<InputMode>('kokoro');
  const [selectedBenchmarkLanguage, setSelectedBenchmarkLanguage] = useState<BenchmarkLanguageButton>('en');
  const [benchmarkExportMessage, setBenchmarkExportMessage] = useState('');
  const [scriptPromptMessage, setScriptPromptMessage] = useState('');
  const [sessionFeedbackMessage, setSessionFeedbackMessage] = useState('');
  const previousLagRef = useRef(0);
  const previousAccuracyRef = useRef(100);

  const trackerRef = useRef(new TypingTracker());
  const engineRef = useRef<AudioEngine | null>(null);
  const adaptiveControllerRef = useRef(new AdaptiveDictationController());
  const historyServiceRef = useRef(new HistoricalPerformanceService());
  const ttsUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const qwenCloudAdapterRef = useRef<QwenCloudAudioAdapter | null>(null);
  const telemetryRef = useRef<SessionTelemetry | null>(null);
  const ttsStartedAtMsRef = useRef<number | null>(null);
  const ttsChunkStartMsRef = useRef<number | null>(null);
  const ttsChunkStartWordIndexRef = useRef(0);
  const ttsChunkWordCountRef = useRef(0);
  const ttsCompletedSourceWordsRef = useRef(0);
  const ttsLagOutlierCountRef = useRef(0);
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
  const adaptiveBenchmarkLastUpdateRef = useRef<Record<string, number>>({});
  const sessionBenchmarkBeforeRef = useRef<Record<string, InputLanguageBenchmarkMetrics>>({});
  const sessionFeedbackContextRef = useRef<Record<string, { inputMode: InputMode; language: LanguageCode }>>({});
  const phrasePlaybackEventsRef = useRef<PhrasePlaybackEvent[]>([]);
  const phrasePlaybackTotalPhrasesRef = useRef(0);
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
  const config = useMemo(() => configForDifficulty(difficulty), [difficulty]);
  const controllerRef = useRef(new SyncController(config));
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );
  const dashboardSession = useMemo(
    () => sessions.find((session) => session.id === dashboardSessionId) ?? activeSession,
    [activeSession, dashboardSessionId, sessions],
  );
  const activeInputMode = activeSession?.inputMode ?? 'input1';
  const activeInputLabel =
    activeInputMode === 'input1'
      ? 'Input # 1 - Original Audio'
      : activeInputMode === 'input2'
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
    activeInputMode === 'input1'
      ? 'training'
      : activeInputMode === 'input2' || activeInputMode === 'input4'
        ? 'tts'
        : 'kokoro';
  const brandActionLabel =
    workspaceMode === 'leaderboard' || workspaceMode === 'dashboard' || workspaceMode === 'adaptive' || workspaceMode === 'admin'
      ? 'Back to training'
      : 'Leaderboard';
  const latestSession = useMemo<StoredSession | null>(() => {
    if (sessions.length === 0) return null;
    return [...sessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  }, [sessions]);
  const ttsPlaybackProfile = useMemo(
    () => buildTtsPlaybackProfile(sessions, activeSession),
    [sessions, activeSession],
  );
  const leaderboard = useMemo(
    () =>
      [...sessions]
        .filter((session) => resolveSessionLanguage(session) === leaderboardLanguageView)
        .sort((a, b) => b.metrics.points - a.metrics.points || b.metrics.score - a.metrics.score || b.metrics.accuracy - a.metrics.accuracy)
        .map((session, index) => ({ rank: index + 1, session })),
    [sessions, leaderboardLanguageView],
  );
  const sidebarSessions = useMemo(
    () => [...sessions].filter((session) => resolveSessionLanguage(session) === sessionsLanguageView),
    [sessions, sessionsLanguageView],
  );
  const adminSessions = useMemo(
    () => [...sessions].filter((session) => resolveSessionLanguage(session) === adminLanguageView),
    [sessions, adminLanguageView],
  );
  const adminStorageSummary = useMemo(() => buildAdminStorageSummary(adminSessions), [adminSessions]);
  const transcriptSegments = useMemo(() => buildTranscriptSegments(transcript), [transcript]);
  const activeTranscriptSegmentIndex = useMemo(
    () => transcriptSegments.findIndex((segment) => currentAudioTime >= segment.start && currentAudioTime <= segment.end),
    [transcriptSegments, currentAudioTime],
  );
  const activeTranscriptSegment = activeTranscriptSegmentIndex >= 0 ? transcriptSegments[activeTranscriptSegmentIndex] : null;
  const nextTranscriptSegment =
    activeTranscriptSegmentIndex >= 0 ? transcriptSegments[activeTranscriptSegmentIndex + 1] ?? null : transcriptSegments[0] ?? null;

  useEffect(() => {
    window.localStorage.setItem(WORKSPACE_MODE_KEY, workspaceMode);
  }, [workspaceMode]);

  useEffect(() => {
    window.localStorage.setItem(KOKORO_ENABLED_KEY, JSON.stringify(kokoroEnabled));
  }, [kokoroEnabled]);

  useEffect(() => {
    if (!kokoroEnabled) return;

    if (!kokoroText.trim() && kokoroStatus !== 'playing') {
      setKokoroEnabled(false);
      return;
    }

    if (kokoroStatus === 'playing') return;

    const id = window.setTimeout(() => {
      setKokoroEnabled(false);
      setError((current) => current || 'Kokoro TTS was turned off after 1 minute of inactivity.');
    }, 60_000);

    return () => window.clearTimeout(id);
  }, [kokoroEnabled, kokoroText, kokoroStatus]);

  useEffect(() => {
    window.localStorage.setItem(LIVE_METRICS_LANGUAGE_KEY, metricsLanguageView);
  }, [metricsLanguageView]);

  useEffect(() => {
    window.localStorage.setItem(LEADERBOARD_LANGUAGE_KEY, leaderboardLanguageView);
  }, [leaderboardLanguageView]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_SESSIONS_LANGUAGE_KEY, sessionsLanguageView);
  }, [sessionsLanguageView]);

  useEffect(() => {
    window.localStorage.setItem(ADMIN_LANGUAGE_KEY, adminLanguageView);
  }, [adminLanguageView]);

  useEffect(() => {
    window.localStorage.setItem(LIVE_METRICS_RANGE_KEY, metricsRangeView);
  }, [metricsRangeView]);

  useEffect(() => {
    window.localStorage.setItem(ADAPTIVE_BENCHMARKS_KEY, JSON.stringify(adaptiveBenchmarksByInputLanguage));
  }, [adaptiveBenchmarksByInputLanguage]);

  useEffect(() => {
    window.localStorage.setItem(ADAPTIVE_SESSION_FEEDBACK_KEY, JSON.stringify(adaptiveSessionFeedbackByInputLanguage));
  }, [adaptiveSessionFeedbackByInputLanguage]);

  useEffect(() => {
    if (sessions.length === 0) {
      const nextSession = createStoredSession();
      setSessions([nextSession]);
      setActiveSessionId(nextSession.id);
      return;
    }

    if (!sessions.some((session) => session.id === activeSessionId)) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  useEffect(() => {
    if (sidebarSessions.length === 0) return;
    if (sidebarSessions.some((session) => session.id === activeSessionId)) return;
    setActiveSessionId(sidebarSessions[0].id);
  }, [sidebarSessions, activeSessionId]);

  useEffect(() => {
    if (
      activeSession &&
      workspaceMode !== 'leaderboard' &&
      workspaceMode !== 'dashboard' &&
      workspaceMode !== 'adaptive' &&
      workspaceMode !== 'admin'
    ) {
      setWorkspaceMode(activeInputWorkspaceMode);
    }
  }, [activeInputWorkspaceMode, activeSession, workspaceMode]);

  useEffect(() => {
    if (workspaceMode !== 'admin') return;

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
    const normalized = sessions.map((session) => normalizeSessionForPersistence(session));
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalized));
  }, [sessions]);

  useEffect(() => {
    controllerRef.current = new SyncController(config);
  }, [config]);

  const targetWords = useMemo(() => {
    if (!transcript) return [];
    return buildTargetWords(transcript);
  }, [transcript]);

  const attemptEvaluation = useMemo(() => evaluateTranscriptAttempt(inputText, transcript), [inputText, transcript]);
  const typedWords = attemptEvaluation.typedWords;
  const visibleAccuracy = typedWords.length > 0 && targetWords.length > 0 ? accuracy : 0;
  const visibleScore =
    typedWords.length > 0 && targetWords.length > 0
      ? computeSessionScore({ accuracy, lagSec, wpm, rate, points: attemptEvaluation.points })
      : 0;

  const lastSessionForLanguage = useMemo(
    () => findLastSessionForLanguage(sessions, metricsLanguageView),
    [sessions, metricsLanguageView],
  );
  const languageTodaySummary = useMemo(
    () => buildRangeSummaryForLanguage(sessions, metricsLanguageView, metricsRangeView),
    [sessions, metricsLanguageView, metricsRangeView],
  );
  const ttsHasText = ttsText.trim().length > 0;
  const ttsTranscript = useMemo(() => buildTextTranscript(ttsText), [ttsText]);
  const ttsPracticeEvaluation = useMemo(
    () => evaluateTranscriptAttempt(ttsPracticeText, ttsTranscript),
    [ttsPracticeText, ttsTranscript],
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
      : activeInputMode === 'input3'
        ? kokoroPracticeEvaluation.points
        : attemptEvaluation.points;
  const activeVisibleAccuracy =
    activeInputMode === 'input2' || activeInputMode === 'input4'
      ? ttsVisibleAccuracy
      : activeInputMode === 'input3'
        ? kokoroVisibleAccuracy
        : visibleAccuracy;
  const activeVisibleScore =
    activeInputMode === 'input2' || activeInputMode === 'input4'
      ? ttsVisibleScore
      : activeInputMode === 'input3'
        ? kokoroVisibleScore
        : visibleScore;

  useEffect(() => {
    if (!running || !transcript || !engineRef.current || targetWords.length === 0) {
      return;
    }

    const id = window.setInterval(() => {
      const engine = engineRef.current;
      if (!engine) return;

      const audioTime = engine.getCurrentTime();
      setCurrentAudioTime(audioTime);
      const tracker = trackerRef.current;
      const typedWordIndex = tracker.getTypedWordIndex();
      const currentWpm = tracker.getWpm(audioTime);
      const currentAccuracy = tracker.getAccuracyPercent();

      const sync = deriveSyncState({
        transcript,
        audioTime,
        typedWordIndex,
        wpm: currentWpm,
        accuracy: currentAccuracy,
      });

      const historyProfile = buildHistoricalPerformanceProfile(sessions, historyServiceRef.current, 'audio', transcriptionLanguage);
      const audioTelemetry = buildAudioTelemetryFrame({
        inputMode: 'audio',
        phraseId: `audio-${sync.expectedWordIndex}`,
        audioTime,
        phraseDurationSec: transcript.words[transcript.words.length - 1]?.end ?? 0,
        typedProgressRatio: transcript.words.length > 0 ? typedWordIndex / transcript.words.length : 0,
        typedWordIndex,
        expectedWordIndex: sync.expectedWordIndex,
        lagWords: sync.lagWords,
        lagChars: Math.abs(sync.lagWords) * 5,
        phraseDifficulty: 1,
        phraseLengthWords: transcript.words.length,
        phraseLengthChars: transcript.words.length * 5,
        currentPlaybackRate: engine.getRate(),
        currentPauseAfterPhraseMs: config.tickMs,
        language: transcriptionLanguage,
        trend,
        accuracy: clamp01(sync.accuracy / 100),
        errorRate: clamp01(1 - sync.accuracy / 100),
        wpm: currentWpm,
        pauseMs: 0,
        longestPauseMs: 0,
        backspaceRate: 0,
        correctionRate: 0,
      });

      const adaptiveDecision = adaptiveControllerRef.current.decide(buildAdaptiveAudioInput(audioTelemetry, historyProfile));
      const syncDecision = controllerRef.current.decide(sync, engine.getRate(), performance.now(), transcript);

      let nextRate = adaptiveDecision.playbackRate;
      if (syncDecision.action === 'pause_repeat' && syncDecision.repeatFromSec !== undefined) {
        engine.pause();
        engine.seek(syncDecision.repeatFromSec);
        engine.setRate(syncDecision.nextRate);
        setTimeout(() => {
          void engine.play();
        }, 150);
        } else {
          if (syncDecision.action === 'speed_down') {
            nextRate = Math.min(nextRate, syncDecision.nextRate);
          }
        if (syncDecision.action === 'speed_up') {
          nextRate = Math.max(nextRate, syncDecision.nextRate);
        }
          engine.setRate(nextRate);
        }

        recordAdaptiveBenchmark(audioTelemetry, adaptiveDecision, {
          actualPlaybackRate: engine.getRate(),
          event: syncDecision.action === 'pause_repeat' ? 'replay' : syncDecision.action === 'speed_up' || syncDecision.action === 'speed_down' ? 'rate_change' : undefined,
          throttleMs: 1000,
        });

        setControllerState(syncDecision.action);
      setRate(engine.getRate());
      setLagSec(sync.lagSec);
      setLagWords(sync.lagWords);
      setWpm(sync.wpm);
      setAccuracy(sync.accuracy);
      const lagImproved = Math.abs(sync.lagSec) < Math.abs(previousLagRef.current);
      const accuracyImproved = sync.accuracy > previousAccuracyRef.current + 0.5;
      const worsening = Math.abs(sync.lagSec) > Math.abs(previousLagRef.current) + 0.4 && sync.accuracy + 1 < previousAccuracyRef.current;
      if (lagImproved || accuracyImproved) {
        setTrend('improving');
      } else if (worsening) {
        setTrend('declining');
      } else {
        setTrend('stable');
      }
      previousLagRef.current = sync.lagSec;
      previousAccuracyRef.current = sync.accuracy;

      const prev = telemetryRef.current;
      if (!prev) return;
    const next = { ...prev, rateDistribution: prev.rateDistribution.map((entry) => ({ ...entry })), actions: [...prev.actions], lagSeries: [...prev.lagSeries], wpmSeries: [...prev.wpmSeries], accuracySeries: [...prev.accuracySeries] };
      trackSample(next, sync.lagSec, sync.wpm, sync.accuracy, engine.getRate());
      trackAction(next, audioTime, syncDecision.action, engine.getRate());
      telemetryRef.current = next;
    }, config.tickMs);

    return () => window.clearInterval(id);
  }, [running, transcript, targetWords.length, config.tickMs]);

  useEffect(() => {
    if (activeInputMode !== 'input2' || sessionStatus === 'finished' || !ttsHasText) {
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
    sessionStatus,
    ttsHasText,
    ttsPracticeEvaluation.lastMatchedTargetIndex,
    ttsPracticeEvaluation.points,
    ttsPracticeWords.length,
    ttsSpeechRate,
    ttsStatus,
    ttsTranscript,
    ttsVisibleAccuracy,
  ]);

  useEffect(() => {
    if (activeInputMode !== 'input3' || sessionStatus === 'finished' || !kokoroHasText || kokoroStatus !== 'playing') {
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

    setAudioUrl(activeSession.audioUrl);
    setAudioSourceUrlInput(activeSession.audioSourceUrlInput);
    setLoadedAudioFromUrl(activeSession.audioUrl.startsWith('blob:') ? '' : activeSession.audioUrl);
    setAudioFile(null);
    setTranscriptionLanguage(activeSession.transcriptionLanguage ?? 'de');
    setTranscript(activeSession.transcript);
    setInputText(activeSession.inputText);
    setDifficulty(activeSession.difficulty);
    setInputSettingsLocked(Boolean(activeSession.inputSettingsLocked));
    setTtsLanguage(activeSession.ttsLanguage ?? 'de');
    setTtsPracticeText(activeSession.ttsPracticeText ?? '');
    setKokoroText(activeSession.kokoroText ?? '');
    setKokoroLanguage(activeSession.kokoroLanguage ?? 'en');
    setKokoroVoice(activeSession.kokoroVoice ?? 'default');
    setKokoroPracticeText(activeSession.kokoroPracticeText ?? '');
    setKokoroChunks(activeSession.kokoroChunks ?? []);
    setSessionStatus(activeSession.status);
    setAudioReady(Boolean(activeSession.audioUrl));
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
    setAudioReadyMessage(
      activeSession.audioUrl
        ? `Audio ready: ${activeSession.audioLabel || 'Saved source'}`
        : activeSession.audioLabel
          ? activeSession.audioLabel
          : '',
    );
    setTranscriptReadyMessage(
      activeSession.transcript
        ? `Transcript loaded (${activeSession.transcript.words.length} words).`
        : '',
    );
    setRunning(false);
    setRate(1);
    setLagSec(0);
    setLagWords(0);
    setWpm(0);
    setAccuracy(100);
    setCurrentAudioTime(0);
    setTrend('stable');
    setControllerState('hold');
    telemetryRef.current = cloneTelemetry(activeSession.telemetry);
    setExportMessage('');
    setError('');
    previousLagRef.current = 0;
    previousAccuracyRef.current = 100;
    trackerRef.current.reset();
    controllerRef.current.reset();
    engineRef.current?.reset();
    ttsStartedAtMsRef.current = null;
    ttsChunkStartMsRef.current = null;
    ttsChunkStartWordIndexRef.current = 0;
    ttsChunkWordCountRef.current = 0;
    ttsCompletedSourceWordsRef.current = 0;
    ttsLagOutlierCountRef.current = 0;
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
    phrasePlaybackEventsRef.current = [];
    phrasePlaybackTotalPhrasesRef.current = 0;
    delete sessionFeedbackContextRef.current[activeSessionId];
    kokoroEngineRef.current?.stop();
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSession) return;

    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== activeSession.id) {
          return session;
        }
        // Opening a finished session should be read-only and must not rewrite updatedAt.
        if (session.status === 'finished' && sessionStatus === 'finished') {
          return session;
        }

        const nextAudioLabel = audioFile
          ? `Local file selected: ${audioFile.name} (re-attach after reload)`
          : loadedAudioFromUrl
            ? 'URL audio source'
            : session.audioLabel;
        const nextAudioUrl = audioFile ? '' : audioUrl;
        const changed =
          session.audioUrl !== nextAudioUrl ||
          session.audioSourceUrlInput !== audioSourceUrlInput ||
          session.audioLabel !== nextAudioLabel ||
          session.transcriptionLanguage !== transcriptionLanguage ||
          session.transcript !== transcript ||
          session.inputText !== inputText ||
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
          session.status !== sessionStatus ||
          session.metrics.controllerState !== controllerState ||
          session.metrics.rate !== rate ||
          session.metrics.lagSec !== lagSec ||
          session.metrics.lagWords !== lagWords ||
          session.metrics.wpm !== wpm ||
          session.metrics.accuracy !== activeVisibleAccuracy ||
          session.metrics.trend !== trend ||
          session.metrics.score !== activeVisibleScore ||
          session.metrics.points !== activePoints ||
          !telemetryEquals(session.telemetry, telemetryRef.current);

        if (!changed) {
          return session;
        }

        return {
          ...session,
          audioUrl: nextAudioUrl,
          audioSourceUrlInput,
          audioLabel: nextAudioLabel,
          transcriptionLanguage,
          transcript,
          inputText,
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
          status: sessionStatus,
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
          telemetry: cloneTelemetry(telemetryRef.current),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }, [
    activeSession,
    audioFile,
    audioSourceUrlInput,
    audioUrl,
    difficulty,
    inputText,
    inputSettingsLocked,
    kokoroLanguage,
    kokoroChunks,
    kokoroPracticeText,
    kokoroText,
    kokoroVoice,
    lagSec,
    lagWords,
    loadedAudioFromUrl,
    rate,
    transcript,
    transcriptionLanguage,
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
    wpm,
  ]);

  function onAudioFile(file: File | null): void {
    if (!file) return;
    if (setupLocked) {
      setError('Input settings are locked for this session.');
      return;
    }
    setAudioFile(file);
    setLoadedAudioFromUrl('');
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    if (audioRef.current) {
      engineRef.current = new AudioEngine(audioRef.current);
      engineRef.current.load(url);
      setAudioReady(true);
      setAudioReadyMessage(`Audio loaded successfully: ${file.name}`);
    }
  }

  function onAudioUrlLoad(): void {
    if (setupLocked) {
      setError('Input settings are locked for this session.');
      return;
    }
    if (!audioRef.current) return;
    const url = normalizeAudioUrl(audioSourceUrlInput.trim());
    if (!url) {
      setError('Enter a valid audio URL.');
      return;
    }

    setAudioUrl(url);
    setAudioFile(null);
    setLoadedAudioFromUrl(url);
    if (audioRef.current) {
      engineRef.current = new AudioEngine(audioRef.current);
      engineRef.current.load(url);
      setAudioReady(true);
      setAudioReadyMessage('Audio URL loaded successfully.');
    }
    setError('');
  }

  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;
    if (!engineRef.current) {
      engineRef.current = new AudioEngine(audioRef.current);
    }
    engineRef.current.load(audioUrl);
    setAudioReady(true);
    if (!audioReadyMessage) {
      setAudioReadyMessage('Audio loaded successfully.');
    }
  }, [audioUrl]);

  async function generateTranscriptFromAudio(): Promise<void> {
    if (setupLocked) {
      setError('Input settings are locked for this session.');
      return;
    }
    if (!audioFile) {
      if (!loadedAudioFromUrl) {
        setError('Upload an audio file or load an audio URL first.');
        return;
      }
    }

    setTranscribing(true);
    setTranscriptionProgress(6);
    setError('');

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          audioFile
            ? await buildFilePayload(audioFile, transcriptionLanguage)
            : {
                audioUrl: loadedAudioFromUrl,
                language: transcriptionLanguage,
              },
        ),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Transcription failed');
      }
      setTranscriptionProgress(92);

      const payload = (await response.json()) as Transcript;
      const normalized = normalizeTranscript(payload);
      setTranscript(normalized);
      setTranscriptReadyMessage(`Transcription loaded (${normalized.words.length} words).`);
      setTranscriptionProgress(100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate transcript.');
      setTranscriptReadyMessage('');
      setTranscriptionProgress(0);
    } finally {
      setTranscribing(false);
    }
  }

  useEffect(() => {
    if (!transcribing) {
      if (transcriptionProgress >= 100) {
        const doneReset = window.setTimeout(() => setTranscriptionProgress(0), 1200);
        return () => window.clearTimeout(doneReset);
      }
      return;
    }

    const id = window.setInterval(() => {
      setTranscriptionProgress((prev) => {
        if (prev >= 88) return prev;
        const step = prev < 30 ? 4 : prev < 65 ? 2.5 : 1.2;
        return Math.min(88, prev + step);
      });
    }, 250);

    return () => window.clearInterval(id);
  }, [transcribing, transcriptionProgress]);

  async function onTranscriptFile(file: File | null): Promise<void> {
    if (!file) return;
    if (setupLocked) {
      setError('Input settings are locked for this session.');
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseTranscript(text);
      const normalized = normalizeTranscript(parsed);
      setTranscript(normalized);
      setTranscriptReadyMessage(`Transcript file loaded (${normalized.words.length} words).`);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not parse transcript file.');
      setTranscriptReadyMessage('');
    }
  }

  async function startSession(): Promise<void> {
    if (!engineRef.current || !transcript || sessionStatus === 'finished') {
      setError('Load audio and transcript before starting.');
      return;
    }

    if (sessionStatus !== 'paused') {
      trackerRef.current.reset();
      controllerRef.current.reset();
      telemetryRef.current = createTelemetry();
      beginAdaptiveSessionFeedback('audio', transcriptionLanguage, transcript.words.length);
      setTrend('stable');
      previousLagRef.current = 0;
      previousAccuracyRef.current = 100;
    }
    setRunning(true);
    setSessionStatus('running');
    setError('');
    await engineRef.current.play();
  }

  function pauseSession(): void {
    if (sessionStatus === 'finished') return;
    engineRef.current?.pause();
    setRunning(false);
    setSessionStatus('paused');
  }

  function finishSession(): void {
    if (sessionStatus === 'finished') return;
    engineRef.current?.pause();
    setRunning(false);
    setSessionStatus('finished');
    telemetryRef.current = telemetryRef.current
      ? { ...telemetryRef.current, finishedAt: new Date().toISOString() }
      : telemetryRef.current;
    completeAdaptiveSessionFeedback();
  }

  function resetSession(): void {
    engineRef.current?.reset();
    stopTtsPlayback();
    stopKokoroPlayback();
    trackerRef.current.reset();
    controllerRef.current.reset();
    setInputText('');
    setTtsPracticeText('');
    setKokoroPracticeText('');
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
    setCurrentAudioTime(0);
    setControllerState('hold');
    setSessionStatus('ready');
    setInputSettingsLocked(false);
    if (activeInputMode === 'input1') {
      setSetupExpanded(true);
    } else if (activeInputMode === 'input2') {
      setTtsExpanded(true);
    } else if (activeInputMode === 'input4') {
      setQwenExpanded(true);
    } else {
      setKokoroExpanded(true);
    }
    telemetryRef.current = null;
    phrasePlaybackEventsRef.current = [];
    phrasePlaybackTotalPhrasesRef.current = 0;
    if (activeSession) {
      delete sessionFeedbackContextRef.current[activeSession.id];
    }
    setAudioReady(Boolean(audioUrl));
    setAudioReadyMessage(audioUrl ? 'Audio loaded successfully.' : '');
    setTranscriptReadyMessage(
      transcript ? `Transcript loaded (${transcript.words.length} words).` : '',
    );
  }

  function lockInputSettings(): void {
    if (inputSettingsLocked) return;
    if (!inputSettingsReady) {
      if (activeInputMode === 'input1') {
        setError('Load audio and transcript before locking Input #1.');
      } else if (activeInputMode === 'input2' || activeInputMode === 'input4') {
        setError('Paste TTS text before locking this input.');
      } else {
        setError('Paste Kokoro source text before locking Input #3.');
      }
      return;
    }
    setInputSettingsLocked(true);
    setSetupExpanded(false);
    setTtsExpanded(false);
    setQwenExpanded(false);
    setKokoroExpanded(false);
    setError('');
    setExportMessage('Input settings locked for this session.');
  }

  function createSession(): void {
    setSidebarExpanded(true);
    setSessionCreationMode('input1');
    setSessionCreationSource('plainText');
    setSessionCreationName('');
    setDictationScriptJson('');
    setDictationScriptValidation(null);
  }

  function createSessionWithMode(inputMode: SessionInputMode): void {
    const name = sessionCreationName.trim();
    if (!name) {
      setError('Enter a session name before creating the session.');
      return;
    }
    const nextSession = createStoredSession(
      getNextSessionIndex(sessions),
      inputMode,
      name,
    );
    setSessions((prev) => [nextSession, ...prev]);
    setActiveSessionId(nextSession.id);
    setWorkspaceMode(
      inputMode === 'input1'
        ? 'training'
        : inputMode === 'input2' || inputMode === 'input4'
          ? 'tts'
          : 'kokoro',
    );
    setDashboardSessionId(null);
    setSessionCreationMode(null);
    setSessionCreationSource('plainText');
    setSessionCreationName('');
    setDictationScriptJson('');
    setDictationScriptValidation(null);
    setSetupExpanded(true);
    setTtsExpanded(true);
    setQwenExpanded(true);
    setKokoroExpanded(true);
  }

  function validateScriptImport(): void {
    setDictationScriptValidation(parseDictationScriptJson(dictationScriptJson));
  }

  function createSessionFromDictationScript(): void {
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
        errors: ['inputMode must match input1/input2/input3/input4 or audio/browser-tts/kokoro/qwen-cloud.'],
      });
      return;
    }

    const nextSession = createSessionFromScript(result.script, getNextSessionIndex(sessions), inputMode);
    setSessions((prev) => [nextSession, ...prev]);
    setActiveSessionId(nextSession.id);
    setWorkspaceMode(inputMode === 'input1' ? 'training' : inputMode === 'input2' || inputMode === 'input4' ? 'tts' : 'kokoro');
    setDashboardSessionId(null);
    setSessionCreationMode(null);
    setSessionCreationSource('plainText');
    setSessionCreationName('');
    setDictationScriptJson('');
    setDictationScriptValidation(null);
    setSetupExpanded(false);
    setTtsExpanded(false);
    setQwenExpanded(false);
    setKokoroExpanded(false);
    setError('');
    setExportMessage('DictationScript session created and locked.');
  }

  function buildSemanticPhrasesForCurrentSession(text: string, language: string | undefined, mode: TtsPacingMode): SemanticPhrase[] {
    if (activeSession?.sessionSource === 'dictationScript' && activeSession.dictationScript) {
      return buildSemanticPhrasesFromDictationScript(activeSession.dictationScript);
    }
    return buildOrderedSemanticPhrases(text, language, mode);
  }

  function deleteSession(sessionId: string): void {
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
  }

  function getActiveTypingLanguage(): TypingLanguage | null {
    if (activeInputMode === 'input1') {
      return transcriptionLanguage;
    }
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
    if (language === 'en' || language === 'de') {
      return 'de-keyboard';
    }
    return null;
  }

  function openAdaptiveForActiveInput(): void {
    if (!activeSession) return;
    const inputMode = mapSessionInputMode(activeSession.inputMode);
    const languageCandidate = resolveStoredSessionLanguage(activeSession);
    const language: BenchmarkLanguageButton =
      languageCandidate === 'en' || languageCandidate === 'es' || languageCandidate === 'de' ? languageCandidate : 'en';
    setSelectedBenchmarkInputMode(inputMode);
    setSelectedBenchmarkLanguage(language);
    setBenchmarkExportMessage('');
    setScriptPromptMessage('');
    setSessionFeedbackMessage('');
    setAdaptiveBenchmarksFocusAnchor('sessionFeedback');
    setAdaptiveSectionExpanded((prev) => ({ ...prev, benchmarks: true }));
    setWorkspaceMode('adaptive');
    setDashboardSessionId(null);
    window.setTimeout(() => {
      document.getElementById('adaptive-session-feedback')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
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

  function onTypingChange(value: string): void {
    if (sessionStatus === 'finished') return;
    setInputText(value);
    const audioTime = engineRef.current?.getCurrentTime() ?? 0;
    trackerRef.current.onInput(value, audioTime, targetWords);
  }

  function onTypingKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    handleEsKeyboardRemapKeyDown(event, onTypingChange);
  }

  function onTtsTextChange(value: string): void {
    if (inputSettingsLocked || sessionStatus === 'finished') return;
    setTtsText(value);
    setTtsStatus(value.trim().length > 0 ? 'ready' : 'idle');
  }

  function onTtsPracticeChange(value: string): void {
    if (sessionStatus === 'finished') return;
    if (!telemetryRef.current || !telemetryRef.current.startedAt) {
      telemetryRef.current = { ...cloneTelemetry(telemetryRef.current), startedAt: new Date().toISOString() };
    }
    if (ttsStartedAtMsRef.current === null) {
      ttsStartedAtMsRef.current = performance.now();
    }
    setTtsPracticeText(value);
  }

  function onTtsPracticeKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    handleEsKeyboardRemapKeyDown(event, onTtsPracticeChange);
  }

  function onKokoroTextChange(value: string): void {
    if (inputSettingsLocked || sessionStatus === 'finished') return;
    setKokoroText(value);
    setKokoroStatus(value.trim().length > 0 ? 'ready' : 'idle');
  }

  function onKokoroPracticeChange(value: string): void {
    if (sessionStatus === 'finished') return;
    if (!telemetryRef.current || !telemetryRef.current.startedAt) {
      telemetryRef.current = { ...cloneTelemetry(telemetryRef.current), startedAt: new Date().toISOString() };
    }
    if (kokoroStartedAtMsRef.current === null) {
      kokoroStartedAtMsRef.current = performance.now();
    }
    setKokoroPracticeText(value);
  }

  function onKokoroPracticeKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    handleEsKeyboardRemapKeyDown(event, onKokoroPracticeChange);
  }

  async function ensureKokoroServiceRunning(): Promise<boolean> {
    if (await checkKokoroHealth()) {
      return true;
    }
    await startKokoroSidecar();
    const attempts = 20;
    for (let index = 0; index < attempts; index += 1) {
      if (await checkKokoroHealth()) {
        return true;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
    return false;
  }

  async function toggleKokoroEnabled(): Promise<void> {
    if (kokoroEnabled) {
      if (kokoroStatus === 'playing' || kokoroStatus === 'paused') {
        stopKokoroPlayback('hold');
      }
      setError('');
      setKokoroEnabled(false);
      return;
    }

    setError('');
    setKokoroServiceReady(null);
    try {
      const ready = await ensureKokoroServiceRunning();
      setKokoroServiceReady(ready);
      if (!ready) {
        setError('Could not start Kokoro service. Check services/kokoro_tts/.venv and try again.');
        setKokoroEnabled(false);
        return;
      }
      setKokoroEnabled(true);
    } catch (error) {
      setKokoroServiceReady(false);
      setKokoroEnabled(false);
      setError(error instanceof Error ? error.message : 'Could not start Kokoro service.');
    }
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

  function applyTtsPerformanceSample(options: { action?: ControlAction; finalize?: boolean } = {}): void {
    const now = performance.now();
    if (ttsStartedAtMsRef.current === null) {
      ttsStartedAtMsRef.current = now;
    }

    const sourceWordCount = ttsTranscript?.words.length ?? 0;
    const typedProgress = Math.max(0, ttsPracticeEvaluation.lastMatchedTargetIndex + 1);
    const spokenPosition = estimateTtsSpokenWordIndex(now);
    const nextLagWords = sourceWordCount > 0 ? spokenPosition - typedProgress : 0;
    const wordsPerSecond = Math.max(1, TTS_BASE_WORDS_PER_SECOND * ttsSpeechRate);
    const nextRawLagSec = nextLagWords / wordsPerSecond;
    const lagSample = buildLagStabilitySample(nextRawLagSec);
    if (lagSample.isOutlier) {
      ttsLagOutlierCountRef.current += 1;
    }
    const nextLagSec = lagSample.stableLagSec;
    const elapsedMinutes = Math.max(getTtsElapsedSeconds(now) / 60, 1 / 60);
    const nextWpm = ttsPracticeWords.length > 0 ? ttsPracticeWords.length / elapsedMinutes : 0;
    const nextAccuracy = ttsPracticeWords.length > 0 ? ttsVisibleAccuracy : 100;
    const nextControllerAction = deriveTtsControlAction({
      accuracy: nextAccuracy,
      lagSec: nextLagSec,
      wpm: nextWpm,
      typedWords: ttsPracticeWords.length,
    });
    const nextTrend = derivePerformanceTrend(nextLagSec, nextAccuracy, previousLagRef.current, previousAccuracyRef.current);
    const nextRate = ttsSpeechRate;

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

    setControllerState(nextControllerAction);
    setRate(nextRate);
    setLagSec(nextLagSec);
    setLagWords(nextLagWords);
    setWpm(nextWpm);
    setAccuracy(nextAccuracy);
    setTrend(nextTrend);
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
  }

  applyTtsPerformanceSampleRef.current = applyTtsPerformanceSample;

  function submitTtsSession(): void {
    if (!canSubmitTtsSession) {
      setError('Paste TTS text and type your attempt before submitting.');
      return;
    }

    applyTtsPerformanceSample({ action: 'submit', finalize: true });
    stopTtsPlayback();
    setRunning(false);
    setSessionStatus('finished');
    setTtsStatus('finished');
    completeAdaptiveSessionFeedback();
    setError('');
  }

  function playTts(): void {
    if (sessionStatus === 'finished') {
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

    if (!('speechSynthesis' in window)) {
      setError('This browser does not support speech synthesis.');
      return;
    }

    stopTtsPlayback();
    const sourceWords = buildTtsSourceWords(ttsText);
    if (sourceWords.length === 0) {
      setError('Paste TTS text before playing.');
      return;
    }

    const speech = window.speechSynthesis;
    let chunkIndex = 0;
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
    let lastPhraseSize: PhraseSize = 'medium';
    let lastBoundaryStrictness: 'sentence' | 'clause' | 'phrase' = 'sentence';
    beginAdaptiveSessionFeedback('browser-tts', ttsLanguage, semanticPhrases.length);
    ttsSemanticPhraseAdvanceCountRef.current = 0;
    ttsSemanticPhraseReplayCountRef.current = 0;
    ttsStartedAtMsRef.current = performance.now();
    ttsCompletedSourceWordsRef.current = 0;
    ttsLagOutlierCountRef.current = 0;
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

      const historyProfile = buildHistoricalPerformanceProfile(sessions, historyServiceRef.current, 'browser-tts', ttsLanguage);
      const liveSignal = ttsLiveSignalRef.current;
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

      const germanShortBias = ttsLanguage === 'de' && (liveSignal.lagSec > 2.0 || liveSignal.accuracy < 82);
      const candidateChunk =
        planBrowserTtsAdaptiveChunk({
          macroWords,
          macroWordOffset,
          globalStartWordIndex: macroStartWordIndex,
          language: ttsLanguage,
          nextPhraseSize: lastPhraseSize,
          boundaryStrictness: lastBoundaryStrictness,
          germanShortBias,
        }) ??
        planBrowserTtsAdaptiveChunk({
          macroWords,
          macroWordOffset,
          globalStartWordIndex: macroStartWordIndex,
          language: ttsLanguage,
          nextPhraseSize: 'short',
          boundaryStrictness: 'phrase',
          germanShortBias,
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
        typedProgressRatio: sourceWords.length > 0 ? Math.max(0, ttsPracticeEvaluation.lastMatchedTargetIndex + 1) / sourceWords.length : 0,
        lagSec: liveSignal.lagSec,
        lagWords: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND)),
        lagChars: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND * 5)),
        rawLagSec: liveSignal.rawLagSec,
        stableLagSec: liveSignal.stableLagSec,
        lagOutlierCount: liveSignal.lagOutlierCount,
        accuracy: clamp01(liveSignal.accuracy / 100),
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
      const decision = adaptiveControllerRef.current.decide(buildAdaptiveBrowserTtsInput(browserTelemetry, historyProfile));
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
        }) ?? candidateChunk;

      // Persist the last decision outputs so the next candidate chunk reflects where we were heading.
      lastPhraseSize = decision.nextPhraseSize;
      lastBoundaryStrictness = decision.boundaryStrictness;

      const pauseAtBoundary = chunk.canPauseAfter ?? true;
      const semanticCompleteness = chunk.semanticCompleteness ?? 1;
      const rate = decision.playbackRate;
      const effectivePauseNow = decision.shouldPauseNow && pauseAtBoundary;
      const effectiveReplay = false;
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
      const chunkTelemetry = buildBrowserTtsTelemetryFrame({
        inputMode: 'browser-tts',
        phraseId: `tts-${chunkIndex}-chunk`,
        estimatedSpokenRatio: sourceWords.length > 0 ? estimateTtsSpokenWordIndex() / sourceWords.length : 0,
        typedProgressRatio: sourceWords.length > 0 ? Math.max(0, ttsPracticeEvaluation.lastMatchedTargetIndex + 1) / sourceWords.length : 0,
        lagSec: liveSignal.lagSec,
        lagWords: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND)),
        lagChars: Math.max(0, Math.round(liveSignal.lagSec * TTS_BASE_WORDS_PER_SECOND * 5)),
        rawLagSec: liveSignal.rawLagSec,
        stableLagSec: liveSignal.stableLagSec,
        lagOutlierCount: liveSignal.lagOutlierCount,
        accuracy: clamp01(liveSignal.accuracy / 100),
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
        currentPlaybackRate: ttsSpeechRate,
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
      recordAdaptiveBenchmark(chunkTelemetry, decision, {
        actualPlaybackRate: rate,
        actualPauseMs: effectivePauseNow ? decision.pauseAfterPhraseMs : 0,
        replayExecuted: effectiveReplay,
        actualBoundaryType: chunk.phraseBoundaryType,
        event: effectiveReplay ? 'replay' : effectivePauseNow ? 'pause' : decision.deferPauseUntilSafeBoundary ? 'defer_pause' : 'phrase_advance',
        phraseIndex: macroPhraseIndex,
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
          currentPhraseIndex: macroPhraseIndex,
          currentPhraseId: semanticPhrase?.id ?? `phrase-${macroPhraseIndex}`,
          currentPhraseTextPreview: chunk.text.slice(0, 80),
          totalSemanticPhrases: semanticPhrases.length,
          phraseAdvanceCount: ttsSemanticPhraseAdvanceCountRef.current,
          phraseReplayCount: ttsSemanticPhraseReplayCountRef.current,
          lastPhraseAdvanceReason: 'phrase_start',
        };
      });

      utterance.onend = () => {
        if (cancelled) return;
        const completesMacroPhrase = macroWordOffset + chunk.wordCount >= macroWords.length;
        if (completesMacroPhrase) {
          recordPhrasePlaybackEvent('phrase_completed', 'browser-tts', ttsLanguage, semanticPhrase, macroPhraseIndex);
        }
        ttsCompletedSourceWordsRef.current = chunk.startWordIndex + chunk.wordCount;
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
          }, decision.pauseAfterPhraseMs);
        } else {
          speakNext();
        }
      };

      utterance.onerror = () => {
        if (cancelled) return;
        cancelled = true;
        ttsUtteranceRef.current = null;
        setTtsStatus('paused');
        setError('TTS playback stopped unexpectedly.');
      };

      speech.speak(utterance);
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

  async function ensureCosyVoiceCacheSidecar(): Promise<boolean> {
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
    if (sessionStatus === 'finished') {
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
    beginAdaptiveSessionFeedback('qwen-cloud', ttsLanguage, semanticPhrases.length);
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

      const historyProfile = buildHistoricalPerformanceProfile(sessions, historyServiceRef.current, 'qwen-cloud', ttsLanguage);
      const liveSignal = ttsLiveSignalRef.current;
      const semanticPhrase = semanticPhrases[currentPhraseIndex];
      const wordIndex = wordIndexForSemanticPhrase(semanticPhrases, currentPhraseIndex);
      recordPhrasePlaybackEvent('phrase_started', 'qwen-cloud', ttsLanguage, semanticPhrase, currentPhraseIndex);
      const qwenTelemetry = buildQwenCloudTelemetryFrame({
        inputMode: 'qwen-cloud',
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
        inputMode: 'qwen-cloud',
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
        recordPhrasePlaybackEvent('phrase_completed', 'qwen-cloud', ttsLanguage, semanticPhrase, currentPhraseIndex);
        ttsCompletedSourceWordsRef.current = chunk.startWordIndex + chunk.wordCount;
        chunkIndex += 1;
        if (effectiveReplay) {
          ttsSemanticPhraseReplayCountRef.current += 1;
          recordPhrasePlaybackEvent('phrase_replayed', 'qwen-cloud', ttsLanguage, semanticPhrase, currentPhraseIndex);
        } else {
          currentPhraseIndex += 1;
          ttsSemanticPhraseAdvanceCountRef.current += 1;
          recordPhrasePlaybackEvent('phrase_advanced', 'qwen-cloud', ttsLanguage, semanticPhrase, currentPhraseIndex);
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

      const historyProfile = buildHistoricalPerformanceProfile(sessions, historyServiceRef.current, 'qwen-cloud', ttsLanguage);
      const liveSignal = ttsLiveSignalRef.current;
      const semanticPhrase = semanticPhrases[currentPhraseIndex];
      const wordIndex = wordIndexForSemanticPhrase(semanticPhrases, currentPhraseIndex);
      const qwenTelemetry = buildQwenCloudTelemetryFrame({
        inputMode: 'qwen-cloud',
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
        inputMode: 'qwen-cloud',
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

    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.resume();
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
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    ttsUtteranceRef.current = null;
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

  function applyKokoroPerformanceSample(options: { action?: ControlAction; finalize?: boolean } = {}): void {
    const now = performance.now();
    if (kokoroStartedAtMsRef.current === null) {
      kokoroStartedAtMsRef.current = now;
    }

    const sourceWordCount = kokoroTranscript?.words.length ?? 0;
    const typedProgress = Math.max(0, kokoroPracticeEvaluation.lastMatchedTargetIndex + 1);
    const spokenPosition = estimateKokoroSpokenWordIndex(now);
    const nextLagWords = sourceWordCount > 0 ? spokenPosition - typedProgress : 0;
    const wordsPerSecond = Math.max(1, TTS_BASE_WORDS_PER_SECOND * kokoroSpeechRate);
    const nextLagSec = nextLagWords / wordsPerSecond;
    const elapsedMinutes = Math.max(getKokoroElapsedSeconds(now) / 60, 1 / 60);
    const nextWpm = kokoroPracticeWords.length > 0 ? kokoroPracticeWords.length / elapsedMinutes : 0;
    const nextAccuracy = kokoroPracticeWords.length > 0 ? kokoroVisibleAccuracy : 100;
    const nextControllerAction = deriveTtsControlAction({
      accuracy: nextAccuracy,
      lagSec: nextLagSec,
      wpm: nextWpm,
      typedWords: kokoroPracticeWords.length,
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
  }

  applyKokoroPerformanceSampleRef.current = applyKokoroPerformanceSample;

  async function playKokoro(): Promise<void> {
    if (!kokoroEnabled) {
      setError('Kokoro TTS is disabled. Turn it on with the toggle.');
      return;
    }
    if (sessionStatus === 'finished') {
      setError('Reset the finished session before playing Kokoro audio again.');
      return;
    }
    if (!kokoroText.trim()) {
      setError('Paste text before playing Kokoro TTS.');
      return;
    }
    if (isKokoroLanguageBlocked(kokoroLanguage)) {
      setError(KOKORO_GERMAN_WARNING);
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
      setError(KOKORO_GERMAN_WARNING);
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
      const historyProfile = buildHistoricalPerformanceProfile(sessions, historyServiceRef.current, 'kokoro', kokoroLanguage);
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

  function submitKokoroSession(): void {
    if (!canSubmitKokoroSession) {
      setError('Paste Kokoro text and type your attempt before submitting.');
      return;
    }
    applyKokoroPerformanceSample({ action: 'submit', finalize: true });
    stopKokoroPlayback();
    setRunning(false);
    setSessionStatus('finished');
    setKokoroStatus('finished');
    completeAdaptiveSessionFeedback();
    setError('');
  }

  function recordAdaptiveBenchmark(
    live: LiveTelemetryFrame,
    decision: PacingDecision,
    options: {
      actualPlaybackRate?: number;
      actualPauseMs?: number;
      replayExecuted?: boolean;
      actualBoundaryType?: PhraseBoundaryType;
      event?: AdaptiveTimelinePoint['event'];
      phraseIndex?: number;
      totalSemanticPhrases?: number;
      throttleMs?: number;
    } = {},
  ): void {
    const language = normalizeBenchmarkLanguage(live.language);
    const key = `${live.inputMode}:${language}`;
    const now = Date.now();
    const lastUpdate = adaptiveBenchmarkLastUpdateRef.current[key] ?? 0;
    if (options.throttleMs && now - lastUpdate < options.throttleMs) return;
    adaptiveBenchmarkLastUpdateRef.current[key] = now;

    setAdaptiveBenchmarksByInputLanguage((current) => {
      const inputBenchmarks = current[live.inputMode] ?? {};
      const existing = inputBenchmarks[language] ?? createEmptyInputLanguageBenchmark(live.inputMode, language);
      const updated = updateInputLanguageBenchmark({
        current: existing,
        live,
        decision,
        sessionId: activeSessionId,
        phraseIndex: options.phraseIndex,
        totalSemanticPhrases: options.totalSemanticPhrases,
        event: options.event,
        execution: {
          requestedPlaybackRate: decision.playbackRate,
          actualPlaybackRate: options.actualPlaybackRate ?? live.currentPlaybackRate,
          requestedPauseMs: decision.pauseAfterPhraseMs,
          actualPauseMs: options.actualPauseMs,
          requestedReplay: decision.shouldReplayPhrase,
          replayExecuted: options.replayExecuted,
          requestedBoundaryType: live.phraseBoundaryType,
          actualBoundaryType: options.actualBoundaryType ?? live.phraseBoundaryType,
          decisionAppliedAtMs: now,
          executionStartedAtMs: now,
        },
      });
      return {
        ...current,
        [live.inputMode]: {
          ...inputBenchmarks,
          [language]: updated,
        },
      };
    });
  }

  function getBenchmarkSnapshot(inputMode: InputMode, language: LanguageCode): InputLanguageBenchmarkMetrics {
    return adaptiveBenchmarksByInputLanguage[inputMode]?.[language] ?? createEmptyInputLanguageBenchmark(inputMode, language);
  }

  function beginAdaptiveSessionFeedback(inputMode: InputMode, language: LanguageCode, totalPhrases = 0): void {
    if (!activeSession) return;
    const normalizedLanguage = normalizeBenchmarkLanguage(language);
    sessionFeedbackContextRef.current[activeSession.id] = {
      inputMode,
      language: normalizedLanguage,
    };
    sessionBenchmarkBeforeRef.current[activeSession.id] = JSON.parse(JSON.stringify(getBenchmarkSnapshot(inputMode, normalizedLanguage)));
    phrasePlaybackEventsRef.current = [];
    phrasePlaybackTotalPhrasesRef.current = totalPhrases;
  }

  function recordPhrasePlaybackEvent(
    event: PhrasePlaybackEvent['event'],
    inputMode: InputMode,
    language: LanguageCode,
    phrase: SemanticPhrase | null | undefined,
    phraseIndex: number,
  ): void {
    if (!activeSession || phraseIndex < 0) return;
    phrasePlaybackEventsRef.current = [
      ...phrasePlaybackEventsRef.current,
      {
        sessionId: activeSession.id,
        phraseId: phrase?.id ?? `phrase-${phraseIndex}`,
        phraseIndex,
        textPreview: phrase?.text.slice(0, 120) ?? '',
        event,
        timestampMs: Date.now(),
        inputMode,
        language: normalizeBenchmarkLanguage(language),
      },
    ].slice(-500);
  }

  function completeAdaptiveSessionFeedback(): void {
    if (!activeSession) return;
    const context = sessionFeedbackContextRef.current[activeSession.id];
    const inputMode = context?.inputMode ?? mapSessionInputMode(activeSession.inputMode);
    const language = normalizeBenchmarkLanguage(context?.language ?? resolveStoredSessionLanguage(activeSession));
    const before = sessionBenchmarkBeforeRef.current[activeSession.id] ?? getBenchmarkSnapshot(inputMode, language);
    const after = getBenchmarkSnapshot(inputMode, language);
    const feedback = buildAdaptiveSessionFeedback({
      sessionId: activeSession.id,
      inputMode,
      language,
      sourceType: activeSession.sessionSource === 'dictationScript' ? 'dictation_script' : 'plain_text',
      createdAt: activeSession.createdAt,
      completedAt: new Date().toISOString(),
      scriptId: activeSession.dictationScript ? `${activeSession.id}:${activeSession.dictationScript.title}` : undefined,
      scriptTitle: activeSession.dictationScript?.title,
      benchmarkBefore: before,
      benchmarkAfter: after,
      phraseEvents: phrasePlaybackEventsRef.current,
      totalPhrases: phrasePlaybackTotalPhrasesRef.current || undefined,
    });
    setAdaptiveSessionFeedbackByInputLanguage((current) => {
      const inputFeedback = current[inputMode] ?? {};
      const languageFeedback = inputFeedback[language] ?? [];
      const nextLanguageFeedback = [feedback, ...languageFeedback.filter((item) => item.sessionId !== feedback.sessionId)].slice(0, 12);
      return {
        ...current,
        [inputMode]: {
          ...inputFeedback,
          [language]: nextLanguageFeedback,
        },
      };
    });
    delete sessionBenchmarkBeforeRef.current[activeSession.id];
    delete sessionFeedbackContextRef.current[activeSession.id];
  }

  function getBenchmarkActiveSessionStatus(profile: InputLanguageBenchmarkMetrics): string | undefined {
    if (!activeSession || sessionStatus === 'finished') return undefined;
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
      setScriptPromptMessage('LLM prompt copied.');
    } catch {
      setScriptPromptMessage('Could not copy LLM prompt.');
    }
  }

  async function copyBenchmarkWithDictationScriptPrompt(profile: InputLanguageBenchmarkMetrics): Promise<void> {
    try {
      const benchmarkJson = JSON.stringify(buildSelectedBenchmarkExportPayload(profile), null, 2);
      const prompt = buildDictationScriptPrompt(profile);
      await navigator.clipboard.writeText(`Benchmark JSON context:\n${benchmarkJson}\n\nLLM prompt:\n${prompt}`);
      setScriptPromptMessage('Benchmark JSON and LLM prompt copied.');
    } catch {
      setScriptPromptMessage('Could not copy benchmark and LLM prompt.');
    }
  }

  async function copyDictationScriptTemplate(profile: InputLanguageBenchmarkMetrics): Promise<void> {
    try {
      await navigator.clipboard.writeText(buildDictationScriptTemplate(profile.inputMode, profile.language));
      setScriptPromptMessage('Sample output template copied.');
    } catch {
      setScriptPromptMessage('Could not copy sample output template.');
    }
  }

  async function copySessionFeedbackJson(profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null): Promise<void> {
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildSessionFeedbackJsonPayload(profile.inputMode, profile.language, feedback, {
        activeSessionStatus: getBenchmarkActiveSessionStatus(profile),
        fallbackDiagnostics: derivePlaybackDiagnosticsFromTimeline(profile.timeline.slice(-60)),
      }), null, 2));
      setSessionFeedbackMessage('Session feedback JSON copied.');
    } catch {
      setSessionFeedbackMessage('Could not copy session feedback JSON.');
    }
  }

  async function copyBenchmarkFeedbackJson(profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null): Promise<void> {
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildBenchmarkFeedbackPackage(profile, feedback, {
        activeSessionStatus: getBenchmarkActiveSessionStatus(profile),
      }), null, 2));
      setSessionFeedbackMessage('Benchmark + feedback package copied.');
    } catch {
      setSessionFeedbackMessage('Could not copy benchmark + feedback package.');
    }
  }

  async function copyBenchmarkFeedbackPrompt(profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null): Promise<void> {
    try {
      await navigator.clipboard.writeText(buildBenchmarkFeedbackPromptPackage(profile, feedback, buildDictationScriptPrompt(profile), {
        activeSessionStatus: getBenchmarkActiveSessionStatus(profile),
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
      const base = buildBenchmarkFeedbackPackage(profile, feedback, {
        activeSessionStatus: getBenchmarkActiveSessionStatus(profile),
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

  const transcriptPreviewStart = Math.max(0, attemptEvaluation.lastMatchedTargetIndex + 1);
  const transcriptPreview = targetWords.slice(transcriptPreviewStart, transcriptPreviewStart + 12).join(' ');
  const canGenerateTranscript = Boolean(audioFile || loadedAudioFromUrl);
  const canStartSession = Boolean(audioReady && transcript && transcript.words.length > 0 && sessionStatus !== 'finished');
  const canPauseSession = running && sessionStatus === 'running';
  const canFinishSession = sessionStatus !== 'finished' && (running || typedWords.length > 0 || currentAudioTime > 0);
  const inputSettingsReady =
    activeInputMode === 'input1'
      ? Boolean(audioReady && transcript && transcript.words.length > 0)
      : activeInputMode === 'input2' || activeInputMode === 'input4'
        ? ttsHasText
        : kokoroHasText;
  const setupLocked = sessionStatus === 'finished' || inputSettingsLocked;
  const canSubmitTtsSession =
    (activeInputMode === 'input2' || activeInputMode === 'input4') &&
    sessionStatus !== 'finished' &&
    ttsHasText &&
    ttsPracticeWords.length > 0;
  const canSubmitKokoroSession = activeInputMode === 'input3' && sessionStatus !== 'finished' && kokoroHasText && kokoroPracticeWords.length > 0;
  const sessionCreationNameTrimmed = sessionCreationName.trim();
  const canCreateSessionFromDialog = sessionCreationNameTrimmed.length > 0;
  const validatedDictationScript = dictationScriptValidation?.ok ? dictationScriptValidation.script : null;
  const readyChecklist = [
    { label: 'Audio loaded', ready: audioReady },
    { label: 'Transcript loaded', ready: Boolean(transcript && transcript.words.length > 0) },
  ];
  const lockedInputSummaryItems: LockedInputSummaryItem[] =
    activeInputMode === 'input1'
      ? [
          { label: 'Audio source', value: audioSourceUrlInput.trim() || activeSession?.audioLabel || (audioUrl ? 'Loaded audio' : 'Not set') },
          { label: 'Audio ready', value: audioReady ? 'Ready' : 'Not set' },
          { label: 'Transcript', value: transcript ? `${transcript.words.length} words` : 'Not set' },
          { label: 'Language', value: transcriptionLanguage ?? 'Not set' },
          { label: 'Difficulty', value: difficulty },
          { label: 'Status', value: formatSessionStatus(sessionStatus) },
        ]
      : activeInputMode === 'input2'
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
              { label: 'Cache', value: qwenCloudFallbackDetails ? 'Missing cached phrase' : 'Qwen cache' },
              { label: 'Status', value: ttsStatus },
            ]
          : [
              { label: 'Source', value: kokoroHasText ? `${kokoroTranscript?.words.length ?? 0} words` : 'Not set' },
              { label: 'Text length', value: kokoroHasText ? `${kokoroText.length} chars` : 'Not set' },
              { label: 'Language', value: kokoroLanguage ?? 'Not set' },
              { label: 'Native support', value: kokoroLanguage === 'de' ? 'Experimental / not native' : 'Native' },
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
  const selectedSessionFeedback =
    adaptiveSessionFeedbackByInputLanguage[selectedBenchmarkInputMode]?.[selectedBenchmarkLanguage]?.[0] ?? null;
  const latestAdaptiveMode = latestSession ? formatAdaptiveModeFromSession(latestSession) : 'Balanced';
  const latestInputAdapter = latestSession ? adaptiveAdapters.find((adapter) => adapter.inputMode === latestSession.inputMode) : null;

  return (
    <main className={`app ${themeMode === 'dark' ? 'app-theme-dark' : 'app-theme-light'}`}>
      <section className={`layout ${sidebarExpanded ? 'layout-sidebar-expanded' : 'layout-sidebar-collapsed'}`}>
        <section className="panel brand-block brand-header-panel workspace-main-header">
          <div className="brand-header-main">
            <div className="brand-mark">
              <span className="brand-mark-icon" aria-hidden="true">🪗</span>
            </div>
            <div className="brand-copy">
              <h1>Dicta MVP</h1>
              <p>Adaptive real-time dictation training</p>
            </div>
          </div>
          <div className="brand-header-actions">
            <button
              type="button"
              className="secondary-button brand-leaderboard-button"
              onClick={() => {
                setWorkspaceMode((value) => (value === 'leaderboard' ? 'training' : 'leaderboard'));
                setDashboardSessionId(null);
              }}
            >
              {brandActionLabel}
            </button>
          <button
            type="button"
            className="secondary-button brand-adaptive-button"
            onClick={() => {
              setWorkspaceMode('adaptive');
              setDashboardSessionId(null);
            }}
          >
            🧠 Adaptive Pace Layer
          </button>
            <button
              type="button"
              className="secondary-button brand-admin-button"
              onClick={() => {
                setWorkspaceMode('admin');
                setDashboardSessionId(null);
              }}
            >
              Admin
            </button>
            <button
              type="button"
              className="secondary-button theme-toggle-button"
              onClick={() => setThemeMode((value) => (value === 'dark' ? 'light' : 'dark'))}
              aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </section>
        <aside className={`left-pane panel sidebar-panel ${sidebarExpanded ? 'sidebar-panel-expanded' : 'sidebar-panel-collapsed'}`}>
          {sidebarExpanded ? (
            <>
              <section className="sidebar-section">
                <button
                  type="button"
                  className="sidebar-section-heading sidebar-section-toggle"
                  onClick={() => setSessionsExpanded((value) => !value)}
                  aria-expanded={sessionsExpanded}
                >
                  <span>Sessions</span>
                  <span className="sidebar-section-meta">
                    <button
                      type="button"
                      className="secondary-button sessions-collapse-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSidebarExpanded(false);
                      }}
                      aria-label="Collapse sessions panel"
                      title="Collapse sessions panel"
                    >
                      ←
                    </button>
                    {sidebarSessions.length}
                    <span className={`sidebar-chevron ${sessionsExpanded ? 'sidebar-chevron-open' : ''}`}>⌃</span>
                  </span>
                </button>
                {sessionsExpanded ? (
                  <>
                    <div className="sidebar-actions sidebar-actions-single">
                      <button type="button" className="secondary-button" onClick={createSession}>
                        New session
                      </button>
                    </div>
                    {sessionCreationMode ? (
                      <div className="sidebar-card session-create-card" role="dialog" aria-label="Choose input">
                        <p className="sidebar-copy">Choose the source for this new session.</p>
                        <label>
                          Session Source
                          <select
                            value={sessionCreationSource}
                            onChange={(event) => {
                              setSessionCreationSource(event.target.value as SessionSource);
                              setDictationScriptValidation(null);
                            }}
                          >
                            <option value="plainText">Plain Text</option>
                            <option value="dictationScript">DictationScript JSON</option>
                          </select>
                        </label>
                        {sessionCreationSource === 'plainText' ? (
                          <>
                            <label>
                              Session name
                              <input
                                value={sessionCreationName}
                                onChange={(e) => setSessionCreationName(e.target.value)}
                                placeholder="My first session"
                              />
                            </label>
                            <p className="session-create-hint">Enter a name first, then choose the setup.</p>
                            <div className="session-create-actions">
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => createSessionWithMode('input1')}
                                disabled={!canCreateSessionFromDialog}
                              >
                                Input # 1 - Original Audio
                              </button>
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => createSessionWithMode('input2')}
                                disabled={!canCreateSessionFromDialog}
                              >
                                Input # 2 - Text to Speech (TTS)
                              </button>
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => createSessionWithMode('input3')}
                                disabled={!canCreateSessionFromDialog}
                              >
                                Input # 3 - Kokoro TTS Local
                              </button>
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => createSessionWithMode('input4')}
                                disabled={!canCreateSessionFromDialog}
                              >
                                Input # 4 - CosyVoice2 Cache
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="session-script-import">
                            <label>
                              DictationScript JSON
                              <textarea
                                value={dictationScriptJson}
                                onChange={(event) => {
                                  setDictationScriptJson(event.target.value);
                                  setDictationScriptValidation(null);
                                }}
                                rows={10}
                                placeholder='{"title":"Generated Dictation","language":"en","inputMode":"kokoro","phrases":[...]}'
                              />
                            </label>
                            <div className="session-create-actions">
                              <button type="button" className="secondary-button" onClick={validateScriptImport}>
                                Validate Script
                              </button>
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={createSessionFromDictationScript}
                                disabled={!validatedDictationScript}
                              >
                                Create Session
                              </button>
                            </div>
                            {dictationScriptValidation ? (
                              dictationScriptValidation.ok ? (
                                <div className="script-preview">
                                  <p className="success">Script validated.</p>
                                  <div className="today-summary-grid">
                                    <Metric label="Title" value={dictationScriptValidation.script.title} />
                                    <Metric label="Language" value={dictationScriptValidation.script.language} />
                                    <Metric label="Input mode" value={dictationScriptValidation.script.inputMode} />
                                    <Metric label="Difficulty" value={dictationScriptValidation.script.difficulty} />
                                    <Metric label="Phrases" value={String(dictationScriptValidation.script.phrases.length)} />
                                    <Metric label="Duration" value={`${dictationScriptValidation.script.estimatedDurationSec}s`} />
                                  </div>
                                  <div className="script-phrase-preview">
                                    {dictationScriptValidation.script.phrases.slice(0, 3).map((phrase) => (
                                      <p key={phrase.id} className="hint">
                                        {phrase.id}: {phrase.text.slice(0, 120)}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="error">
                                  {dictationScriptValidation.errors.map((message) => (
                                    <p key={message}>{message}</p>
                                  ))}
                                </div>
                              )
                            ) : null}
                          </div>
                        )}
                        <button type="button" className="text-button" onClick={() => setSessionCreationMode(null)}>
                          Cancel
                        </button>
                      </div>
                    ) : null}
                    <div className="sidebar-card">
                      <div>
                        <p className="sidebar-copy">Stored locally in this browser.</p>
                        <div className="live-metrics-language-tabs sidebar-language-tabs" role="tablist" aria-label="Sessions language">
                          {([
                            ['en', 'Sessions for English'],
                            ['es', 'Sessions for Spanish'],
                            ['de', 'Sessions for German'],
                          ] as const).map(([code, label]) => (
                            <button
                              key={code}
                              type="button"
                              className={`live-metrics-language-tab ${sessionsLanguageView === code ? 'live-metrics-language-tab-active' : ''}`}
                              onClick={() => setSessionsLanguageView(code)}
                              aria-pressed={sessionsLanguageView === code}
                              title={label}
                            >
                              {code.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="session-list">
                        {sidebarSessions.length === 0 ? (
                          <div className="leaderboard-empty sidebar-sessions-empty">
                            No sessions yet for {sessionsLanguageView.toUpperCase()}. Create or finish a session in that language to see it here.
                          </div>
                        ) : null}
                        {sidebarSessions.map((session) => (
                          <div
                            key={session.id}
                            role="button"
                            tabIndex={0}
                            className={`session-card ${session.id === activeSessionId ? 'session-card-active' : ''}`}
                            onClick={() => setActiveSessionId(session.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setActiveSessionId(session.id);
                              }
                            }}
                          >
                            <div className="session-card-line">
                              <span className="session-card-title">{session.name || 'Untitled session'}</span>
                              <span className="session-card-date">{formatSessionDate(session.updatedAt)}</span>
                              {sessions.length > 1 ? (
                                <button
                                  type="button"
                                  className="danger-button session-card-delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteSession(session.id);
                                  }}
                                >
                                  Delete
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
              </section>

              {!setupLocked ? (
              activeInputMode === 'input1' ? (
              <section className="sidebar-section sidebar-section-border">
                <button
                  type="button"
                  className="sidebar-section-heading sidebar-section-toggle"
                  onClick={() => setSetupExpanded((value) => !value)}
                  aria-expanded={setupExpanded}
                >
                  <span>{activeInputLabel}</span>
                  <span className="sidebar-section-meta">
                    <span className={`sidebar-chevron ${setupExpanded ? 'sidebar-chevron-open' : ''}`}>⌃</span>
                  </span>
                </button>
                {setupExpanded ? (
                  <>
                    <div className="sidebar-card">
                      <label>
                        Audio file
                        <input type="file" accept="audio/*" disabled={setupLocked} onChange={(e) => onAudioFile(e.target.files?.[0] ?? null)} />
                      </label>
                      <label>
                        Audio URL (direct .mp3/.wav)
                        <input
                          type="url"
                          value={audioSourceUrlInput}
                          disabled={setupLocked}
                          onChange={(e) => setAudioSourceUrlInput(e.target.value)}
                          placeholder="https://.../audio.mp3"
                        />
                        <button type="button" onClick={onAudioUrlLoad} disabled={setupLocked}>Load audio URL</button>
                      </label>
                      <div className="progress-wrap" aria-live="polite">
                        {transcribing || transcriptionProgress > 0 ? (
                          <>
                            <div className="progress-meta">
                              <span>{transcribing ? 'Transcribing audio...' : 'Transcription complete'}</span>
                              <strong>{Math.round(transcriptionProgress)}%</strong>
                            </div>
                            <div className="progress-track">
                              <div className="progress-fill" style={{ width: `${transcriptionProgress}%` }} />
                            </div>
                          </>
                        ) : null}
                      </div>
                      <label>
                        Transcript JSON
                        <input type="file" accept="application/json" disabled={setupLocked} onChange={(e) => void onTranscriptFile(e.target.files?.[0] ?? null)} />
                      </label>
                      <label>
                        Transcription language
                        <select value={transcriptionLanguage} disabled={setupLocked} onChange={(e) => setTranscriptionLanguage(e.target.value as TtsLanguage)}>
                          <option value="de">de</option>
                          <option value="en">en</option>
                          <option value="es">es</option>
                        </select>
                        <button type="button" onClick={() => void generateTranscriptFromAudio()} disabled={!canGenerateTranscript || transcribing || setupLocked}>
                          {transcribing ? 'Generating transcription...' : 'Get transcription'}
                        </button>
                      </label>
                      <label>
                        Difficulty
                        <select value={difficulty} disabled={setupLocked} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                          <option value="easy">easy</option>
                          <option value="normal">normal</option>
                          <option value="hard">hard</option>
                        </select>
                      </label>
                      <div className="input-lock-box">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={lockInputSettings}
                          disabled={setupLocked || !inputSettingsReady}
                        >
                          {setupLocked ? 'Input settings locked' : 'Submit and lock input settings'}
                        </button>
                        <p className="hint">
                          {setupLocked
                            ? 'This input setup is locked for this session.'
                            : 'Lock after audio and transcript are ready.'}
                        </p>
                      </div>
                    </div>
                    {audioReadyMessage ? <p className="success">{audioReadyMessage}</p> : null}
                    {transcriptReadyMessage ? <p className="success">{transcriptReadyMessage}</p> : null}
                    {error ? <p className="error">{error}</p> : null}
                  </>
                ) : null}
              </section>
              ) : activeInputMode === 'input2' ? (
              <section className="sidebar-section sidebar-section-border">
                <button
                  type="button"
                  className="sidebar-section-heading sidebar-section-toggle"
                  onClick={() => setTtsExpanded((value) => !value)}
                  aria-expanded={ttsExpanded}
                >
                  <span className="sidebar-input-heading">
                    <span>{activeInputLabel}</span>
                    {activeInputFeatureLabel ? <span className="sidebar-input-feature">{activeInputFeatureLabel}</span> : null}
                  </span>
                  <span className="sidebar-section-meta">
                    <span className={`tts-paste-pill ${ttsHasText ? 'tts-paste-pill-ready' : 'tts-paste-pill-empty'}`}>
                      {ttsHasText ? 'Pasted' : 'Paste text'}
                    </span>
                    <span className={`sidebar-chevron ${ttsExpanded ? 'sidebar-chevron-open' : ''}`}>⌃</span>
                  </span>
                </button>
                {ttsExpanded ? (
                  <div className="sidebar-card tts-card">
                    <label>
                      TTS text
                      <textarea
                        value={ttsText}
                        onChange={(e) => onTtsTextChange(e.target.value)}
                        placeholder="Paste text here to prepare it for TTS playback..."
                        rows={9}
                        readOnly={setupLocked}
                        disabled={setupLocked}
                      />
                    </label>
                    <label>
                      TTS processing language
                      <select value={ttsLanguage} disabled={setupLocked} onChange={(e) => setTtsLanguage(e.target.value as TtsLanguage)}>
                        <option value="en">en</option>
                        <option value="de">de</option>
                        <option value="es">es</option>
                      </select>
                    </label>
                    <div className={`tts-visor ${ttsHasText ? 'tts-visor-ready' : ''}`} aria-live="polite">
                      {ttsHasText ? 'Text pasted. Ready for TTS playback.' : 'Waiting for pasted text.'}
                    </div>
                    <div className="tts-runtime">
                      <span>Status: {ttsStatus}</span>
                      <span>Rate: {ttsSpeechRate.toFixed(2)}x</span>
                      <span>Language: {ttsLanguage}</span>
                      <span>Pacing: {formatTtsPacingMode(ttsPacingMode)}</span>
                    </div>
                    {ttsCurrentChunk ? <p className="tts-current-chunk">{ttsCurrentChunk}</p> : null}
                    <div className="input-lock-box">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={lockInputSettings}
                        disabled={setupLocked || !inputSettingsReady}
                      >
                        {setupLocked ? 'Input settings locked' : 'Submit and lock input settings'}
                      </button>
                      <p className="hint">
                        {setupLocked
                          ? 'This TTS source and language are locked for this session.'
                          : 'Lock after the TTS text is pasted and the language is selected.'}
                      </p>
                    </div>
                    <p className="hint">
                      Browser built-in feature. This panel is ready for a future TTS engine, such as Gemini 3.1 Flash TTS, with pace control driven by telemetry and typing history.
                    </p>
                  </div>
                ) : null}
              </section>
              ) : activeInputMode === 'input4' ? (
              <section className="sidebar-section sidebar-section-border">
                <button
                  type="button"
                  className="sidebar-section-heading sidebar-section-toggle"
                  onClick={() => setQwenExpanded((value) => !value)}
                  aria-expanded={qwenExpanded}
                >
                  <span className="sidebar-input-heading">
                    <span>{activeInputLabel}</span>
                    {activeInputFeatureLabel ? <span className="sidebar-input-feature">{activeInputFeatureLabel}</span> : null}
                  </span>
                  <span className="sidebar-section-meta">
                    <span className={`tts-paste-pill ${ttsHasText ? 'tts-paste-pill-ready' : 'tts-paste-pill-empty'}`}>
                      {ttsHasText ? 'Pasted' : 'Paste text'}
                    </span>
                    <span className={`sidebar-chevron ${qwenExpanded ? 'sidebar-chevron-open' : ''}`}>⌃</span>
                  </span>
                </button>
                {qwenExpanded ? (
                  <div className="sidebar-card tts-card">
                    <label>
                      CosyVoice2 text
                      <textarea
                        value={ttsText}
                        onChange={(e) => onTtsTextChange(e.target.value)}
                        placeholder="Paste text here to play cached CosyVoice2 audio..."
                        rows={9}
                        readOnly={setupLocked}
                        disabled={setupLocked}
                      />
                    </label>
                    <label>
                      CosyVoice2 language
                      <select value={ttsLanguage} disabled={setupLocked} onChange={(e) => setTtsLanguage(e.target.value as TtsLanguage)}>
                        <option value="en">en</option>
                        <option value="de">de</option>
                        <option value="es">es</option>
                      </select>
                    </label>
                    <div className={`tts-visor ${ttsHasText ? 'tts-visor-ready' : ''}`} aria-live="polite">
                      {ttsHasText ? 'Text pasted. Ready for cached audio playback.' : 'Waiting for pasted text.'}
                    </div>

                    <div className="tts-source-actions input4-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void bootstrapCosyVoiceSidecar()}
                      >
                        1. Bootstrap CosyVoice2
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void ensureCosyVoiceCacheSidecar()}
                      >
                        2. Start CosyVoice2 generator
                      </button>
                    </div>
                    <div className="kokoro-toggle-row">
                      <span
                        className={`kokoro-toggle-status ${
                          cosyVoiceCacheReady ? 'kokoro-on' : cosyVoiceCacheReady === false ? 'kokoro-off' : ''
                        }`}
                      >
                        <span className="kokoro-toggle-dot" />
                        {cosyVoiceCacheReady
                          ? cosyVoiceCacheConfigured
                            ? 'Ready'
                            : 'Running (needs model)'
                          : cosyVoiceCacheReady === false
                            ? 'Error'
                            : 'Not started'}
                      </span>
                    </div>
                    {cosyVoiceCacheRuntime && cosyVoiceCacheConfigured === false ? (
                      <details className="hint">
                        <summary>Why “needs model”?</summary>
                        <pre className="mono">{JSON.stringify(cosyVoiceCacheRuntime, null, 2)}</pre>
                      </details>
                    ) : null}
                    <div className="tts-source-actions input4-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void generateCosyVoiceCacheFromCurrentText()}
                        disabled={!ttsHasText || cosyVoiceCacheGenerating}
                      >
                        {cosyVoiceCacheGenerating ? 'Generating cache…' : '3. Generate cache WAVs'}
                      </button>
                    </div>
                    {cosyVoiceCacheMessage ? <p className="hint">{cosyVoiceCacheMessage}</p> : null}

                    <details className="hint">
                      <summary>Optional (Colab): export manifest</summary>
                      <div className="tts-source-actions input4-actions">
                        <button type="button" className="secondary-button" onClick={copyQwenCloudCacheManifest} disabled={!ttsHasText}>
                          Copy Cache Manifest JSON
                        </button>
                        <button type="button" className="secondary-button" onClick={downloadQwenCloudCacheManifest} disabled={!ttsHasText}>
                          Export Cache Manifest JSON
                        </button>
                      </div>
                      {qwenCloudManifestMessage ? <p className="hint">{qwenCloudManifestMessage}</p> : null}
                    </details>

                    <div className="input-lock-box">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={lockInputSettings}
                        disabled={setupLocked || !inputSettingsReady}
                      >
                        {setupLocked ? '4. Input settings locked' : '4. Submit and lock input settings'}
                      </button>
                      <p className="hint">
                        {setupLocked
                          ? 'This Input #4 source and language are locked for this session.'
                          : 'Lock after cache generation if you want to freeze this setup for the session.'}
                      </p>
                    </div>
                    {qwenCloudFallbackDetails ? (
                      <div className="sidebar-card">
                        <p className="error">Missing cached audio for phrase {qwenCloudFallbackDetails.phraseId}.</p>
                        <p className="hint">Expected path: {qwenCloudFallbackDetails.path}</p>
                        <p className="hint">
                          Use “Copy Cache Manifest JSON” and run the CosyVoice2 Colab to generate WAV files into{' '}
                          <span className="mono">public/tts-cache/cosyvoice/...</span>.
                        </p>
                        <button type="button" className="secondary-button" onClick={fallbackToBrowserTtsFromQwen}>
                          Fallback to browser TTS
                        </button>
                      </div>
                    ) : null}
                    <div className="tts-runtime">
                      <span>Status: {ttsStatus}</span>
                      <span>Rate: {ttsSpeechRate.toFixed(2)}x</span>
                      <span>Language: {ttsLanguage}</span>
                      <span>Pacing: {formatTtsPacingMode(ttsPacingMode)}</span>
                    </div>
                    {ttsCurrentChunk ? <p className="tts-current-chunk">{ttsCurrentChunk}</p> : null}
                      <p className="hint">
                        {'Uses cached CosyVoice2 phrase audio from /public/tts-cache/cosyvoice/{language}/{phraseId}.wav. Playback is driven by adaptive pacing and phrase-level chunks.'}
                      </p>
                  </div>
                ) : null}
              </section>
              ) : (
              <section className="sidebar-section sidebar-section-border">
                <button
                  type="button"
                  className="sidebar-section-heading sidebar-section-toggle"
                  onClick={() => setKokoroExpanded((value) => !value)}
                  aria-expanded={kokoroExpanded}
                >
                  <span className="sidebar-input-heading">
                    <span>{activeInputLabel}</span>
                    {activeInputFeatureLabel ? <span className="sidebar-input-feature">{activeInputFeatureLabel}</span> : null}
                  </span>
                  <span className="sidebar-section-meta">
                    <span className={`tts-paste-pill ${kokoroHasText ? 'tts-paste-pill-ready' : 'tts-paste-pill-empty'}`}>
                      {kokoroHasText ? 'Pasted' : 'Paste text'}
                    </span>
                    <span className={`sidebar-chevron ${kokoroExpanded ? 'sidebar-chevron-open' : ''}`}>⌃</span>
                  </span>
                </button>
                {kokoroExpanded ? (
                  <div className="sidebar-card tts-card kokoro-card">
                    <label>
                      Kokoro source text
                      <textarea
                        value={kokoroText}
                        onChange={(e) => onKokoroTextChange(e.target.value)}
                        placeholder="Paste text here for local Kokoro phrase audio..."
                        rows={9}
                        readOnly={setupLocked}
                        disabled={setupLocked}
                      />
                    </label>
                    <label>
                      Kokoro language
                      <select value={kokoroLanguage} disabled={setupLocked} onChange={(e) => setKokoroLanguage(e.target.value as TtsLanguage)}>
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="de">German (experimental / not native)</option>
                      </select>
                    </label>
                    <label>
                      Voice
                      <input value={kokoroVoice} disabled={setupLocked} onChange={(e) => setKokoroVoice(e.target.value)} placeholder="default" />
                    </label>
                    <div className={`tts-visor ${kokoroHasText ? 'tts-visor-ready' : ''}`} aria-live="polite">
                      {kokoroHasText ? 'Text pasted. Ready for local Kokoro generation.' : 'Waiting for pasted text.'}
                    </div>
                    <div className="tts-runtime">
                      <span>Status: {kokoroStatus}</span>
                      <span>Rate: {kokoroSpeechRate.toFixed(2)}x</span>
                      <span>Language: {kokoroLanguage}</span>
                      <span>Service: {kokoroServiceReady === false ? 'offline' : kokoroServiceReady ? 'ready' : 'not checked'}</span>
                    </div>
                    <p className="hint">
                      Local Kokoro service expected at http://localhost:8787. Generated phrase audio is cached on disk by the sidecar.
                    </p>
                    {kokoroLanguageWarning ? <p className="error">{kokoroLanguageWarning}</p> : null}
                    <div className="input-lock-box">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={lockInputSettings}
                        disabled={setupLocked || !inputSettingsReady}
                      >
                        {setupLocked ? 'Input settings locked' : 'Submit and lock input settings'}
                      </button>
                      <p className="hint">
                        {setupLocked
                          ? 'This Kokoro source, language, and voice are locked for this session.'
                          : 'Lock after the Kokoro source, language, and voice are configured.'}
                      </p>
                    </div>
                    {error ? <p className="error">{error}</p> : null}
                  </div>
                ) : null}
              </section>
              )) : null}
            </>
          ) : (
            <div className="sidebar-collapsed-rail">
              <button
                type="button"
                className="collapsed-session-dot collapsed-expand-button"
                onClick={() => setSidebarExpanded(true)}
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                →
              </button>
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={`collapsed-session-dot ${session.id === activeSessionId ? 'collapsed-session-dot-active' : ''}`}
                  onClick={() => setActiveSessionId(session.id)}
                  title={session.name}
                  aria-label={session.name}
                >
                  <span className="collapsed-session-dot-label">{session.id === activeSessionId ? '●' : '○'}</span>
                </button>
              ))}
              <button type="button" className="collapsed-session-dot collapsed-session-add" onClick={createSession} aria-label="New session">
                +
              </button>
            </div>
          )}
        </aside>

        <section className="workspace">
          <section className="workspace-shell">
            {workspaceMode === 'kokoro' ? (
              <section className="panel workspace-panel tts-workspace kokoro-workspace">
                <div className="tts-workspace-header">
                  <div>
                    <p className="dashboard-eyebrow">Local Kokoro sidecar</p>
                    <h2>Input # 3 - Kokoro TTS Local</h2>
                    <p className="dashboard-meta">Generate phrase audio locally, listen, type, and adapt pace from your telemetry.</p>
                  </div>
                  <div className="dashboard-header-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setWorkspaceMode('adaptive');
                        setDashboardSessionId(null);
                      }}
                    >
                      Adaptive Pace Layer
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setWorkspaceMode('leaderboard');
                        setDashboardSessionId(null);
                      }}
                    >
                      Back to sessions
                    </button>
                  </div>
                </div>

                {lockedInputSummary}

                <div className="tts-workspace-grid">
                  <section className="panel workspace-panel tts-source-panel kokoro-source-panel">
                    <h3>Kokoro source</h3>
                    <div className="source-media-player">
                      <span className="bottom-metrics-player-label">Media player</span>
                      <audio
                        ref={audioRef}
                        controls
                        src={audioUrl}
                        className="audio"
                        onTimeUpdate={() => setCurrentAudioTime(audioRef.current?.currentTime ?? 0)}
                        onEnded={finishSession}
                      />
                    </div>
                    <div className={`tts-source-box ${kokoroHasText ? 'tts-source-box-ready' : ''}`}>
                      {kokoroHasText ? kokoroText : 'Paste text in the sidebar to load a Kokoro source passage.'}
                    </div>
                    <div className="tts-source-meta">
                      <span>{kokoroHasText ? `${kokoroTranscript?.words.length ?? 0} source words` : 'No source loaded'}</span>
                      <span>{kokoroLanguage}</span>
                      <span>{formatTtsPacingMode(kokoroPacingMode)}</span>
                    </div>
                    {kokoroLanguageWarning ? <p className="error">{kokoroLanguageWarning}</p> : null}
                    {kokoroCurrentChunk ? (
                      <p className="tts-current-chunk">
                        Current phrase: {kokoroCurrentChunk.text}
                      </p>
                    ) : null}
                    <div className="tts-source-meta">
                      <span>Rate {kokoroSpeechRate.toFixed(2)}x</span>
                      <span>
                        {kokoroCurrentChunk
                          ? `${kokoroCurrentChunk.cached ? 'Cached' : 'Generated'} via ${kokoroCurrentChunk.engine}`
                          : 'No phrase yet'}
                      </span>
                      <span>Voice {kokoroVoice || 'default'}</span>
                    </div>
                  </section>

                  <section className="panel workspace-panel tts-practice-panel">
                    <div className="typing-panel-header">
                      <h3>Type what you hear</h3>
                      {keyboardProfileLabel ? (
                        <span className={`es-layout-indicator ${keyboardProfile === 'de-keyboard' ? 'de-layout-indicator' : ''}`}>
                          {keyboardProfileLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="kokoro-toggle-row">
                      <button
                        type="button"
                        className="secondary-button kokoro-toggle-button"
                        onClick={() => void toggleKokoroEnabled()}
                      >
                        {kokoroEnabled ? 'Turn Kokoro Off' : 'Turn Kokoro On'}
                      </button>
                      <span className={`kokoro-toggle-status ${kokoroEnabled ? 'kokoro-on' : 'kokoro-off'}`}>
                        <span className="kokoro-toggle-dot" />
                        {kokoroEnabled ? 'On' : 'Off'}
                      </span>
                    </div>
                    <div className="kokoro-source-actions kokoro-source-actions-primary">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void playKokoro()}
                        disabled={!kokoroEnabled || !kokoroHasText || kokoroStatus === 'playing' || isKokoroLanguageBlocked(kokoroLanguage)}
                      >
                        Start
                      </button>
                      <button type="button" className="secondary-button" onClick={pauseKokoro} disabled={!kokoroEnabled || kokoroStatus !== 'playing'}>
                        Pause
                      </button>
                      <button type="button" className="secondary-button" onClick={() => void resumeKokoro()} disabled={!kokoroEnabled || kokoroStatus !== 'paused'}>
                        Resume
                      </button>
                      <button type="button" className="secondary-button" onClick={replayKokoroPhrase} disabled={!kokoroCurrentChunk}>
                        Replay phrase
                      </button>
                    </div>
                    <div className="kokoro-source-actions kokoro-source-actions-secondary">
                      <button type="button" className="secondary-button" onClick={rewindKokoroPhrase} disabled={!kokoroCurrentChunk}>
                        Rewind
                      </button>
                      <button type="button" className="secondary-button" onClick={() => adjustKokoroManualPace(-0.05, 'manual_slow')}>
                        Slower
                      </button>
                      <button type="button" className="secondary-button" onClick={() => adjustKokoroManualPace(0.05, 'manual_fast')}>
                        Faster
                      </button>
                      <button type="button" className="secondary-button" onClick={resetKokoroPace}>
                        Reset pace
                      </button>
                    </div>
                    <textarea
                      value={kokoroPracticeText}
                      onChange={(e) => onKokoroPracticeChange(e.target.value)}
                      onKeyDown={onKokoroPracticeKeyDown}
                      placeholder={sessionStatus === 'finished' ? 'Session submitted.' : 'Type the Kokoro audio here...'}
                      readOnly={sessionStatus === 'finished'}
                      rows={12}
                    />
                    <RuntimeMetricsPanel
                      controllerState={controllerState}
                      rate={rate}
                      lagSec={lagSec}
                      lagWords={lagWords}
                      wpm={wpm}
                      accuracy={kokoroVisibleAccuracy}
                    />
                    <div className="tts-submit-row">
                      <button type="button" onClick={submitKokoroSession} disabled={!canSubmitKokoroSession}>
                        Submit statistics
                      </button>
                      <button type="button" className="secondary-button" onClick={openAdaptiveForActiveInput}>
                        Adaptive Pace Layer
                      </button>
                      <button type="button" className="secondary-button" onClick={resetSession}>
                        Reset
                      </button>
                    </div>
                    {sessionStatus === 'finished' ? (
                      <p className="success">Kokoro attempt submitted. Typing is locked until reset.</p>
                    ) : null}
                    <div className="tts-practice-summary">
                      <Metric label="Correct" value={String(kokoroPracticeEvaluation.matchedWords)} />
                      <Metric label="Wrong" value={String(kokoroPracticeEvaluation.extraWords)} />
                      <Metric label="Missing" value={String(kokoroPracticeMissing)} />
                      <Metric label="Words typed" value={String(kokoroPracticeWords.length)} />
                    </div>
                  </section>
                </div>
              </section>
            ) : workspaceMode === 'tts' ? (
              <section className="panel workspace-panel tts-workspace">
                <div className="tts-workspace-header">
                  <div>
                    <p className="dashboard-eyebrow">{activeInputFeatureLabel || 'Built-in browser feature'}</p>
                    <h2>{activeInputLabel}</h2>
                    <p className="dashboard-meta">
                      {activeInputMode === 'input4'
                        ? 'Listen, type, and pace against cached CosyVoice2 phrase audio.'
                        : 'Listen, type, and pace against browser TTS.'}
                    </p>
                  </div>
                  <div className="dashboard-header-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setWorkspaceMode('leaderboard');
                        setDashboardSessionId(null);
                      }}
                    >
                      Back to sessions
                    </button>
                  </div>
                </div>

                {lockedInputSummary}

                <div className="tts-workspace-grid">
                  <section className="panel workspace-panel tts-source-panel">
                    <h3>TTS source</h3>
                    <div className="source-media-player">
                      <span className="bottom-metrics-player-label">Media player</span>
                      <audio
                        ref={audioRef}
                        controls
                        src={audioUrl}
                        className="audio"
                        onTimeUpdate={() => setCurrentAudioTime(audioRef.current?.currentTime ?? 0)}
                        onEnded={finishSession}
                      />
                    </div>
                    <div className={`tts-source-box ${ttsHasText ? 'tts-source-box-ready' : ''}`}>
                      {ttsHasText ? ttsText : 'Paste text in the sidebar to load a source passage.'}
                    </div>
                    <div className="tts-source-meta">
                      <span>{ttsHasText ? `${ttsTranscript?.words.length ?? 0} source words` : 'No source loaded'}</span>
                      <span>{ttsLanguage}</span>
                      <span>{formatTtsPacingMode(ttsPacingMode)}</span>
                    </div>
                  </section>

                  <section className="panel workspace-panel tts-practice-panel">
                    <div className="typing-panel-header">
                      <h3>Type what you hear</h3>
                      {keyboardProfileLabel ? (
                        <span className={`es-layout-indicator ${keyboardProfile === 'de-keyboard' ? 'de-layout-indicator' : ''}`}>
                          {keyboardProfileLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="tts-source-actions">
                      <button type="button" className="secondary-button" onClick={playTts} disabled={!ttsHasText}>
                        Play
                      </button>
                      <button type="button" className="secondary-button" onClick={pauseTts} disabled={ttsStatus !== 'playing'}>
                        Pause
                      </button>
                      <button type="button" className="secondary-button" onClick={resumeTts} disabled={ttsStatus !== 'paused'}>
                        Resume
                      </button>
                      <button type="button" className="secondary-button" onClick={() => stopTtsPlayback('stop')} disabled={ttsStatus === 'idle'}>
                        Stop
                      </button>
                    </div>
                    <textarea
                      value={ttsPracticeText}
                      onChange={(e) => onTtsPracticeChange(e.target.value)}
                      onKeyDown={onTtsPracticeKeyDown}
                      placeholder={sessionStatus === 'finished' ? 'Session submitted.' : 'Type the TTS text here...'}
                      readOnly={sessionStatus === 'finished'}
                      rows={12}
                    />
                    <RuntimeMetricsPanel
                      controllerState={controllerState}
                      rate={rate}
                      lagSec={lagSec}
                      lagWords={lagWords}
                      wpm={wpm}
                      accuracy={ttsVisibleAccuracy}
                    />
                    <div className="tts-submit-row">
                      <button type="button" onClick={submitTtsSession} disabled={!canSubmitTtsSession}>
                        Submit statistics
                      </button>
                      <button type="button" className="secondary-button" onClick={openAdaptiveForActiveInput}>
                        Adaptive Pace Layer
                      </button>
                      <button type="button" className="secondary-button" onClick={resetSession}>
                        Reset
                      </button>
                    </div>
                    {sessionStatus === 'finished' ? (
                      <p className="success">TTS attempt submitted. Typing is locked until reset.</p>
                    ) : null}
                    <div className="tts-practice-summary">
                      <Metric label="Correct" value={String(ttsPracticeEvaluation.matchedWords)} />
                      <Metric label="Wrong" value={String(ttsPracticeEvaluation.extraWords)} />
                      <Metric label="Missing" value={String(ttsPracticeMissing)} />
                      <Metric label="Words typed" value={String(ttsPracticeWords.length)} />
                    </div>
                  </section>
                </div>
              </section>
            ) : workspaceMode === 'dashboard' && dashboardSession ? (
              <SessionDashboard
                session={dashboardSession}
                sessions={sessions}
                onBackToLeaderboard={() => setWorkspaceMode('leaderboard')}
                onBackToTraining={() => {
                  setWorkspaceMode('training');
                  setDashboardSessionId(null);
                }}
              />
            ) : workspaceMode === 'adaptive' ? (
              <section className="panel workspace-panel adaptive-workspace">
                <div className="tts-workspace-header">
                  <div>
                    <p className="dashboard-eyebrow">Central adaptive pace layer</p>
                    <h2>Adaptive Pace Layer</h2>
                    <p className="dashboard-meta">One decision engine normalizes telemetry, then each input adapter applies pace control in its own way.</p>
                  </div>
                  <div className="dashboard-header-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setWorkspaceMode('training');
                        setDashboardSessionId(null);
                      }}
                    >
                      Back to training
                    </button>
                  </div>
                </div>
                <div className="adaptive-workspace-grid">
                  <section className="panel workspace-panel adaptive-decision-panel">
                    <div className="adaptive-section-header">
                      <div>
                        <p className="dashboard-eyebrow">Section # 1 - Central Brain</p>
                        <h3>Decision Engine</h3>
                      </div>
                      <button
                        type="button"
                        className="secondary-button adaptive-section-toggle"
                        onClick={() =>
                          setAdaptiveSectionExpanded((prev) => ({
                            ...prev,
                            decision: !(prev.decision && prev.architecture),
                            architecture: !(prev.decision && prev.architecture),
                          }))
                        }
                        aria-expanded={adaptiveSectionExpanded.decision}
                        aria-label={adaptiveSectionExpanded.decision ? 'Collapse section' : 'Expand section'}
                        title={adaptiveSectionExpanded.decision ? 'Collapse' : 'Expand'}
                      >
                        <span className={`adaptive-section-toggle-icon ${adaptiveSectionExpanded.decision ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
                      </button>
                    </div>
                    {adaptiveSectionExpanded.decision ? (
                      <>
                        <p className="dashboard-meta">
                          AdaptiveDictationController reads normalized telemetry and chooses support, balanced, or flow pacing for the active input.
                        </p>
                        <div className="bottom-summary-grid">
                          <Metric label="Current mode" value={latestAdaptiveMode} />
                          <Metric label="Rate range" value="0.75x-1.15x" />
                          <Metric label="Phrase sizes" value="Short / medium / long" />
                          <Metric label="Inputs" value="Lag, accuracy, WPM" />
                          <Metric label="Sensitivity" value="Correction + difficulty" />
                          <Metric label="History" value="Profile confidence" />
                        </div>
                      </>
                    ) : null}
                  </section>

                  <section className="panel workspace-panel adaptive-architecture-panel">
                    <div className="adaptive-section-header">
                      <div>
                        <p className="dashboard-eyebrow">Section # 2 - Architecture Note</p>
                        <h3>Centralized decision, input-specific execution</h3>
                      </div>
                      <button
                        type="button"
                        className="secondary-button adaptive-section-toggle"
                        onClick={() =>
                          setAdaptiveSectionExpanded((prev) => ({
                            ...prev,
                            decision: !(prev.decision && prev.architecture),
                            architecture: !(prev.decision && prev.architecture),
                          }))
                        }
                        aria-expanded={adaptiveSectionExpanded.architecture}
                        aria-label={adaptiveSectionExpanded.architecture ? 'Collapse section' : 'Expand section'}
                        title={adaptiveSectionExpanded.architecture ? 'Collapse' : 'Expand'}
                      >
                        <span className={`adaptive-section-toggle-icon ${adaptiveSectionExpanded.architecture ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
                      </button>
                    </div>
                    {adaptiveSectionExpanded.architecture ? (
                      <>
                        <p>
                          Future inputs should plug into the same adapter contract: produce a telemetry frame, request a pacing decision, then apply that decision
                          through the input's playback engine.
                        </p>
                        <div className="adaptive-flow-row">
                          <span>Input telemetry</span>
                          <span>Adaptive controller</span>
                          <span>Input adapter</span>
                          <span>Playback behavior</span>
                        </div>
                      </>
                    ) : null}
                  </section>

                  <section className="panel workspace-panel adaptive-adapters-panel">
                    <div className="adaptive-section-header">
                      <div>
                        <p className="dashboard-eyebrow">Section # 3 - Input Adapters</p>
                        <h3>Execution strategies</h3>
                        <p className="dashboard-meta">Select an input to focus its benchmark profile below.</p>
                      </div>
                      <button
                        type="button"
                        className="secondary-button adaptive-section-toggle"
                        onClick={() => setAdaptiveSectionExpanded((prev) => ({ ...prev, adapters: !prev.adapters }))}
                        aria-expanded={adaptiveSectionExpanded.adapters}
                        aria-label={adaptiveSectionExpanded.adapters ? 'Collapse section' : 'Expand section'}
                        title={adaptiveSectionExpanded.adapters ? 'Collapse' : 'Expand'}
                      >
                        <span className={`adaptive-section-toggle-icon ${adaptiveSectionExpanded.adapters ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
                      </button>
                    </div>
                    {adaptiveSectionExpanded.adapters ? (
                      <div className="adaptive-adapter-grid">
                        {adaptiveAdapters.map((adapter) => (
                          <AdaptiveAdapterCard
                            key={adapter.inputMode}
                            adapter={adapter}
                            active={latestSession?.inputMode === adapter.inputMode}
                            selected={selectedBenchmarkInputMode === mapSessionInputMode(adapter.inputMode)}
                            onOpen={() => {
                              setSelectedBenchmarkInputMode(mapSessionInputMode(adapter.inputMode));
                              setBenchmarkExportMessage('');
                              setScriptPromptMessage('');
                              setSessionFeedbackMessage('');
                              window.setTimeout(() => {
                                document.getElementById('adaptive-benchmarks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }, 0);
                            }}
                          />
                        ))}
                      </div>
                    ) : null}
                  </section>

                  <section className="panel workspace-panel adaptive-summary-panel">
                    <div className="adaptive-section-header">
                      <div>
                        <p className="dashboard-eyebrow">Section # 4 - Latest Session Overview</p>
                        <h3>Most recent run</h3>
                      </div>
                      <button
                        type="button"
                        className="secondary-button adaptive-section-toggle"
                        onClick={() =>
                          setAdaptiveSectionExpanded((prev) => ({
                            ...prev,
                            latest: !(prev.latest && prev.live),
                            live: !(prev.latest && prev.live),
                          }))
                        }
                        aria-expanded={adaptiveSectionExpanded.latest}
                        aria-label={adaptiveSectionExpanded.latest ? 'Collapse section' : 'Expand section'}
                        title={adaptiveSectionExpanded.latest ? 'Collapse' : 'Expand'}
                      >
                        <span className={`adaptive-section-toggle-icon ${adaptiveSectionExpanded.latest ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
                      </button>
                    </div>
                    {adaptiveSectionExpanded.latest ? (
                      latestSession ? (
                        <div className="bottom-summary-grid">
                          <Metric label="Session" value={latestSession.name || 'Untitled'} />
                          <Metric label="Input mode" value={formatSessionInputMode(latestSession.inputMode)} />
                          <Metric label="Adapter" value={latestInputAdapter?.adapter ?? 'Not set'} />
                          <Metric label="Updated" value={new Date(latestSession.updatedAt).toLocaleString()} />
                          <Metric label="Duration" value={formatSessionPlaybackDuration(latestSession)} />
                          <Metric label="Score" value={String(latestSession.metrics.score)} />
                          <Metric label="Points" value={String(latestSession.metrics.points)} />
                        </div>
                      ) : (
                        <p className="hint">No session data available yet.</p>
                      )
                    ) : null}
                  </section>
                  {latestSession ? (
                    <section className="panel workspace-panel adaptive-metrics-panel">
                      <div className="adaptive-section-header">
                        <div>
                          <p className="dashboard-eyebrow">Section # 5 - Live Pacing Metrics</p>
                          <h3>Latest pacing snapshot</h3>
                          <p className="dashboard-meta">Most recent metrics computed from the stored session.</p>
                        </div>
                          <button
                            type="button"
                            className="secondary-button adaptive-section-toggle"
                            onClick={() =>
                              setAdaptiveSectionExpanded((prev) => ({
                                ...prev,
                                latest: !(prev.latest && prev.live),
                                live: !(prev.latest && prev.live),
                              }))
                            }
                            aria-expanded={adaptiveSectionExpanded.live}
                            aria-label={adaptiveSectionExpanded.live ? 'Collapse section' : 'Expand section'}
                            title={adaptiveSectionExpanded.live ? 'Collapse' : 'Expand'}
                          >
                          <span className={`adaptive-section-toggle-icon ${adaptiveSectionExpanded.live ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
                        </button>
                      </div>
                      {adaptiveSectionExpanded.live ? (
                        <>
                          <div className="bottom-summary-grid">
                            <Metric label="Mode" value={formatAdaptiveModeFromSession(latestSession)} />
                            <Metric label="Rate" value={`${latestSession.metrics.rate.toFixed(2)}x`} />
                            <Metric label="Lag" value={`${latestSession.metrics.lagSec.toFixed(2)}s`} />
                            <Metric label="Lag words" value={String(latestSession.metrics.lagWords)} />
                            <Metric label="WPM" value={latestSession.metrics.wpm.toFixed(1)} />
                            <Metric label="Accuracy" value={`${latestSession.metrics.accuracy.toFixed(1)}%`} />
                            <Metric
                              label="Trend"
                              value={
                                latestSession.metrics.trend === 'improving'
                                  ? 'Improving'
                                  : latestSession.metrics.trend === 'declining'
                                    ? 'Declining'
                                    : 'Stable'
                              }
                            />
                          </div>
                          <div className="today-chart-row">
                            <div className="today-chart-bar">
                              <span className="today-chart-label">Actions</span>
                              <div className="today-chart-track">
                                <div className="today-chart-fill" style={{ width: `${Math.min(100, latestSession.telemetry.actions.length * 4)}%` }} />
                              </div>
                            </div>
                            <div className="today-chart-bar">
                              <span className="today-chart-label">Telemetry samples</span>
                              <div className="today-chart-track">
                                <div className="today-chart-fill" style={{ width: `${Math.min(100, latestSession.telemetry.lagSeries.length)}%` }} />
                              </div>
                            </div>
                          </div>
                        </>
                      ) : null}
                    </section>
                  ) : null}
                  {latestSession ? (
                    <section className="panel workspace-panel adaptive-telemetry-panel">
                      <div className="adaptive-section-header">
                        <div>
                          <p className="dashboard-eyebrow">Section # 6 - Telemetry Snapshot</p>
                          <h3>Debug counters</h3>
                          <p className="dashboard-meta">Most recent live debug counters, semantic pacing signals, and rate distribution.</p>
                        </div>
                        <button
                          type="button"
                          className="secondary-button adaptive-section-toggle"
                          onClick={() => setAdaptiveSectionExpanded((prev) => ({ ...prev, telemetry: !prev.telemetry }))}
                          aria-expanded={adaptiveSectionExpanded.telemetry}
                          aria-label={adaptiveSectionExpanded.telemetry ? 'Collapse section' : 'Expand section'}
                          title={adaptiveSectionExpanded.telemetry ? 'Collapse' : 'Expand'}
                        >
                          <span className={`adaptive-section-toggle-icon ${adaptiveSectionExpanded.telemetry ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
                        </button>
                      </div>
                      {adaptiveSectionExpanded.telemetry ? (
                        <>
                          <div className="today-summary-grid">
                            <Metric label="Samples" value={String(countTelemetrySamples(latestSession.telemetry))} />
                            <Metric label="Actions" value={String(latestSession.telemetry.actions.length)} />
                            <Metric label="Rate buckets" value={String(latestSession.telemetry.rateDistribution.length)} />
                            <Metric label="Repeat count" value={String(latestSession.telemetry.repeatCount)} />
                            <Metric label="TTS chunks" value={String(latestSession.telemetry.ttsChunks.length)} />
                            <Metric label="Kokoro chunks" value={String(latestSession.kokoroChunks.length)} />
                          </div>
                          <div className="today-summary-grid">
                            <Metric label="Semantic cut penalty" value={adaptiveSemanticDebug.semanticCutPenalty.toFixed(2)} />
                            <Metric label="Unsafe pauses" value={String(adaptiveSemanticDebug.unsafePauseCount)} />
                            <Metric label="Safe pauses" value={String(adaptiveSemanticDebug.safePauseCount)} />
                            <Metric label="Deferred pauses" value={String(adaptiveSemanticDebug.deferredPauseCount)} />
                            <Metric label="Replay denied" value={String(adaptiveSemanticDebug.replayDeniedByBoundaryCount)} />
                            <Metric label="Avg completeness" value={adaptiveSemanticDebug.averageSemanticCompleteness.toFixed(2)} />
                            <Metric label="Avg difficulty" value={adaptiveSemanticDebug.averagePhraseDifficulty.toFixed(2)} />
                            <Metric label="Execution fidelity" value={adaptiveSemanticDebug.inputExecutionFidelityScore.toFixed(2)} />
                            <Metric label="Phrase index" value={`${adaptiveSemanticDebug.currentPhraseIndex}/${adaptiveSemanticDebug.totalSemanticPhrases}`} />
                            <Metric label="Phrase id" value={adaptiveSemanticDebug.currentPhraseId} />
                            <Metric label="Phrase preview" value={adaptiveSemanticDebug.currentPhraseTextPreview || 'n/a'} />
                            <Metric label="Phrase advances" value={String(adaptiveSemanticDebug.phraseAdvanceCount)} />
                            <Metric label="Phrase replays" value={String(adaptiveSemanticDebug.phraseReplayCount)} />
                            <Metric label="Last phrase reason" value={adaptiveSemanticDebug.lastPhraseAdvanceReason} />
                          </div>
                          <div className="today-chart-row">
                            {latestSession.telemetry.rateDistribution.map((entry) => (
                              <div key={entry.rate} className="today-chart-bar">
                                <span className="today-chart-label">{entry.rate.toFixed(2)}x</span>
                                <div className="today-chart-track">
                                  <div
                                    className="today-chart-fill"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        Math.round(
                                          (entry.seconds /
                                            Math.max(
                                              1,
                                              latestSession.telemetry.rateDistribution.reduce((sum, next) => sum + next.seconds, 0),
                                            )) *
                                            100,
                                        ),
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </section>
                  ) : null}
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
                    onSelect={(inputMode, language) => {
                      setSelectedBenchmarkInputMode(inputMode);
                      setSelectedBenchmarkLanguage(language);
                      setBenchmarkExportMessage('');
                      setScriptPromptMessage('');
                      setSessionFeedbackMessage('');
                    }}
                    benchmarkExportMessage={benchmarkExportMessage}
                    scriptPromptMessage={scriptPromptMessage}
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
            ) : workspaceMode === 'admin' ? (
              <AdminWorkspace
                sessions={adminSessions}
                summary={adminStorageSummary}
                fileInventory={adminFileInventory}
                fileInventoryError={adminFileInventoryError}
                exportMessage={exportMessage}
                languageView={adminLanguageView}
                onChangeLanguage={setAdminLanguageView}
                onBackToTraining={() => setWorkspaceMode('training')}
                onCopyLocalStorage={() => void copyDictaLocalStorage(setExportMessage)}
                onExportLocalStorage={downloadDictaLocalStorage}
                onExportSession={downloadSessionSnapshot}
                onCopySession={(session) => void copySessionSnapshot(session, setExportMessage)}
              />
            ) : workspaceMode === 'leaderboard' ? (
              <section className="panel workspace-panel leaderboard-workspace">
                <div className="metrics-header">
                  <h2>Leaderboard</h2>
                  <div className="live-metrics-language-tabs leaderboard-language-tabs" role="tablist" aria-label="Leaderboard language">
                    {([
                      ['en', 'Leaderboard for English'],
                      ['es', 'Leaderboard for Spanish'],
                      ['de', 'Leaderboard for German'],
                    ] as const).map(([code, label]) => (
                      <button
                        key={code}
                        type="button"
                        className={`live-metrics-language-tab ${leaderboardLanguageView === code ? 'live-metrics-language-tab-active' : ''}`}
                        onClick={() => setLeaderboardLanguageView(code)}
                        aria-pressed={leaderboardLanguageView === code}
                        title={label}
                      >
                        {code.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="secondary-button" onClick={() => setWorkspaceMode('training')}>
                    Back
                  </button>
                </div>
                <div className="leaderboard-table leaderboard-list-full">
                  <div className="leaderboard-table-header">
                    <span>Position</span>
                    <span>Name</span>
                    <span>Points</span>
                    <span>Score</span>
                    <span>Accuracy</span>
                    <span>WPM</span>
                    <span>Lag</span>
                    <span>Rate</span>
                    <span>Status</span>
                    <span>Duration</span>
                    <span>Updated</span>
                    <span>Action</span>
                  </div>
                  {leaderboard.length === 0 ? (
                    <div className="leaderboard-empty">
                      No sessions yet for {leaderboardLanguageView.toUpperCase()}. Finish a session in that language to populate this leaderboard.
                    </div>
                  ) : null}
                  {leaderboard.map(({ rank, session }) => (
                    <div key={session.id} className={`leaderboard-table-row ${session.id === activeSessionId ? 'leaderboard-table-row-active' : ''}`}>
                      <span className="leaderboard-cell leaderboard-cell-rank">#{rank}</span>
                      <span className="leaderboard-cell leaderboard-cell-name">{session.name || 'Untitled session'}</span>
                      <span className="leaderboard-cell leaderboard-cell-points">{session.metrics.points}</span>
                      <span className="leaderboard-cell leaderboard-cell-score">{session.metrics.score}</span>
                      <span className="leaderboard-cell leaderboard-cell-accuracy">{session.metrics.accuracy.toFixed(1)}%</span>
                      <span className="leaderboard-cell leaderboard-cell-wpm">{session.metrics.wpm.toFixed(1)}</span>
                      <span className="leaderboard-cell leaderboard-cell-lag">{session.metrics.lagSec.toFixed(2)}s</span>
                      <span className="leaderboard-cell leaderboard-cell-rate">{session.metrics.rate.toFixed(2)}x</span>
                      <span className="leaderboard-cell leaderboard-cell-status">{formatSessionStatus(session.status)}</span>
                      <span className="leaderboard-cell leaderboard-cell-duration">{formatSessionPlaybackDuration(session)}</span>
                      <span className="leaderboard-cell leaderboard-cell-date">{formatSessionDate(session.updatedAt)}</span>
                      <span className="leaderboard-cell leaderboard-cell-action">
                        <select
                          aria-label={`Actions for ${session.name || 'session'}`}
                          defaultValue=""
                          onChange={(e) => {
                            const action = e.target.value;
                            if (action === 'export') {
                              downloadSessionSnapshot(session);
                            }
                            if (action === 'copy') {
                              void copySessionSnapshot(session, setExportMessage);
                            }
                            if (action === 'dashboard') {
                              setDashboardSessionId(session.id);
                              setWorkspaceMode('dashboard');
                            }
                            e.currentTarget.value = '';
                          }}
                        >
                          <option value="" disabled>
                            Action
                          </option>
                          <option value="dashboard">Dashboard</option>
                          <option value="export">Export session JSON</option>
                          <option value="copy">Copy session JSON</option>
                        </select>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <>
              {lockedInputSummary}
              <div className="workspace-columns">
                <div className="workspace-column workspace-column-primary">
                  <section className="panel workspace-panel tts-source-panel tall-panel">
                    <h2>Audio source</h2>
                    <div className="source-media-player">
                      <span className="bottom-metrics-player-label">Media player</span>
                      <audio
                        ref={audioRef}
                        controls
                        src={audioUrl}
                        className="audio"
                        onTimeUpdate={() => setCurrentAudioTime(audioRef.current?.currentTime ?? 0)}
                        onEnded={finishSession}
                      />
                    </div>
                    <h3>Whisper transcript</h3>
                    <div className="transcript-preview long transcript-segment-list">
                      {transcriptSegments.length > 0 ? (
                        transcriptSegments.map((segment, index) => (
                          <article
                            key={`${segment.start}-${segment.end}`}
                            className={`transcript-segment ${index === activeTranscriptSegmentIndex ? 'transcript-segment-active' : ''}`}
                          >
                            <span className="transcript-segment-time">{formatTimestamp(segment.start)}</span>
                            <p>{segment.text}</p>
                          </article>
                        ))
                      ) : (
                        <p>No transcript yet.</p>
                      )}
                    </div>
                  </section>

                </div>

                <div className="workspace-column">
                  <section className="panel workspace-panel accent-panel">
                    <h2>How can I help you train today?</h2>
                    <div className="panel composer-panel">
                      <div className="controls">
                        <button onClick={() => void startSession()} disabled={!canStartSession}>Start</button>
                        <button onClick={pauseSession} disabled={!canPauseSession}>Pause</button>
                        <button onClick={finishSession} disabled={!canFinishSession}>Finish</button>
                        <button onClick={resetSession}>Reset</button>
                      </div>
                      <div className={`session-ready-banner ${canStartSession ? 'session-ready-banner-active' : ''}`} aria-live="polite">
                        <strong>
                          {sessionStatus === 'finished'
                            ? 'Session finished'
                            : canStartSession
                              ? 'Session ready to start'
                              : 'Session setup required'}
                        </strong>
                        <div className="session-ready-checklist">
                          {readyChecklist.map((item) => (
                            <span
                              key={item.label}
                              className={`session-ready-chip ${item.ready ? 'session-ready-chip-done' : 'session-ready-chip-pending'}`}
                            >
                              {item.ready ? '✓' : '○'} {item.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      {exportMessage ? <p className="success">{exportMessage}</p> : null}
                      {sessionStatus === 'finished' ? <p className="success">Attempt completed. Input is locked until you reset.</p> : null}
                      {sessionStatus !== 'finished' && !canStartSession ? <p className="hint">Load audio and transcript to enable Start.</p> : null}
                      <div className="typing-cue-stack">
                        <div className="target target-active">
                          <strong>{activeTranscriptSegment ? formatTimestamp(activeTranscriptSegment.start) : '--:--'}</strong>
                          <span>{activeTranscriptSegment?.text || transcriptPreview || 'Load transcript to see target words.'}</span>
                        </div>
                        {nextTranscriptSegment ? (
                          <div className="target target-next">
                            <strong>{formatTimestamp(nextTranscriptSegment.start)}</strong>
                            <span>{nextTranscriptSegment.text}</span>
                          </div>
                        ) : null}
                      </div>
                      {keyboardProfileLabel ? (
                        <span className={`es-layout-indicator ${keyboardProfile === 'de-keyboard' ? 'de-layout-indicator' : ''}`}>
                          {keyboardProfileLabel}
                        </span>
                      ) : null}
                      <textarea
                        value={inputText}
                        onChange={(e) => onTypingChange(e.target.value)}
                        onKeyDown={onTypingKeyDown}
                        placeholder={sessionStatus === 'finished' ? 'Session finished.' : 'Type what you hear...'}
                        readOnly={sessionStatus === 'finished'}
                        rows={8}
                      />
                      <RuntimeMetricsPanel
                        controllerState={controllerState}
                        rate={rate}
                        lagSec={lagSec}
                        lagWords={lagWords}
                        wpm={wpm}
                        accuracy={visibleAccuracy}
                      />
                    </div>
                  </section>
                </div>
              </div>
              </>
            )}
          </section>
        </section>
      </section>
      <section className="bottom-metrics-dock">
        <div className="bottom-metrics-inner">
          <div className="bottom-metrics-top">
            <div className="metrics-header bottom-metrics-header live-metrics-section live-metrics-section-header">
              <h2>Insights</h2>
              <div className="live-metrics-language-tabs" role="tablist" aria-label="Live metrics language">
                {([
                  ['en', 'Live Metrics for English'],
                  ['es', 'Live Metrics for Spanish'],
                  ['de', 'Live Metrics for German'],
                ] as const).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    className={`live-metrics-language-tab ${metricsLanguageView === code ? 'live-metrics-language-tab-active' : ''}`}
                    onClick={() => setMetricsLanguageView(code)}
                    aria-pressed={metricsLanguageView === code}
                    title={label}
                  >
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>
              <span className={`trend trend-${trend}`}>
                {trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Needs adjustment' : 'Stable'}
              </span>
            </div>
            {workspaceMode === 'tts' || workspaceMode === 'kokoro' ? (
              <div className="bottom-metrics-player tts-bottom-player live-metrics-section live-metrics-section-player">
                <span className="bottom-metrics-player-label">{workspaceMode === 'kokoro' ? 'Kokoro local' : 'Browser TTS'}</span>
                <span>
                  {workspaceMode === 'kokoro'
                    ? kokoroCurrentChunk
                      ? formatTtsPacingMode(kokoroPacingMode)
                      : kokoroStatus
                    : ttsCurrentChunk
                      ? formatTtsPacingMode(ttsPacingMode)
                      : ttsStatus}
                </span>
              </div>
            ) : null}
          </div>

          <section className="bottom-summary-section live-metrics-section live-metrics-section-last">
            <div className="bottom-summary-header">
              <h3>Last Session ({metricsLanguageView.toUpperCase()})</h3>
            </div>
            {!lastSessionForLanguage ? <p className="hint">No sessions found for this language yet.</p> : null}
            <div className="bottom-summary-grid">
              <Metric label="Name" value={lastSessionForLanguage?.name ?? '—'} />
              <Metric label="Input mode" value={lastSessionForLanguage ? formatSessionInputMode(lastSessionForLanguage.inputMode) : '—'} />
              <Metric label="Score" value={lastSessionForLanguage ? String(lastSessionForLanguage.metrics.score) : '—'} />
              <Metric label="Updated" value={lastSessionForLanguage ? formatSessionDate(lastSessionForLanguage.updatedAt) : '—'} />
            </div>
          </section>

          <section className="bottom-summary-section today-summary-section live-metrics-section live-metrics-section-period">
            <div className="bottom-summary-header">
              <h3>{rangeLabel(metricsRangeView)} ({metricsLanguageView.toUpperCase()})</h3>
              <div className="live-metrics-range-tabs" role="tablist" aria-label="Live metrics range">
                {([
                  ['today', 'Today'],
                  ['week', 'Week'],
                  ['twoWeeks', '2 Weeks'],
                  ['threeWeeks', '3 Weeks'],
                  ['month', 'Month'],
                ] as const).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    className={`live-metrics-range-tab ${metricsRangeView === code ? 'live-metrics-range-tab-active' : ''}`}
                    onClick={() => setMetricsRangeView(code)}
                    aria-pressed={metricsRangeView === code}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {languageTodaySummary.sessionsInRange.length === 0 ? <p className="hint">No sessions in this period for this language.</p> : null}
            <div className="today-summary-grid">
              <Metric label="Sessions" value={String(languageTodaySummary.sessionsInRange.length)} />
              <Metric label="Duration" value={formatDuration(languageTodaySummary.durationSeconds)} />
              <Metric label="Avg points" value={languageTodaySummary.avgPoints !== null ? languageTodaySummary.avgPoints.toFixed(1) : '—'} />
              <Metric label="Avg score" value={languageTodaySummary.avgScore !== null ? languageTodaySummary.avgScore.toFixed(1) : '—'} />
              <Metric label="Avg accuracy" value={languageTodaySummary.avgAccuracy !== null ? `${languageTodaySummary.avgAccuracy.toFixed(1)}%` : '—'} />
              <Metric label="Avg WPM" value={languageTodaySummary.avgWpm !== null ? languageTodaySummary.avgWpm.toFixed(1) : '—'} />
            </div>
            <div className="today-chart-row">
              {languageTodaySummary.days.map((item) => (
                <div key={item.label} className="today-chart-bar">
                  <span className="today-chart-label">{item.label}</span>
                  <div className="today-chart-track">
                    <div
                      className="today-chart-fill"
                      style={{ width: `${Math.round((item.count / languageTodaySummary.maxDayCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </section>
    </main>
  );
}

function AdminWorkspace({
  sessions,
  summary,
  fileInventory,
  fileInventoryError,
  exportMessage,
  languageView,
  onChangeLanguage,
  onBackToTraining,
  onCopyLocalStorage,
  onExportLocalStorage,
  onExportSession,
  onCopySession,
}: {
  sessions: StoredSession[];
  summary: AdminStorageSummary;
  fileInventory: AdminFileInventory | null;
  fileInventoryError: string;
  exportMessage: string;
  languageView: MetricsLanguageView;
  onChangeLanguage: (value: MetricsLanguageView) => void;
  onBackToTraining: () => void;
  onCopyLocalStorage: () => void;
  onExportLocalStorage: () => void;
  onExportSession: (session: StoredSession) => void;
  onCopySession: (session: StoredSession) => void;
}) {
  return (
    <section className="panel workspace-panel admin-workspace">
      <div className="tts-workspace-header">
        <div>
          <p className="dashboard-eyebrow">Storage control</p>
          <h2>Admin</h2>
          <p className="dashboard-meta">Read-only project storage, session, transcript, and telemetry overview.</p>
          <div className="live-metrics-language-tabs admin-language-tabs" role="tablist" aria-label="Admin language">
            {([
              ['en', 'Admin view for English sessions'],
              ['es', 'Admin view for Spanish sessions'],
              ['de', 'Admin view for German sessions'],
            ] as const).map(([code, label]) => (
              <button
                key={code}
                type="button"
                className={`live-metrics-language-tab ${languageView === code ? 'live-metrics-language-tab-active' : ''}`}
                onClick={() => onChangeLanguage(code)}
                aria-pressed={languageView === code}
                title={label}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="dashboard-header-actions">
          <button type="button" className="secondary-button" onClick={onBackToTraining}>
            Back to training
          </button>
        </div>
      </div>

      {exportMessage ? <p className="success">{exportMessage}</p> : null}

      <div className="admin-kpi-grid">
        <Metric label="Sessions" value={String(summary.sessionCount)} />
        <Metric label="Finished" value={String(summary.finishedSessions)} />
        <Metric label="LocalStorage" value={formatBytes(summary.dictaLocalStorageBytes)} />
        <Metric label="Transcript words" value={String(summary.totalTranscriptWords)} />
        <Metric label="Telemetry samples" value={String(summary.telemetrySamples)} />
        <Metric label="Actions" value={String(summary.telemetryActions)} />
        <Metric label="TTS chunks" value={String(summary.ttsChunks)} />
        <Metric label="Audio refs" value={String(summary.blobAudioRefs + summary.remoteAudioRefs)} />
      </div>

      <div className="admin-grid">
        <section className="dashboard-card admin-card">
          <div className="admin-card-header">
            <div>
              <h3>Browser storage</h3>
              <p>Dicta keys currently visible in this browser.</p>
            </div>
            <div className="admin-actions">
              <button type="button" className="secondary-button" onClick={onCopyLocalStorage}>
                Copy JSON
              </button>
              <button type="button" className="secondary-button" onClick={onExportLocalStorage}>
                Export JSON
              </button>
            </div>
          </div>
          <div className="admin-table">
            <div className="admin-table-row admin-table-header">
              <span>Key</span>
              <span>Size</span>
              <span>Preview</span>
            </div>
            {summary.localStorageEntries.map((entry) => (
              <div key={entry.key} className="admin-table-row">
                <span>{entry.key}</span>
                <span>{formatBytes(entry.bytes)}</span>
                <span>{entry.valuePreview}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-card admin-card">
          <div className="admin-card-header">
            <div>
              <h3>Project files</h3>
              <p>{fileInventory ? fileInventory.projectRoot : 'Known dev folders exposed by the local Vite server.'}</p>
            </div>
          </div>
          {fileInventoryError ? <p className="hint">{fileInventoryError}</p> : null}
          <div className="admin-table">
            <div className="admin-table-row admin-table-header">
              <span>Folder</span>
              <span>Files</span>
              <span>Size</span>
            </div>
            {(fileInventory?.folders ?? []).map((folder) => (
              <div key={folder.relativePath} className="admin-table-row">
                <span>
                  {folder.label}
                  <small>{folder.exists ? folder.absolutePath : 'Not found'}</small>
                </span>
                <span>
                  {folder.exists
                    ? `${folder.fileCount} files, ${folder.wavCount} wav, ${folder.jsonCount} json`
                    : '0 files'}
                </span>
                <span>{folder.exists ? formatBytes(folder.totalBytes) : 'n/a'}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="dashboard-card admin-card">
        <div className="admin-card-header">
          <div>
            <h3>Session inventory ({languageView.toUpperCase()})</h3>
            <p>Per-session storage, transcript, text, and telemetry counts for the selected language.</p>
          </div>
        </div>
        <div className="admin-session-list">
          {sessions.map((session) => (
            <article key={session.id} className="admin-session-card">
              <div>
                <h4>{session.name || 'Untitled session'}</h4>
                <p>{formatSessionInputMode(session.inputMode)} · {formatSessionStatus(session.status)} · {formatSessionDate(session.updatedAt)}</p>
              </div>
              <div className="admin-session-metrics">
                <Metric label="JSON size" value={formatBytes(estimateJsonBytes(session))} />
                <Metric label="Transcript" value={String(session.transcript?.words.length ?? 0)} />
                <Metric label="Typed words" value={String(countSessionTypedWords(session))} />
                <Metric label="Telemetry" value={String(countTelemetrySamples(session.telemetry))} />
              </div>
              <div className="admin-actions">
                <button type="button" className="secondary-button" onClick={() => onExportSession(session)}>
                  Export
                </button>
                <button type="button" className="secondary-button" onClick={() => onCopySession(session)}>
                  Copy
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function SessionDashboard({
  session,
  sessions,
  onBackToLeaderboard,
  onBackToTraining,
}: {
  session: StoredSession;
  sessions: StoredSession[];
  onBackToLeaderboard: () => void;
  onBackToTraining: () => void;
}) {
  const telemetry = cloneTelemetry(session.telemetry);
  const goals = buildAdaptiveGoals(sessions, session);
  const insights = buildCoachingInsights(session, goals);
  const duration = formatTelemetryDuration(telemetry);
  const transcriptReview = buildTranscriptReview(session);
  const kpiSectionTooltip = 'Session KPI summary with score, points, accuracy, speed, lag, rate, repeats, and duration.';
  const kpiSectionCopyText =
    `Widget #0 - Session KPIs: ` +
    [
      `Score=${session.metrics.score}`,
      `Points=${session.metrics.points}`,
      `Accuracy=${session.metrics.accuracy.toFixed(1)}%`,
      `WPM=${session.metrics.wpm.toFixed(1)}`,
      `Lag=${session.metrics.lagSec.toFixed(2)}s`,
      `Rate=${session.metrics.rate.toFixed(2)}x`,
      `Repeats=${telemetry.repeatCount}`,
      `Duration=${duration}`,
    ].join(', ');

  return (
    <section className="panel workspace-panel dashboard-workspace">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">Coaching dashboard</p>
          <h2>{session.name || 'Untitled session'}</h2>
          <span className="dashboard-meta">
            {formatSessionStatus(session.status)} · {formatSessionDate(session.updatedAt)}
          </span>
        </div>
        <div className="dashboard-header-actions">
          <button type="button" className="secondary-button" onClick={onBackToLeaderboard}>
            Back to leaderboard
          </button>
          <button type="button" className="secondary-button" onClick={onBackToTraining}>
            Back to training
          </button>
        </div>
      </div>

      <section className="dashboard-kpi-section">
        <div className="dashboard-card-header dashboard-kpi-section-header">
          <h3>Widget #0 - Session KPIs</h3>
          <WidgetTools tooltip={kpiSectionTooltip} copyText={kpiSectionCopyText} />
        </div>
        <div className="dashboard-kpis">
          <DashboardKpi label="Score" value={String(session.metrics.score)} />
          <DashboardKpi label="Points" value={String(session.metrics.points)} />
          <DashboardKpi label="Accuracy" value={`${session.metrics.accuracy.toFixed(1)}%`} target={`${goals.accuracy.toFixed(0)}% goal`} />
          <DashboardKpi label="WPM" value={session.metrics.wpm.toFixed(1)} target={`${goals.wpmMin}-${goals.wpmMax} goal`} />
          <DashboardKpi label="Lag" value={`${session.metrics.lagSec.toFixed(2)}s`} target={`${goals.lagMin}-${goals.lagMax}s goal`} />
          <DashboardKpi label="Rate" value={`${session.metrics.rate.toFixed(2)}x`} />
          <DashboardKpi label="Repeats" value={String(telemetry.repeatCount)} target={`<= ${goals.repeatsMax} goal`} />
          <DashboardKpi label="Duration" value={duration} />
        </div>
      </section>

      <TranscriptReviewWidget review={transcriptReview} />

      <div className="dashboard-grid">
        <DashboardChart
          widgetIndex={2}
          title="Accuracy over time"
          empty={telemetry.accuracySeries.length === 0}
          copyText={`Accuracy over time: ${telemetry.accuracySeries.length > 0 ? telemetry.accuracySeries.map((value) => value.toFixed(1)).join(', ') : 'No data'}`}
        >
          <Suspense fallback={<ChartLoadingState />}>
            <DashboardLineChart series={telemetry.accuracySeries} min={0} max={100} suffix="%" />
          </Suspense>
        </DashboardChart>
        <DashboardChart
          widgetIndex={3}
          title="WPM over time"
          empty={telemetry.wpmSeries.length === 0}
          copyText={`WPM over time: ${telemetry.wpmSeries.length > 0 ? telemetry.wpmSeries.map((value) => value.toFixed(1)).join(', ') : 'No data'}`}
        >
          <Suspense fallback={<ChartLoadingState />}>
            <DashboardLineChart series={telemetry.wpmSeries} min={0} max={Math.max(120, ...telemetry.wpmSeries)} />
          </Suspense>
        </DashboardChart>
        <DashboardChart
          widgetIndex={4}
          title="Lag over time"
          empty={telemetry.lagSeries.length === 0}
          copyText={`Lag over time: ${telemetry.lagSeries.length > 0 ? telemetry.lagSeries.map((value) => value.toFixed(2)).join(', ') : 'No data'}`}
        >
          <Suspense fallback={<ChartLoadingState />}>
            <DashboardLineChart series={telemetry.lagSeries} min={-10} max={10} suffix="s" />
          </Suspense>
        </DashboardChart>
        <DashboardChart
          widgetIndex={5}
          title="Playback rate distribution"
          empty={telemetry.rateDistribution.length === 0}
          copyText={`Playback rate distribution: ${telemetry.rateDistribution.length > 0 ? telemetry.rateDistribution.map((entry) => `${entry.rate.toFixed(2)}x=${Math.round(entry.seconds)}s`).join(', ') : 'No data'}`}
        >
          <Suspense fallback={<ChartLoadingState />}>
            <DashboardRateBars rateDistribution={telemetry.rateDistribution} />
          </Suspense>
        </DashboardChart>
        <DashboardChart
          widgetIndex={6}
          title="Controller action timeline"
          empty={telemetry.actions.length === 0}
          copyText={`Controller actions: ${telemetry.actions.length > 0 ? telemetry.actions.map((action) => `${action.action}@${action.t.toFixed(1)}s`).join(', ') : 'No data'}`}
        >
          <Suspense fallback={<ChartLoadingState />}>
            <DashboardActionTimeline actions={telemetry.actions} />
          </Suspense>
        </DashboardChart>
        <section className="dashboard-card dashboard-insights">
          <div className="dashboard-card-header">
            <h3>Widget #7 - Coaching insights</h3>
            <WidgetTools
              tooltip={chartHelpText('Coaching insights') ?? ''}
              copyText={`Coaching insights: ${insights.length > 0 ? insights.join(' | ') : 'No insights'}`}
            />
          </div>
          <div className="insight-list">
            {insights.map((insight) => (
              <p key={insight}>{insight}</p>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function DashboardKpi({ label, value, target }: { label: string; value: string; target?: string }) {
  const tooltip = kpiHelpText(label);
  const copyText = `${label}: ${value}${target ? ` (${target})` : ''}`;
  return (
    <div className="dashboard-kpi">
      {tooltip ? <WidgetTools tooltip={tooltip} copyText={copyText} /> : null}
      <span>{label}</span>
      <strong>{value}</strong>
      {target ? <small>{target}</small> : null}
    </div>
  );
}

function TranscriptReviewWidget({ review }: { review: TranscriptReview }) {
  const tooltip =
    'Compares what you typed against the target text. Input 1 uses Whisper transcript, Input 2 uses pasted TTS text, and Input 3 uses Kokoro source text.';
  const typedWords = review.tokens.length;
  const totalPoints = review.tokens.reduce((sum, token) => sum + token.points, 0);
  const exactPoints = review.tokens
    .filter((token) => token.status === 'correct')
    .reduce((sum, token) => sum + token.points, 0);
  const reviewPoints = review.tokens
    .filter((token) => token.status === 'fuzzy')
    .reduce((sum, token) => sum + token.points, 0);
  const zeroPointWords = review.tokens.filter((token) => token.points === 0).length;
  const copyText = [
    'Transcript review analytics',
    `Correct=${review.correct}`,
    `Review=${review.fuzzy}`,
    `Wrong/extra=${review.extra}`,
    `Missed=${review.missed}`,
    `Typed words=${typedWords}`,
    `Total points=${totalPoints}`,
    `Exact-match points=${exactPoints}`,
    `Review points=${reviewPoints}`,
    `Zero-point words=${zeroPointWords}`,
  ].join(', ');
  return (
    <section className="dashboard-card transcript-review-card">
      <div className="transcript-review-header">
        <div className="transcript-review-title-row">
          <h3>Widget #1 - Transcript review</h3>
          <div className="transcript-review-tools">
            <WidgetTools tooltip={tooltip} copyText={copyText} />
          </div>
        </div>
        <p className="transcript-review-description">
          Green words earned points. Yellow words were accepted with a small typo. Red words did not match the transcript.
        </p>
        <div className="transcript-review-stats">
          <Metric label="Correct" value={String(review.correct)} />
          <Metric label="Review" value={String(review.fuzzy)} />
          <Metric label="Wrong / extra" value={String(review.extra)} />
          <Metric label="Missed" value={String(review.missed)} />
        </div>
        <div className="transcript-review-stats transcript-review-analytics">
          <Metric label="Typed words" value={String(typedWords)} />
          <Metric label="Total points" value={String(totalPoints)} />
          <Metric label="Exact points" value={String(exactPoints)} />
          <Metric label="Review points" value={String(reviewPoints)} />
          <Metric label="Zero-point words" value={String(zeroPointWords)} />
          <Metric label="Scored words" value={String(review.correct + review.fuzzy)} />
        </div>
      </div>

      {review.tokens.length === 0 ? (
        <div className="dashboard-empty-wrap">
          <p className="dashboard-empty">No typed transcription is saved for this session yet.</p>
        </div>
      ) : (
        <div className="word-review-flow" aria-label="Typed transcript word review">
          {review.tokens.map((token) => (
            <span key={`${token.typedIndex}-${token.word}`} className={`word-review-chip word-review-${token.status}`}>
              <small>{token.points > 0 ? `+${token.points}` : '0'}</small>
              <strong>{token.word}</strong>
              {token.expected ? <em>expected: {token.expected}</em> : null}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function DashboardChart({
  widgetIndex,
  title,
  empty,
  copyText,
  children,
}: {
  widgetIndex: number;
  title: string;
  empty: boolean;
  copyText: string;
  children: React.ReactNode;
}) {
  const tooltip = chartHelpText(title);
  return (
    <section className="dashboard-card">
      <div className="dashboard-card-header">
        <h3>{`Widget #${widgetIndex} - ${title}`}</h3>
        {tooltip ? <WidgetTools tooltip={tooltip} copyText={copyText} /> : null}
      </div>
      {empty ? <p className="dashboard-empty">No timeline data for this session yet.</p> : children}
    </section>
  );
}

function ChartLoadingState() {
  return <p className="dashboard-empty">Loading chart...</p>;
}

function AdaptiveAdapterCard({
  adapter,
  active,
  selected,
  onOpen,
}: {
  adapter: AdaptiveAdapterCardConfig;
  active: boolean;
  selected: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className={`adaptive-adapter-card ${active ? 'adaptive-adapter-card-active' : ''} ${selected ? 'adaptive-adapter-card-selected' : ''}`}
      onClick={onOpen}
    >
      <div className="adaptive-adapter-card-header">
        <h4>{adapter.title}</h4>
        {active ? <span>Latest</span> : null}
      </div>
      <p>{adapter.execution}</p>
      <div className="adaptive-adapter-meta">
        <Metric label="Telemetry adapter" value={adapter.adapter} />
        <Metric label="Controls" value={adapter.controls} />
      </div>
    </button>
  );
}

function AdaptiveBenchmarkSection({
  id,
  adapters,
  benchmarks,
  expanded,
  onToggleExpanded,
  focusAnchor,
  selectedInputMode,
  selectedLanguage,
  selectedProfile,
  onSelect,
  benchmarkExportMessage,
  scriptPromptMessage,
  sessionFeedback,
  sessionFeedbackMessage,
  onCopyBenchmark,
  onExportBenchmark,
  onCopyScriptPrompt,
  onCopyBenchmarkWithScriptPrompt,
  onCopyScriptTemplate,
  onCopySessionFeedback,
  onCopyBenchmarkFeedback,
  onCopyBenchmarkFeedbackPrompt,
  onCopyBenchmarkFeedbackPromptWithHumanFeedback,
}: {
  id?: string;
  adapters: AdaptiveAdapterCardConfig[];
  benchmarks: AdaptiveBenchmarksByInputLanguage;
  expanded: boolean;
  onToggleExpanded: () => void;
  focusAnchor?: null | 'sessionFeedback';
  selectedInputMode: InputMode;
  selectedLanguage: BenchmarkLanguageButton;
  selectedProfile: InputLanguageBenchmarkMetrics;
  onSelect: (inputMode: InputMode, language: BenchmarkLanguageButton) => void;
  benchmarkExportMessage: string;
  scriptPromptMessage: string;
  sessionFeedback: AdaptiveSessionFeedback | null;
  sessionFeedbackMessage: string;
  onCopyBenchmark: (profile: InputLanguageBenchmarkMetrics) => void;
  onExportBenchmark: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyScriptPrompt: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyBenchmarkWithScriptPrompt: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyScriptTemplate: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopySessionFeedback: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedback: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedbackPrompt: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedbackPromptWithHumanFeedback: (
    profile: InputLanguageBenchmarkMetrics,
    feedback: AdaptiveSessionFeedback | null,
    humanFeedback: string,
  ) => void;
}) {
  const selectedAdapter = adapters.find((adapter) => mapSessionInputMode(adapter.inputMode) === selectedInputMode);
  const [benchmarkSubsectionsExpanded, setBenchmarkSubsectionsExpanded] = useState({
    selector: true,
    workspace: true,
  });

  useEffect(() => {
    if (focusAnchor === 'sessionFeedback') {
      setBenchmarkSubsectionsExpanded((prev) => ({ ...prev, workspace: true }));
    }
  }, [focusAnchor]);
  return (
    <section id={id} className="panel workspace-panel adaptive-benchmark-panel">
      <div className="adaptive-section-header">
        <div>
          <p className="dashboard-eyebrow">Section # 7 - Benchmarks & Coaching</p>
          <h3>Benchmark Profiles</h3>
          <p className="dashboard-meta">Select an input and language to view its benchmark workspace. This is shared across the Adaptive Pace Layer.</p>
        </div>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse section' : 'Expand section'}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${expanded ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>
      {expanded ? (
        <>
          <div className="adaptive-section-header adaptive-subsection-header">
            <div>
              <p className="dashboard-eyebrow">Section # 7.1 - Profile Selector</p>
              <h4>Choose input + language</h4>
            </div>
            <button
              type="button"
              className="secondary-button adaptive-section-toggle"
              onClick={() => setBenchmarkSubsectionsExpanded((prev) => ({ ...prev, selector: !prev.selector }))}
              aria-expanded={benchmarkSubsectionsExpanded.selector}
              aria-label={benchmarkSubsectionsExpanded.selector ? 'Collapse section' : 'Expand section'}
              title={benchmarkSubsectionsExpanded.selector ? 'Collapse' : 'Expand'}
            >
              <span className={`adaptive-section-toggle-icon ${benchmarkSubsectionsExpanded.selector ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
            </button>
          </div>
          {benchmarkSubsectionsExpanded.selector ? (
            <div className="adaptive-benchmark-card-grid">
              {adapters.map((adapter) => {
                const inputMode = mapSessionInputMode(adapter.inputMode);
                return (
                  <article key={inputMode} className={`adaptive-benchmark-card ${selectedInputMode === inputMode ? 'adaptive-benchmark-card-active' : ''}`}>
                    <h4>{adapter.title}</h4>
                    <p>{benchmarkSubtitle(inputMode)}</p>
                    <LanguageButtonRow
                      inputMode={inputMode}
                      selectedInputMode={selectedInputMode}
                      selectedLanguage={selectedLanguage}
                      onSelect={onSelect}
                    />
                    <small>{benchmarkSampleSummary(benchmarks[inputMode])}</small>
                  </article>
                );
              })}
            </div>
          ) : null}

          <div className="adaptive-section-header adaptive-subsection-header">
            <div>
              <p className="dashboard-eyebrow">Section # 7.2 - Selected Profile Workspace</p>
              <h4>{selectedAdapter?.title ?? selectedInputMode} / {formatBenchmarkLanguage(selectedProfile.language)}</h4>
            </div>
            <button
              type="button"
              className="secondary-button adaptive-section-toggle"
              onClick={() => setBenchmarkSubsectionsExpanded((prev) => ({ ...prev, workspace: !prev.workspace }))}
              aria-expanded={benchmarkSubsectionsExpanded.workspace}
              aria-label={benchmarkSubsectionsExpanded.workspace ? 'Collapse section' : 'Expand section'}
              title={benchmarkSubsectionsExpanded.workspace ? 'Collapse' : 'Expand'}
            >
              <span className={`adaptive-section-toggle-icon ${benchmarkSubsectionsExpanded.workspace ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
            </button>
          </div>
          {benchmarkSubsectionsExpanded.workspace ? (
            <AdaptiveBenchmarkWorkspace
              profile={selectedProfile}
              inputTitle={selectedAdapter?.title ?? selectedInputMode}
              focusAnchor={focusAnchor}
              benchmarkExportMessage={benchmarkExportMessage}
              scriptPromptMessage={scriptPromptMessage}
              sessionFeedback={sessionFeedback}
              sessionFeedbackMessage={sessionFeedbackMessage}
              onCopyBenchmark={onCopyBenchmark}
              onExportBenchmark={onExportBenchmark}
              onCopyScriptPrompt={onCopyScriptPrompt}
              onCopyBenchmarkWithScriptPrompt={onCopyBenchmarkWithScriptPrompt}
              onCopyScriptTemplate={onCopyScriptTemplate}
              onCopySessionFeedback={onCopySessionFeedback}
              onCopyBenchmarkFeedback={onCopyBenchmarkFeedback}
              onCopyBenchmarkFeedbackPrompt={onCopyBenchmarkFeedbackPrompt}
              onCopyBenchmarkFeedbackPromptWithHumanFeedback={onCopyBenchmarkFeedbackPromptWithHumanFeedback}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function LanguageButtonRow({
  inputMode,
  selectedInputMode,
  selectedLanguage,
  onSelect,
}: {
  inputMode: InputMode;
  selectedInputMode: InputMode;
  selectedLanguage: BenchmarkLanguageButton;
  onSelect: (inputMode: InputMode, language: BenchmarkLanguageButton) => void;
}) {
  return (
    <div className="adaptive-benchmark-language-row" role="tablist" aria-label={`${inputMode} benchmark language`}>
      {([
        ['en', 'English'],
        ['es', 'Spanish'],
        ['de', inputMode === 'kokoro' ? 'German (non-native)' : 'German'],
      ] as const).map(([language, label]) => (
        <button
          key={language}
          type="button"
          className={`live-metrics-language-tab ${selectedInputMode === inputMode && selectedLanguage === language ? 'live-metrics-language-tab-active' : ''}`}
          onClick={() => onSelect(inputMode, language)}
          aria-pressed={selectedInputMode === inputMode && selectedLanguage === language}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function AdaptiveBenchmarkWorkspace({
  profile,
  inputTitle,
  focusAnchor,
  benchmarkExportMessage,
  scriptPromptMessage,
  sessionFeedback,
  sessionFeedbackMessage,
  onCopyBenchmark,
  onExportBenchmark,
  onCopyScriptPrompt,
  onCopyBenchmarkWithScriptPrompt,
  onCopyScriptTemplate,
  onCopySessionFeedback,
  onCopyBenchmarkFeedback,
  onCopyBenchmarkFeedbackPrompt,
  onCopyBenchmarkFeedbackPromptWithHumanFeedback,
}: {
  profile: InputLanguageBenchmarkMetrics;
  inputTitle: string;
  focusAnchor?: null | 'sessionFeedback';
  benchmarkExportMessage: string;
  scriptPromptMessage: string;
  sessionFeedback: AdaptiveSessionFeedback | null;
  sessionFeedbackMessage: string;
  onCopyBenchmark: (profile: InputLanguageBenchmarkMetrics) => void;
  onExportBenchmark: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyScriptPrompt: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyBenchmarkWithScriptPrompt: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyScriptTemplate: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopySessionFeedback: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedback: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedbackPrompt: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedbackPromptWithHumanFeedback: (
    profile: InputLanguageBenchmarkMetrics,
    feedback: AdaptiveSessionFeedback | null,
    humanFeedback: string,
  ) => void;
}) {
  const languageLabel = formatBenchmarkLanguage(profile.language);
  const recommendedRange = `${profile.recommendation.targetRateRange[0].toFixed(2)}x-${profile.recommendation.targetRateRange[1].toFixed(2)}x`;
  const debugLatest = profile.timeline[profile.timeline.length - 1] ?? null;
  const fallbackDiagnostics = derivePlaybackDiagnosticsFromTimeline(profile.timeline.slice(-60));
  const [workspaceSubsectionsExpanded, setWorkspaceSubsectionsExpanded] = useState({
    kpis: true,
    coach: true,
    script: true,
    feedback: true,
    deepMetrics: true,
    timeline: true,
  });
  const [humanFeedbackEditorOpen, setHumanFeedbackEditorOpen] = useState(false);
  const [humanFeedbackDraft, setHumanFeedbackDraft] = useState('');

  useEffect(() => {
    if (focusAnchor === 'sessionFeedback') {
      setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, feedback: true }));
    }
  }, [focusAnchor]);
  return (
    <div className="adaptive-benchmark-workspace">
      <div className="dashboard-card-header">
        <div>
          <h3>{inputTitle} / {languageLabel}</h3>
          <p className="dashboard-meta">
            Profile key: {profile.inputMode}/{profile.language}
            {profile.inputMode === 'kokoro' && profile.language === 'de' ? ' · Kokoro German is non-native/blocked by default.' : ''}
          </p>
        </div>
        <div className="admin-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => onCopyBenchmark(profile)}
            title="Copy the selected benchmark profile JSON to your clipboard (KPIs, recommendation, weak areas, and recent timeline points)."
          >
            Copy Benchmark JSON
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onExportBenchmark(profile)}
            title="Download the selected benchmark profile JSON as a .json file (same content as Copy Benchmark JSON)."
          >
            Export Benchmark JSON
          </button>
        </div>
      </div>
      {benchmarkExportMessage ? (
        <p className={benchmarkExportMessage.toLowerCase().includes('could not') ? 'error' : 'success'}>{benchmarkExportMessage}</p>
      ) : null}

      <div className="adaptive-section-header adaptive-subsection-header">
        <div>
          <p className="dashboard-eyebrow">Section # 7.2.1 - KPI Summary</p>
          <h4>Benchmark KPIs</h4>
        </div>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={() => setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, kpis: !prev.kpis }))}
          aria-expanded={workspaceSubsectionsExpanded.kpis}
          aria-label={workspaceSubsectionsExpanded.kpis ? 'Collapse section' : 'Expand section'}
          title={workspaceSubsectionsExpanded.kpis ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${workspaceSubsectionsExpanded.kpis ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>
      {workspaceSubsectionsExpanded.kpis ? (
        <div className="today-summary-grid">
          <Metric label="Sweet Spot Score" value={formatScore(profile.sweetSpotScore)} />
          <Metric label="Semantic Fidelity" value={formatScore(profile.semanticFidelityScore)} />
          <Metric label="Control Fidelity" value={formatScore(profile.controlFidelityScore)} />
          <Metric label="Learning Effectiveness" value={formatScore(profile.learningEffectivenessScore)} />
          <Metric label="Flow Stability" value={formatScore(profile.flowStabilityScore)} />
          <Metric label="Avg accuracy" value={`${formatPercent(profile.averageAccuracy)}`} />
          <Metric label="Avg WPM" value={profile.averageWpm.toFixed(1)} />
          <Metric label="Avg lag" value={`${profile.averageLagSec.toFixed(2)}s`} />
          <Metric label="Preferred rate" value={`${profile.preferredPlaybackRate.toFixed(2)}x`} />
          <Metric label="Preferred phrase" value={profile.preferredPhraseSize} />
        </div>
      ) : null}

      <div className="adaptive-section-header adaptive-subsection-header">
        <div>
          <p className="dashboard-eyebrow">Section # 7.2.2 - Coach Charts</p>
          <h4>Target zone and trends</h4>
        </div>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={() => setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, coach: !prev.coach }))}
          aria-expanded={workspaceSubsectionsExpanded.coach}
          aria-label={workspaceSubsectionsExpanded.coach ? 'Collapse section' : 'Expand section'}
          title={workspaceSubsectionsExpanded.coach ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${workspaceSubsectionsExpanded.coach ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>
      {workspaceSubsectionsExpanded.coach ? (
        <div className="adaptive-coach-grid" aria-label="Benchmark coach charts">
          <section className="dashboard-card adaptive-coach-card adaptive-coach-card-gauge">
            <SweetSpotGauge score={profile.sweetSpotScore} />
            <div className="adaptive-coach-card-meta">
              <div>
                <span>Target rate</span>
                <strong>
                  {profile.recommendation.targetRateRange[0].toFixed(2)}x-{profile.recommendation.targetRateRange[1].toFixed(2)}x
                </strong>
              </div>
              <div>
                <span>Target phrase</span>
                <strong>{profile.recommendation.targetPhraseSize}</strong>
              </div>
              <div>
                <span>Target pause</span>
                <strong>{Math.round(profile.recommendation.targetPauseMs)}ms</strong>
              </div>
            </div>
          </section>
          <section className="dashboard-card adaptive-coach-card adaptive-coach-card-zone">
            <TargetZoneChart profile={profile} />
          </section>
          <section className="dashboard-card adaptive-coach-card adaptive-coach-card-trends">
            <MiniTrends profile={profile} />
          </section>
        </div>
      ) : null}

      <div className="adaptive-section-header adaptive-subsection-header">
        <div>
          <p className="dashboard-eyebrow">Section # 7.2.3 - Script Prompt</p>
          <h4>Generate the next script</h4>
        </div>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={() => setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, script: !prev.script }))}
          aria-expanded={workspaceSubsectionsExpanded.script}
          aria-label={workspaceSubsectionsExpanded.script ? 'Collapse section' : 'Expand section'}
          title={workspaceSubsectionsExpanded.script ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${workspaceSubsectionsExpanded.script ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>
      {workspaceSubsectionsExpanded.script ? (
      <section className="adaptive-benchmark-subpanel adaptive-script-prompt-panel">
        <div className="dashboard-card-header">
          <div>
            <h4>Generate Next Dictation Script</h4>
            <p className="dashboard-meta">
              Generate a new DictationScript outside the app (ChatGPT/LLM), then paste JSON back into DictationScript import. Use the buttons below to copy the right context.
            </p>
          </div>
          <div className="admin-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => onCopyScriptPrompt(profile)}
              title="Copies the instructions only. Use this if you already pasted the benchmark context separately."
            >
              Copy LLM Prompt
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onCopyBenchmarkWithScriptPrompt(profile)}
              title="Copies benchmark JSON context plus the LLM instructions. Use this as the default when generating the next script."
            >
              Copy Benchmark + LLM Prompt
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onCopyScriptTemplate(profile)}
              title="Copies a valid DictationScript JSON skeleton (sample output). Use this if the LLM keeps returning invalid or incomplete JSON."
            >
              Copy Sample Output Template
            </button>
          </div>
        </div>
        {scriptPromptMessage ? (
          <p className={scriptPromptMessage.toLowerCase().includes('could not') ? 'error' : 'success'}>{scriptPromptMessage}</p>
        ) : null}
      </section>
      ) : null}

      <div className="adaptive-section-header adaptive-subsection-header">
        <div>
          <p className="dashboard-eyebrow">Section # 7.2.4 - Session Feedback</p>
          <h4>Playback issues and improvement deltas</h4>
        </div>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={() => setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, feedback: !prev.feedback }))}
          aria-expanded={workspaceSubsectionsExpanded.feedback}
          aria-label={workspaceSubsectionsExpanded.feedback ? 'Collapse section' : 'Expand section'}
          title={workspaceSubsectionsExpanded.feedback ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${workspaceSubsectionsExpanded.feedback ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>
      {workspaceSubsectionsExpanded.feedback ? (
      <section className="adaptive-benchmark-subpanel adaptive-session-feedback-panel">
        <div id="adaptive-session-feedback" />
        <div className="dashboard-card-header">
          <div>
            <h4>Session Feedback</h4>
            <p className="dashboard-meta">Use these exports to diagnose repeats/skips/jumps and to generate a better next script based on real results.</p>
          </div>
          <div className="admin-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => onCopySessionFeedback(profile, sessionFeedback)}
              title="Copies session feedback only (verdict, deltas, playback issues). If formal feedback is missing, includes a status plus timeline fallback diagnostics."
            >
              Copy Session Feedback JSON
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onCopyBenchmarkFeedback(profile, sessionFeedback)}
              title="Copies the selected benchmark profile plus the latest session feedback and playback diagnostics. Use this to ask an LLM to analyze what went wrong/right."
            >
              Copy Full Benchmark + Feedback Package
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onCopyBenchmarkFeedbackPrompt(profile, sessionFeedback)}
              title="Copies benchmark + feedback package plus the LLM prompt. Use this to generate the next DictationScript while accounting for playback issues and improvement deltas."
            >
              Copy Benchmark + Feedback + LLM Prompt
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setHumanFeedbackEditorOpen(true);
                window.setTimeout(() => {
                  document.getElementById('adaptive-human-feedback')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 0);
              }}
              title="Opens a box to add your own guidance for the next script, then copies JSON with benchmark + feedback + LLM prompt + your human feedback."
            >
              Copy Benchmark + Feedback + LLM Prompt + Human Feedback
            </button>
          </div>
        </div>
        {humanFeedbackEditorOpen ? (
          <div id="adaptive-human-feedback" className="adaptive-human-feedback-editor">
            <textarea
              value={humanFeedbackDraft}
              onChange={(e) => setHumanFeedbackDraft(e.target.value)}
              placeholder="Add human feedback for the next script (topics, required words, style, constraints)..."
              rows={4}
            />
            <div className="adaptive-human-feedback-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setHumanFeedbackEditorOpen(false);
                  setHumanFeedbackDraft('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onCopyBenchmarkFeedbackPromptWithHumanFeedback(profile, sessionFeedback, humanFeedbackDraft);
                  setHumanFeedbackEditorOpen(false);
                  setHumanFeedbackDraft('');
                }}
                disabled={humanFeedbackDraft.trim().length === 0}
                title={humanFeedbackDraft.trim().length === 0 ? 'Add some feedback first' : 'Copy JSON package'}
              >
                Submit
              </button>
            </div>
          </div>
        ) : null}
        {sessionFeedbackMessage ? (
          <p className={sessionFeedbackMessage.toLowerCase().includes('could not') ? 'error' : 'success'}>{sessionFeedbackMessage}</p>
        ) : null}
        {sessionFeedback ? (
          <>
            <div className="today-summary-grid">
              <Metric label="Verdict" value={sessionFeedback.verdict} />
              <Metric label="Improvement" value={formatScore(sessionFeedback.improvementDelta.overallImprovementScore)} />
              <Metric label="Accuracy delta" value={formatSigned(sessionFeedback.improvementDelta.accuracyDelta)} />
              <Metric label="Lag delta" value={`${formatSigned(sessionFeedback.improvementDelta.lagDelta)}s`} />
              <Metric label="WPM delta" value={formatSigned(sessionFeedback.improvementDelta.wpmDelta)} />
              <Metric label="Sweet spot delta" value={formatSigned(sessionFeedback.improvementDelta.sweetSpotScoreDelta)} />
              <Metric label="Semantic delta" value={formatSigned(sessionFeedback.improvementDelta.semanticFidelityDelta)} />
              <Metric label="Control delta" value={formatSigned(sessionFeedback.improvementDelta.controlFidelityDelta)} />
              <Metric label="Learning delta" value={formatSigned(sessionFeedback.improvementDelta.learningEffectivenessDelta)} />
              <Metric label="Flow delta" value={formatSigned(sessionFeedback.improvementDelta.flowStabilityDelta)} />
            </div>
            <div className="adaptive-benchmark-grid">
              <section className="adaptive-benchmark-subpanel">
                <h4>Playback Issues</h4>
                <div className="today-summary-grid">
                  <Metric label="Repeated phrases" value={String(sessionFeedback.playbackIssues.repeatedPhraseCount)} />
                  <Metric label="Max repeat" value={String(sessionFeedback.playbackIssues.maxRepeatCountForSinglePhrase)} />
                  <Metric label="Skipped phrases" value={String(sessionFeedback.playbackIssues.skippedPhraseCount)} />
                  <Metric label="Out-of-order" value={String(sessionFeedback.playbackIssues.outOfOrderAdvanceCount)} />
                  <Metric label="Replay advanced" value={String(sessionFeedback.playbackIssues.replayAdvancedPhraseCount)} />
                  <Metric label="Index jumps" value={String(sessionFeedback.playbackIssues.phraseIndexJumpCount)} />
                </div>
                {sessionFeedback.playbackIssues.repeatedPhrases.length > 0 ? (
                  <div className="script-phrase-preview">
                    {sessionFeedback.playbackIssues.repeatedPhrases.slice(0, 5).map((phrase) => (
                      <p key={phrase.phraseId} className="hint">
                        {phrase.phraseId}: repeated {phrase.repeatCount} time(s) · {phrase.textPreview}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="hint">No repeated phrases detected.</p>
                )}
              </section>
              <section className="adaptive-benchmark-subpanel">
                <h4>Phrase Stats</h4>
                <div className="today-summary-grid">
                  <Metric label="Total phrases" value={String(sessionFeedback.phraseStats.totalPhrases)} />
                  <Metric label="Completed" value={String(sessionFeedback.phraseStats.completedPhrases)} />
                  <Metric label="Replays" value={String(sessionFeedback.phraseStats.replayCount)} />
                  <Metric label="Advances" value={String(sessionFeedback.phraseStats.phraseAdvanceCount)} />
                  <Metric label="Avg repeats" value={sessionFeedback.phraseStats.averageRepeatsPerPhrase.toFixed(2)} />
                </div>
                {sessionFeedback.notes.map((note) => (
                  <p key={note} className="hint">{note}</p>
                ))}
              </section>
            </div>
          </>
        ) : (
          <div className="adaptive-benchmark-subpanel">
            <p className="hint">No completed session feedback for this input/language yet. Timeline fallback diagnostics are shown when available.</p>
            <div className="today-summary-grid">
              <Metric label="Fallback source" value={fallbackDiagnostics.source} />
              <Metric label="Replay events" value={String(fallbackDiagnostics.replayCount)} />
              <Metric label="Repeated phrases" value={String(fallbackDiagnostics.repeatedPhraseCount)} />
              <Metric label="Max repeat" value={String(fallbackDiagnostics.maxRepeatCountForSinglePhrase)} />
              <Metric label="Deferred pauses" value={String(fallbackDiagnostics.deferPauseCount)} />
              <Metric label="Index jumps" value={String(fallbackDiagnostics.phraseIndexJumpCount)} />
            </div>
            {fallbackDiagnostics.repeatedPhrasePreviews.length > 0 ? (
              <div className="script-phrase-preview">
                {fallbackDiagnostics.repeatedPhrasePreviews.slice(0, 5).map((preview) => (
                  <p key={preview} className="hint">{preview}</p>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>
      ) : null}

      <div className="adaptive-section-header adaptive-subsection-header">
        <div>
          <p className="dashboard-eyebrow">Section # 7.2.5 - Deep Metrics</p>
          <h4>Semantic + recovery + recommendation</h4>
        </div>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={() => setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, deepMetrics: !prev.deepMetrics }))}
          aria-expanded={workspaceSubsectionsExpanded.deepMetrics}
          aria-label={workspaceSubsectionsExpanded.deepMetrics ? 'Collapse section' : 'Expand section'}
          title={workspaceSubsectionsExpanded.deepMetrics ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${workspaceSubsectionsExpanded.deepMetrics ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>
      {workspaceSubsectionsExpanded.deepMetrics ? (
        <div className="adaptive-benchmark-grid">
          <section className="adaptive-benchmark-subpanel">
            <h4>Rate vs accuracy</h4>
            {profile.rateAccuracyBuckets.length === 0 ? (
              <p className="hint">No rate buckets collected yet.</p>
            ) : (
              <div className="adaptive-rate-bars">
                {profile.rateAccuracyBuckets.map((bucket) => (
                  <div key={bucket.rate} className="adaptive-rate-bar">
                    <span>{bucket.rate.toFixed(2)}x</span>
                    <div className="today-chart-track">
                      <div className="today-chart-fill" style={{ width: `${Math.round(normalizeAccuracyForDisplay(bucket.averageAccuracy) * 100)}%` }} />
                    </div>
                    <small>{formatPercent(bucket.averageAccuracy)} · lag {bucket.averageLagSec.toFixed(1)}s</small>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="adaptive-benchmark-subpanel">
            <h4>Semantic quality</h4>
            <div className="today-summary-grid">
              <Metric label="Cut penalty" value={profile.semanticCutPenalty.toFixed(2)} />
              <Metric label="Unsafe pauses" value={String(profile.unsafePauseCount)} />
              <Metric label="Safe pauses" value={String(profile.safePauseCount)} />
              <Metric label="Deferred pauses" value={String(profile.deferredPauseCount)} />
              <Metric label="Replay denied" value={String(profile.replayDeniedByBoundaryCount)} />
              <Metric label="Completeness" value={profile.averageSemanticCompleteness.toFixed(2)} />
              <Metric label="Difficulty" value={profile.averagePhraseDifficulty.toFixed(2)} />
            </div>
          </section>

          <section className="adaptive-benchmark-subpanel">
            <h4>Adaptation and recovery</h4>
            <div className="today-summary-grid">
              <Metric label="Recovery" value={formatScore(profile.recoveryScore)} />
              <Metric label="Recovery time" value={profile.timeToRecoveryMs === null ? 'n/a' : `${Math.round(profile.timeToRecoveryMs / 1000)}s`} />
              <Metric label="Error burst" value={String(profile.errorBurstLength)} />
              <Metric label="Mode switches" value={profile.modeSwitchFrequency.toFixed(2)} />
              <Metric label="Rate variance" value={profile.rateVariance.toFixed(3)} />
              <Metric label="Pause variance" value={profile.pauseVariance.toFixed(0)} />
            </div>
          </section>

          <section className="adaptive-benchmark-subpanel">
            <h4>Recommendation</h4>
            <div className="today-summary-grid">
              <Metric label="Target rate" value={recommendedRange} />
              <Metric label="Phrase size" value={profile.recommendation.targetPhraseSize} />
              <Metric label="Pause" value={`${profile.recommendation.targetPauseMs}ms`} />
              <Metric label="Confidence" value={formatScore(profile.recommendation.confidence)} />
            </div>
            <p className="dashboard-meta">{profile.recommendation.summary}</p>
            <p className="hint">Focus: {profile.recommendation.nextTrainingFocus.join(', ')}</p>
            <p className="hint">Weak areas: {profile.weakAreas.length > 0 ? profile.weakAreas.join(', ') : 'none detected'}</p>
          </section>
        </div>
      ) : null}

      <div className="adaptive-section-header adaptive-subsection-header">
        <div>
          <p className="dashboard-eyebrow">Section # 7.2.6 - Timeline & Debug</p>
          <h4>Recent decisions</h4>
        </div>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={() => setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, timeline: !prev.timeline }))}
          aria-expanded={workspaceSubsectionsExpanded.timeline}
          aria-label={workspaceSubsectionsExpanded.timeline ? 'Collapse section' : 'Expand section'}
          title={workspaceSubsectionsExpanded.timeline ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${workspaceSubsectionsExpanded.timeline ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>

      {workspaceSubsectionsExpanded.timeline ? (
        <div className="adaptive-benchmark-grid">
          <section className="adaptive-benchmark-subpanel adaptive-benchmark-timeline">
            <h4>Timeline and debug</h4>
            <div className="today-summary-grid">
              <Metric label="Sessions" value={String(profile.sessionCount)} />
              <Metric label="Samples" value={String(profile.sampleCount)} />
              <Metric label="Window" value={`${profile.rollingWindowDays} days`} />
              <Metric label="Last update" value={profile.lastUpdatedAt ? formatSessionDate(profile.lastUpdatedAt) : 'n/a'} />
              <Metric label="Phrase index" value={debugLatest?.phraseIndex !== undefined ? `${debugLatest.phraseIndex}/${debugLatest.totalSemanticPhrases ?? 'n/a'}` : 'n/a'} />
              <Metric label="Pacing mode" value={debugLatest?.mode ?? 'n/a'} />
              <Metric label="Decision" value={debugLatest?.decisionReason ?? 'n/a'} />
              <Metric label="Hint" value={debugLatest?.executionHint ?? 'n/a'} />
            </div>
            <div className="adaptive-timeline-row">
              {profile.timeline.slice(-60).map((point, index) => (
                <span
                  key={`${point.timestampMs}-${index}`}
                  className={`adaptive-timeline-dot adaptive-timeline-dot-${point.event ?? point.mode}`}
                  title={`${point.event ?? point.mode} · ${point.playbackRate.toFixed(2)}x · ${formatPercent(point.accuracy)}`}
                />
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function WidgetTools({ tooltip, copyText }: { tooltip: string; copyText: string }) {
  return (
    <div className="widget-tools">
      <CopyHelpButton text={copyText} />
      <HelpIcon tooltip={tooltip} />
    </div>
  );
}

function HelpIcon({ tooltip }: { tooltip: string }) {
  return (
    <button
      type="button"
      className="help-icon"
      aria-label="Help"
      data-tooltip={tooltip}
      onClick={(event) => event.preventDefault()}
    >
      ?
    </button>
  );
}

function CopyHelpButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="copy-help-icon"
      aria-label="Copy values"
      title="Copy values"
      onClick={() => void navigator.clipboard.writeText(text)}
    >
      ⧉
    </button>
  );
}

function kpiHelpText(label: string): string | null {
  const map: Record<string, string> = {
    Score: 'Overall performance score derived from accuracy, pace, lag, and points.',
    Points: 'Word-matching points earned from your typed attempt versus target words.',
    Accuracy: 'Percent of typed words matching target words, including fuzzy matches.',
    WPM: 'Typing speed estimate in words per minute during the attempt.',
    Lag: 'How far typing progress is behind or ahead of expected playback position in seconds.',
    Rate: 'Playback speed multiplier used during the session.',
    Repeats: 'How many times a segment or phrase was repeated during the attempt.',
    Duration: 'Elapsed time between telemetry start and finish timestamps.',
  };
  return map[label] ?? null;
}

function chartHelpText(title: string): string | null {
  const map: Record<string, string> = {
    'Accuracy over time': 'Shows how accuracy changes across session samples.',
    'WPM over time': 'Shows how typing speed changes across session samples.',
    'Lag over time': 'Shows timing and position lag trend across session samples.',
    'Playback rate distribution': 'Shows how many seconds were spent at each playback rate.',
    'Controller action timeline': 'Shows when the controller chose hold, speed up, speed down, or pause repeat.',
    'Coaching insights': 'Heuristic coaching notes derived from metrics and telemetry versus goal ranges.',
  };
  return map[title] ?? null;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
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
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return `${minutes}m ${remaining}s`;
}

function buildAdminStorageSummary(sessions: StoredSession[]): AdminStorageSummary {
  const localStorageEntries = getDictaLocalStorageEntries();
  const inputModeCounts = sessions.reduce<Record<SessionInputMode, number>>(
    (counts, session) => {
      counts[session.inputMode] += 1;
      return counts;
    },
    { input1: 0, input2: 0, input3: 0, input4: 0 },
  );

  return {
    sessionCount: sessions.length,
    finishedSessions: sessions.filter((session) => session.status === 'finished').length,
    inputModeCounts,
    localStorageEntries,
    dictaLocalStorageBytes: localStorageEntries.reduce((sum, entry) => sum + entry.bytes, 0),
    totalTranscriptWords: sessions.reduce((sum, session) => sum + (session.transcript?.words.length ?? 0), 0),
    ttsTextChars: sessions.reduce((sum, session) => sum + session.ttsText.length, 0),
    kokoroTextChars: sessions.reduce((sum, session) => sum + session.kokoroText.length, 0),
    typedTextChars: sessions.reduce((sum, session) => sum + session.inputText.length + session.ttsPracticeText.length + session.kokoroPracticeText.length, 0),
    telemetrySamples: sessions.reduce((sum, session) => sum + countTelemetrySamples(session.telemetry), 0),
    telemetryActions: sessions.reduce((sum, session) => sum + session.telemetry.actions.length, 0),
    ttsChunks: sessions.reduce((sum, session) => sum + session.telemetry.ttsChunks.length + session.kokoroChunks.length, 0),
    blobAudioRefs: sessions.filter((session) => session.audioUrl.startsWith('blob:')).length,
    remoteAudioRefs: sessions.filter((session) => /^https?:\/\//.test(session.audioUrl)).length,
    audioLabels: sessions.filter((session) => session.audioLabel.trim().length > 0).length,
  };
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

function countTelemetrySamples(telemetry: SessionTelemetry): number {
  return Math.max(
    telemetry.lagSeries.length,
    telemetry.wpmSeries.length,
    telemetry.accuracySeries.length,
  );
}

function countSessionTypedWords(session: StoredSession): number {
  const text =
    session.inputMode === 'input2' || session.inputMode === 'input4'
      ? session.ttsPracticeText
      : session.inputMode === 'input3'
        ? session.kokoroPracticeText
        : session.inputText;
  return text.split(/\s+/).filter(Boolean).length;
}

function estimateJsonBytes(value: unknown): number {
  return byteSize(JSON.stringify(value));
}

function byteSize(value: string): number {
  return new TextEncoder().encode(value).length;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kib = bytes / 1024;
  if (kib < 1024) return `${kib.toFixed(1)} KB`;
  return `${(kib / 1024).toFixed(2)} MB`;
}

function formatSessionInputMode(mode: SessionInputMode): string {
  if (mode === 'input1') return 'Original audio';
  if (mode === 'input2') return 'Browser TTS';
  if (mode === 'input3') return 'Kokoro local';
  return 'Qwen cache';
}

function benchmarkSubtitle(inputMode: InputMode): string {
  if (inputMode === 'audio') return 'Real-world uploaded or recorded audio with transcript alignment.';
  if (inputMode === 'browser-tts') return 'Browser or OS voice baseline and fallback execution.';
  if (inputMode === 'kokoro') return 'Local model execution with native EN/ES support.';
  return 'Cached semantic chunks with browser fallback.';
}

function benchmarkSampleSummary(profiles?: Record<string, InputLanguageBenchmarkMetrics>): string {
  if (!profiles) return 'No samples yet';
  const sampleCount = Object.values(profiles).reduce((sum, profile) => sum + profile.sampleCount, 0);
  const sessionCount = Object.values(profiles).reduce((sum, profile) => sum + profile.sessionCount, 0);
  return `${sampleCount} samples · ${sessionCount} sessions`;
}

function formatBenchmarkLanguage(language: LanguageCode): string {
  if (language === 'en') return 'English';
  if (language === 'es') return 'Spanish';
  if (language === 'de') return 'German';
  if (language === 'unknown') return 'Unknown language';
  return String(language).toUpperCase();
}

function formatScore(value: number): string {
  return `${Math.round(clamp(value, 0, 1) * 100)}%`;
}

function formatSigned(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

function normalizeAccuracyForDisplay(value: number): number {
  return clamp(value > 1 ? value / 100 : value, 0, 1);
}

function formatPercent(value: number): string {
  return `${(normalizeAccuracyForDisplay(value) * 100).toFixed(1)}%`;
}

function formatAdaptiveModeFromSession(session: StoredSession): string {
  if (session.metrics.trend === 'declining') return 'Support';
  if (session.metrics.trend === 'improving') return 'Flow';
  return 'Balanced';
}

function buildAdaptiveAdapterCards(): AdaptiveAdapterCardConfig[] {
  return [
    {
      inputMode: 'input1',
      title: 'Input #1 - Original Audio',
      adapter: 'audioTelemetryAdapter',
      execution: 'Controls native audio playback rate, lag sync, repeat, and seek behavior against a Whisper transcript.',
      controls: 'Rate + repeat/seek',
    },
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

export default App;

function createStoredSession(index = 1, inputMode: SessionInputMode = 'input1', name?: string): StoredSession {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: name?.trim() || `Session ${index}`,
    createdAt: now,
    updatedAt: now,
    inputMode,
    inputSettingsLocked: false,
    audioUrl: '',
    audioSourceUrlInput: '',
    audioLabel: '',
    transcriptionLanguage: inputMode === 'input1' ? 'de' : null,
    transcript: null,
    inputText: '',
    ttsText: '',
    ttsLanguage: inputMode === 'input2' || inputMode === 'input4' ? 'de' : null,
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
    dictationScript: null,
  };
}

function createSessionFromScript(script: DictationScript, index: number, inputMode: SessionInputMode): StoredSession {
  const text = script.phrases.map((phrase) => phrase.text).join(' ');
  const language = scriptLanguageToTtsLanguage(script.language);
  const session: StoredSession = {
    ...createStoredSession(index, inputMode, script.title),
    inputSettingsLocked: true,
    difficulty: script.difficulty,
    sessionSource: 'dictationScript',
    dictationScript: script,
  };

  if (inputMode === 'input1') {
    return {
      ...session,
      transcriptionLanguage: language,
      transcript: buildTextTranscript(text),
      audioLabel: 'DictationScript transcript source',
    };
  }

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
  };
}

function mapDictationScriptInputModeToSession(inputMode: string): SessionInputMode | null {
  if (inputMode === 'input1' || inputMode === 'audio') return 'input1';
  if (inputMode === 'input2' || inputMode === 'browser-tts') return 'input2';
  if (inputMode === 'input3' || inputMode === 'kokoro') return 'input3';
  if (inputMode === 'input4' || inputMode === 'qwen-cloud') return 'input4';
  return null;
}

function scriptLanguageToTtsLanguage(language: string): TtsLanguage {
  if (language === 'en' || language === 'de' || language === 'es') return language;
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
    return [createStoredSession()];
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>[];
    if (parsed.length === 0) {
      return [createStoredSession()];
    }
    return parsed.map((session, index) => {
      const inputMode: SessionInputMode =
        session.inputMode === 'input2' || session.inputMode === 'input3' || session.inputMode === 'input4' ? session.inputMode : 'input1';
      const scriptResult = validateDictationScript((session as any).dictationScript);

      const base: StoredSession = {
        id: session.id ?? createStoredSession(index + 1).id,
        name: session.name ?? `Session ${index + 1}`,
        createdAt: session.createdAt ?? new Date().toISOString(),
        updatedAt: session.updatedAt ?? new Date().toISOString(),
        inputMode,
        inputSettingsLocked: Boolean(session.inputSettingsLocked),
        audioUrl: session.audioUrl ?? '',
        audioSourceUrlInput: session.audioSourceUrlInput ?? '',
        audioLabel: session.audioLabel ?? '',
        transcriptionLanguage:
          session.transcriptionLanguage === 'en' || session.transcriptionLanguage === 'de' || session.transcriptionLanguage === 'es'
            ? session.transcriptionLanguage
            : null,
        transcript: session.transcript ?? null,
        inputText: session.inputText ?? '',
        ttsText: session.ttsText ?? '',
        ttsLanguage: session.ttsLanguage === 'en' || session.ttsLanguage === 'de' || session.ttsLanguage === 'es' ? session.ttsLanguage : null,
        ttsPracticeText: session.ttsPracticeText ?? '',
        kokoroText: session.kokoroText ?? '',
        kokoroLanguage:
          session.kokoroLanguage === 'en' || session.kokoroLanguage === 'de' || session.kokoroLanguage === 'es' ? session.kokoroLanguage : null,
        kokoroVoice: session.kokoroVoice ?? 'default',
        kokoroPracticeText: session.kokoroPracticeText ?? '',
        kokoroChunks: session.kokoroChunks ?? [],
        difficulty: session.difficulty ?? 'normal',
        status: session.status ?? 'ready',
        metrics: {
          ...createDefaultMetrics(),
          ...session.metrics,
        },
        telemetry: cloneTelemetry((session as any).telemetry),
        sessionSource: session.sessionSource === 'dictationScript' && scriptResult.ok ? 'dictationScript' : 'plainText',
        dictationScript: scriptResult.ok ? scriptResult.script : null,
      };

      return normalizeSessionForPersistence(base);
    });
  } catch {
    return [createStoredSession()];
  }
}

function formatSessionDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatSessionPlaybackDuration(session: StoredSession): string {
  return formatTelemetryDuration(cloneTelemetry(session.telemetry));
}

function buildTranscriptSegments(transcript: Transcript | null): Array<{ start: number; end: number; text: string }> {
  if (!transcript || transcript.words.length === 0) {
    return [];
  }

  const segments: Array<{ start: number; end: number; text: string }> = [];
  let bucket = [transcript.words[0]];

  for (let i = 1; i < transcript.words.length; i += 1) {
    const word = transcript.words[i];
    const bucketStart = bucket[0].start;
    const shouldSplit =
      bucket.length >= 12 ||
      word.start - bucketStart >= 7 ||
      word.start - bucket[bucket.length - 1].end >= 1.4;

    if (shouldSplit) {
      segments.push({
        start: bucket[0].start,
        end: bucket[bucket.length - 1].end,
        text: bucket.map((entry) => entry.word).join(' '),
      });
      bucket = [word];
    } else {
      bucket.push(word);
    }
  }

  if (bucket.length > 0) {
    segments.push({
      start: bucket[0].start,
      end: bucket[bucket.length - 1].end,
      text: bucket.map((entry) => entry.word).join(' '),
    });
  }

  return segments;
}

function formatTimestamp(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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

function computeSessionScore({
  accuracy,
  lagSec,
  wpm,
  rate,
  points,
}: {
  accuracy: number;
  lagSec: number;
  wpm: number;
  rate: number;
  points: number;
}): number {
  const lagPenalty = Math.abs(lagSec) * 8;
  const accuracyWeight = accuracy * 0.65;
  const paceWeight = Math.min(wpm, 120) * 0.35;
  const pointsWeight = points * 3;
  const rateWeight = Math.abs(rate - 1) < 0.01 ? 4 : 0;
  return Math.max(0, Math.round(pointsWeight + accuracyWeight + paceWeight + rateWeight - lagPenalty));
}

function formatSessionStatus(value: SessionStatus): string {
  switch (value) {
    case 'running':
      return 'Running';
    case 'paused':
      return 'Paused';
    case 'finished':
      return 'Finished';
    default:
      return 'Ready';
  }
}

type DashboardGoals = {
  accuracy: number;
  wpmMin: number;
  wpmMax: number;
  lagMin: number;
  lagMax: number;
  repeatsMax: number;
};

type TranscriptReviewToken = {
  typedIndex: number;
  word: string;
  expected: string;
  status: 'correct' | 'fuzzy' | 'extra';
  points: number;
};

type TranscriptReview = {
  tokens: TranscriptReviewToken[];
  correct: number;
  fuzzy: number;
  extra: number;
  missed: number;
};

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

function buildTranscriptReview(session: StoredSession): TranscriptReview {
  const typedSource = session.inputMode === 'input2' ? session.ttsPracticeText : session.inputMode === 'input3' ? session.kokoroPracticeText : session.inputText;
  const targetTranscript =
    session.inputMode === 'input2'
      ? buildTextTranscript(session.ttsText)
      : session.inputMode === 'input3'
        ? buildTextTranscript(session.kokoroText)
        : session.transcript;
  const rawTypedWords = typedSource.split(/\s+/).filter(Boolean);
  const typedWords = rawTypedWords.map((word) => normalizeWord(word)).filter(Boolean);
  const targetWords = targetTranscript ? targetTranscript.words.map((word) => normalizeWord(word.word)).filter(Boolean) : [];

  if (typedWords.length === 0 || targetWords.length === 0) {
    return {
      tokens: [],
      correct: 0,
      fuzzy: 0,
      extra: typedWords.length,
      missed: targetWords.length,
    };
  }

  const pairs = alignWordPairs(typedWords, targetWords);
  const pairByTypedIndex = new Map(pairs.map((pair) => [pair.typedIndex, pair]));
  let correct = 0;
  let fuzzy = 0;
  let extra = 0;

  const tokens = typedWords.map((word, typedIndex) => {
    const pair = pairByTypedIndex.get(typedIndex);
    if (!pair) {
      extra += 1;
      return {
        typedIndex,
        word: rawTypedWords[typedIndex] ?? word,
        expected: targetWords[Math.min(typedIndex, targetWords.length - 1)] ?? '',
        status: 'extra' as const,
        points: 0,
      };
    }

    if (pair.exact) {
      correct += 1;
    } else {
      fuzzy += 1;
    }

    return {
      typedIndex,
      word: rawTypedWords[typedIndex] ?? word,
      expected: pair.exact ? '' : targetWords[pair.targetIndex] ?? '',
      status: pair.exact ? ('correct' as const) : ('fuzzy' as const),
      points: 1,
    };
  });

  return {
    tokens,
    correct,
    fuzzy,
    extra,
    missed: Math.max(targetWords.length - pairs.length, 0),
  };
}

function buildAdaptiveGoals(sessions: StoredSession[], currentSession: StoredSession): DashboardGoals {
  const finishedSessions = sessions.filter(
    (session) => session.id !== currentSession.id && session.status === 'finished' && session.metrics.points > 0,
  );
  const history = finishedSessions.length > 0
    ? finishedSessions
    : sessions.filter((session) => session.id !== currentSession.id && session.metrics.points > 0);

  if (history.length === 0) {
    return {
      accuracy: 85,
      wpmMin: 45,
      wpmMax: 75,
      lagMin: 1,
      lagMax: 3,
      repeatsMax: 3,
    };
  }

  const recent = history.slice(0, 5);
  const avgAccuracy = average(recent.map((session) => session.metrics.accuracy));
  const avgWpm = average(recent.map((session) => session.metrics.wpm));
  const avgRepeats = average(recent.map((session) => session.telemetry.repeatCount));

  return {
    accuracy: Math.min(95, Math.max(85, avgAccuracy + 3)),
    wpmMin: Math.max(35, Math.round(avgWpm * 0.9)),
    wpmMax: Math.min(100, Math.max(55, Math.round(avgWpm * 1.15 + 5))),
    lagMin: 1,
    lagMax: 3,
    repeatsMax: Math.max(0, Math.floor(avgRepeats)),
  };
}

function buildCoachingInsights(session: StoredSession, goals: DashboardGoals): string[] {
  const insights: string[] = [];
  const { metrics, telemetry } = session;

  if (metrics.lagSec > goals.lagMax && metrics.rate <= 0.82) {
    insights.push('Audio slowed down often; practice shorter phrase chunks before increasing speed.');
  }

  if (metrics.accuracy >= goals.accuracy && metrics.wpm < goals.wpmMin) {
    insights.push('Accuracy is strong; the next coaching target is pace.');
  }

  if (metrics.wpm > goals.wpmMax && metrics.accuracy < goals.accuracy) {
    insights.push('Typing speed is high, but accuracy is paying the cost. Slow down and capture cleaner words.');
  }

  if (telemetry.repeatCount > goals.repeatsMax) {
    insights.push('Repeated sections were frequent. Review the repeated passages before the next run.');
  }

  if (Math.abs(metrics.lagSec) > 4 && Math.abs(metrics.lagWords) <= 1) {
    insights.push('Timing and word lag disagree; use this session to review pacing alignment.');
  }

  if (insights.length === 0) {
    insights.push('This session is balanced. Keep the same pace and aim for a small accuracy gain next time.');
  }

  return insights.slice(0, 5);
}

function formatTelemetryDuration(telemetry: SessionTelemetry): string {
  if (!telemetry.startedAt || !telemetry.finishedAt) {
    return 'n/a';
  }

  const ms = new Date(telemetry.finishedAt).getTime() - new Date(telemetry.startedAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) {
    return 'n/a';
  }

  const seconds = Math.round(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
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

function buildHistoricalPerformanceProfile(
  sessions: StoredSession[],
  historyService: HistoricalPerformanceService,
  inputMode: InputMode,
  language?: string,
): HistoricalPerformanceProfile {
  const records = sessions
    .filter((session) => session.status === 'finished' && session.metrics.points > 0)
    .map((session) => {
      const mode = mapSessionInputMode(session.inputMode);
      return {
        inputMode: mode,
        language:
          (mode === 'audio'
            ? session.transcriptionLanguage
            : mode === 'browser-tts'
              ? session.ttsLanguage
              : session.kokoroLanguage) ?? undefined,
        durationSec: Math.max(1, session.metrics.points * 2),
        averagePlaybackRate: clamp(session.metrics.rate, 0.75, 1.15),
        averageWpm: session.metrics.wpm,
        averageAccuracy: clamp01(session.metrics.accuracy / 100),
        averageLagSec: Math.abs(session.metrics.lagSec),
        averagePauseMs: 700,
        replayCount: 0,
        phraseCount: 1,
        supportCount: session.metrics.trend === 'declining' ? 1 : 0,
        balancedCount: session.metrics.trend === 'stable' ? 1 : 0,
        flowCount: session.metrics.trend === 'improving' ? 1 : 0,
        backspaceRate: 0.03,
        correctionRate: 0.05,
        strugglesWithLongPhrases: session.metrics.wpm < 40,
        strugglesWithNumbers: false,
        strugglesWithNames: false,
        strugglesWithPunctuation: false,
        score: session.metrics.score,
        points: session.metrics.points,
        improvementTrend: session.metrics.trend,
        timestamp: session.updatedAt,
        sessionsCount: 1,
        profileConfidence: 0.5,
      };
    });

  if (records.length === 0) {
    return {
      language,
      inputMode,
      comfortablePlaybackRate: 1,
      averageWpm: 55,
      averageAccuracy: 0.92,
      averageLagSec: 1.2,
      averagePauseMs: 700,
      preferredPhraseSize: 'medium',
      preferredPauseAfterPhraseMs: 700,
      typicalBackspaceRate: 0.05,
      typicalCorrectionRate: 0.05,
      strugglesWithLongPhrases: false,
      strugglesWithNumbers: false,
      strugglesWithNames: false,
      strugglesWithPunctuation: false,
      improvementTrend: 'stable',
      sessionsCount: 0,
      profileConfidence: 0.2,
    };
  }

  return historyService.computeProfile(records, language, inputMode);
}

function mapSessionInputMode(mode: SessionInputMode): InputMode {
  if (mode === 'input1') return 'audio';
  if (mode === 'input2') return 'browser-tts';
  if (mode === 'input4') return 'qwen-cloud';
  return 'kokoro';
}

function resolveStoredSessionLanguage(session: StoredSession): LanguageCode {
  if (session.inputMode === 'input1') return session.transcriptionLanguage ?? 'unknown';
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

function getTtsVoiceLang(language: TtsLanguage): string {
  if (language === 'en') return 'en-US';
  if (language === 'es') return 'es-ES';
  return 'de-DE';
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

function normalizeAudioUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes('archive.org') && url.pathname.startsWith('/details/')) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 3) {
        const identifier = parts[1];
        const filename = parts.slice(2).join('/');
        url.pathname = `/download/${identifier}/${filename}`;
        url.search = '';
      }
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

async function buildFilePayload(file: File, language: TtsLanguage): Promise<{ fileName: string; audioBase64: string; language: TtsLanguage }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const audioBase64 = btoa(binary);
  return {
    fileName: file.name,
    audioBase64,
    language,
  };
}
