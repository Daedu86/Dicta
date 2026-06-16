import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { BrowserTtsEnvironmentFingerprint, SessionTelemetry } from '../types/dictation';
import type { AdaptiveDictationController } from '../core/adaptive/AdaptiveDictationController';
import type {
  AdaptiveTimelinePoint,
  HistoricalPerformanceProfile,
  InputLanguageBenchmarkMetrics,
  InputMode,
  LanguageCode,
  LiveTelemetryFrame,
  PacingDecision,
  PhraseBoundaryType,
  PhrasePlaybackEvent,
} from '../core/adaptive/types';
import type { HistoricalPerformanceService } from '../core/history/HistoricalPerformanceService';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
  BenchmarkLanguageButton,
} from '../components/openrouter/types';
import type { SemanticPhrase } from '../core/adaptive/SemanticPhrasePlanner';

export type AdaptiveRuntimeSessionInputMode = string;
export type AdaptiveRuntimeSessionStatus = 'ready' | 'running' | 'paused' | 'finished' | 'error' | string;
export type AdaptiveRuntimeSessionSource = 'plainText' | 'dictationScript' | string;

export type AdaptiveRuntimeSessionInput = {
  id: string;
  createdAt: string;
  updatedAt: string;
  inputMode: AdaptiveRuntimeSessionInputMode;
  status: AdaptiveRuntimeSessionStatus;
  ttsText?: string;
  ttsLanguage?: LanguageCode | null;
  metrics: {
    rate: number;
    wpm: number;
    accuracy: number;
    lagSec: number;
    trend: 'improving' | 'stable' | 'declining';
    score: number;
    points: number;
  };
  telemetry: Partial<SessionTelemetry> & { finishedAt?: string };
  sessionSource: AdaptiveRuntimeSessionSource;
  dictationScript?: { title: string; phrases?: unknown[] } | null;
  ttsEnvironment?: BrowserTtsEnvironmentFingerprint | null;
  voiceDurationSec?: number | null;
};

export type AdaptiveRuntimeRecordBenchmarkOptions = {
  actualPlaybackRate?: number;
  actualPauseMs?: number;
  replayExecuted?: boolean;
  actualBoundaryType?: PhraseBoundaryType;
  ttsEnvironment?: BrowserTtsEnvironmentFingerprint | null;
  event?: AdaptiveTimelinePoint['event'];
  phraseIndex?: number;
  totalSemanticPhrases?: number;
  throttleMs?: number;
};

export type AdaptiveRuntimeOptions = {
  activeSession: AdaptiveRuntimeSessionInput | null;
  activeSessionId: string;
  sessions: AdaptiveRuntimeSessionInput[];
  setAdaptiveBenchmarks: Dispatch<SetStateAction<AdaptiveBenchmarksByInputLanguage>>;
  adaptiveBenchmarksRef: MutableRefObject<AdaptiveBenchmarksByInputLanguage>;
  adaptiveSessionFeedback: AdaptiveSessionFeedbackByInputLanguage;
  setAdaptiveSessionFeedback: Dispatch<SetStateAction<AdaptiveSessionFeedbackByInputLanguage>>;
  adaptiveSessionFeedbackRef: MutableRefObject<AdaptiveSessionFeedbackByInputLanguage>;
  persistAdaptiveSessionFeedbackNow: (feedback: AdaptiveSessionFeedbackByInputLanguage) => void;
  selectedBenchmarkLanguage: BenchmarkLanguageButton;
  setSelectedBenchmarkLanguage: (language: BenchmarkLanguageButton) => void;
};

export type AdaptiveRuntime = {
  adaptiveControllerRef: MutableRefObject<AdaptiveDictationController>;
  getAdaptiveController: (inputMode: InputMode, language: LanguageCode) => AdaptiveDictationController;
  historyServiceRef: MutableRefObject<HistoricalPerformanceService>;
  phrasePlaybackEventsRef: MutableRefObject<PhrasePlaybackEvent[]>;
  phrasePlaybackTotalPhrasesRef: MutableRefObject<number>;
  selectedBenchmarkInputMode: InputMode;
  setSelectedBenchmarkInputMode: Dispatch<SetStateAction<InputMode>>;
  selectedBenchmarkLanguage: BenchmarkLanguageButton;
  setSelectedBenchmarkLanguage: (language: BenchmarkLanguageButton) => void;
  getHistoricalPerformanceProfile: (inputMode: InputMode, language?: string) => HistoricalPerformanceProfile;
  getBenchmarkSnapshot: (inputMode: InputMode, language: LanguageCode) => InputLanguageBenchmarkMetrics;
  recordAdaptiveBenchmark: (
    live: LiveTelemetryFrame,
    decision: PacingDecision,
    options?: AdaptiveRuntimeRecordBenchmarkOptions,
  ) => void;
  beginAdaptiveSessionFeedback: (inputMode: InputMode, language: LanguageCode, totalPhrases?: number) => void;
  recordPhrasePlaybackEvent: (
    event: PhrasePlaybackEvent['event'],
    inputMode: InputMode,
    language: LanguageCode,
    phrase: SemanticPhrase | null | undefined,
    phraseIndex: number,
  ) => void;
  completeAdaptiveSessionFeedback: (
    completedSession?: AdaptiveRuntimeSessionInput | null,
    options?: { phraseEvents?: PhrasePlaybackEvent[]; totalPhrases?: number },
  ) => void;
  ensureLatestBrowserTtsDeDictationScriptFeedback: (sourceSessions: AdaptiveRuntimeSessionInput[]) => void;
  resetAdaptiveSessionFeedbackTracking: (sessionId?: string | null) => void;
};
