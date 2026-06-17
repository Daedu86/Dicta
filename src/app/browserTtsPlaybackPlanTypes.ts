import type {
  AdaptivePacingInput,
  HistoricalPerformanceProfile,
  InputLanguageBenchmarkMetrics,
  LiveTelemetryFrame,
  PacingDecision,
  PhraseSize,
} from '../core/adaptive/types';
import type { AttemptEvaluation } from '../core/evaluation';
import type { BrowserTtsAdaptiveProfile } from '../inputs/browserTts/browserTtsAdaptiveProfiles';
import type { BrowserTtsDeRecoveryState } from '../inputs/browserTts/browserTtsRecoveryPolicy';
import type {
  PlanBrowserTtsChunkInput,
  PlannedBrowserTtsChunk,
  SupportedLanguage,
} from '../inputs/browserTts/ttsDynamicChunkPlanner';
import type { TtsPacingMode } from '../types/dictation';
import type { BrowserTtsSurgicalReplayPlan } from './browserTtsSurgicalReplayPlan';
import type { TtsLiveSignal } from './ttsPlaybackProfile';

export type BrowserTtsBoundaryStrictness = 'sentence' | 'clause' | 'phrase';

export type BrowserTtsChunkPlanner = (input: PlanBrowserTtsChunkInput) => PlannedBrowserTtsChunk | null;

export type BrowserTtsPlaybackPlanInput = {
  macroWords: string[];
  macroWordOffset: number;
  macroStartWordIndex: number;
  language: SupportedLanguage;
  lastPhraseSize: PhraseSize;
  lastBoundaryStrictness: BrowserTtsBoundaryStrictness;
  liveSignal: TtsLiveSignal;
  livePracticeEvaluation: AttemptEvaluation;
  browserTtsProfile: BrowserTtsAdaptiveProfile;
  browserTtsBenchmark: InputLanguageBenchmarkMetrics | null | undefined;
  browserTtsRecovery: BrowserTtsDeRecoveryState;
  ttsSpeechRate: number;
  ttsPlaybackPauseMs: number;
  adaptiveController: {
    decide(input: AdaptivePacingInput): PacingDecision;
  };
  historyProfile: HistoricalPerformanceProfile;
  sourceWordCount: number;
  estimatedSpokenWordIndex: number;
  chunkIndex: number;
  unsafeChunkCount: number;
  accuracyWindow: number[];
  lastAccuracySnapshot: {
    typedWords: number;
    matchedWords: number;
  };
  navigatorInfo: {
    userAgent?: string;
    platform?: string;
    maxTouchPoints?: number;
  };
  chunkPlanner?: BrowserTtsChunkPlanner;
};

export type BrowserTtsPlaybackPlan = {
  candidateChunk: PlannedBrowserTtsChunk;
  chunk: PlannedBrowserTtsChunk;
  surgicalReplayPlan: BrowserTtsSurgicalReplayPlan;
  rawDecision: PacingDecision;
  decision: PacingDecision;
  runtimeDecision: PacingDecision;
  pacingMode: TtsPacingMode;
  pauseAtBoundary: boolean;
  semanticCompleteness: number;
  rate: number;
  effectivePauseNow: boolean;
  effectiveReplay: false;
  browserTelemetry: LiveTelemetryFrame;
  chunkTelemetry: LiveTelemetryFrame;
  rollingAccuracyLast3: number;
  rollingAccuracyLast5: number;
  nextAccuracyWindow: number[];
  typedWordsNow: number;
  matchedWordsNow: number;
  nextLastPhraseSize: PhraseSize;
  nextLastBoundaryStrictness: BrowserTtsBoundaryStrictness;
  unsafeBoundaryApplied: boolean;
  unsafeChunkCount: number;
  mobileFallbackApplied: boolean;
  germanShortBias: boolean;
  recoverySafeBoundary: boolean;
};
