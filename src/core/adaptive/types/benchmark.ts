import type { InputMode, StoredInputMode } from '../inputModes';
import type { ListeningPrecisionMetrics } from '../listeningPrecisionMetrics';
import type { BrowserTtsEnvironmentFingerprint, BrowserTtsEnvironmentHistoryEntry } from '../../../types/dictation';
import type { ImprovementTrend, LanguageCode, PacingMode, PhraseBoundaryType, PhraseSize } from './pacing';

export interface RateAccuracyBucket {
  rate: number;
  seconds: number;
  averageAccuracy: number;
  averageLagSec: number;
  averageWpm: number;
  sampleCount: number;
}

export interface AdaptiveTimelinePoint {
  timestampMs: number;
  inputMode: StoredInputMode;
  language: LanguageCode;
  mode: PacingMode;
  playbackRate: number;
  accuracy: number;
  lagSec: number;
  rawLagSec?: number;
  stableLagSec?: number;
  lagFallbackUsed?: boolean;
  lagOutlierCount?: number;
  unsafeChunkCount?: number;
  acceptedForBenchmark?: boolean;
  acceptedForSessionInsight?: boolean;
  wpm: number;
  pauseMs: number;
  correctionRate?: number;
  phraseBoundaryType?: PhraseBoundaryType;
  semanticCompleteness?: number;
  listeningPrecision?: ListeningPrecisionMetrics;
  sessionId?: string;
  ttsEnvironmentId?: string;
  phraseId?: string;
  phraseIndex?: number;
  totalSemanticPhrases?: number;
  decisionTraceId?: string;
  benchmarkRejectionReason?: string;
  requestedPlaybackRate?: number;
  actualPlaybackRate?: number;
  requestedPauseMs?: number;
  actualPauseMs?: number;
  replayExecuted?: boolean;
  unsafeBoundaryApplied?: boolean;
  mobileFallbackApplied?: boolean;
  recoverySafeBoundary?: boolean;
  germanShortBias?: boolean;
  trend?: ImprovementTrend;
  decisionReason?: string;
  executionHint?: string;
  event?:
    | 'pause'
    | 'replay'
    | 'defer_pause'
    | 'mode_change'
    | 'rate_change'
    | 'phrase_advance'
    | 'phrase_completed'
    | 'support_entered'
    | 'flow_entered';
}

export interface InputExecutionTelemetry {
  requestedPlaybackRate?: number;
  actualPlaybackRate?: number;
  requestedPauseMs?: number;
  actualPauseMs?: number;
  requestedReplay?: boolean;
  replayExecuted?: boolean;
  requestedBoundaryType?: PhraseBoundaryType;
  actualBoundaryType?: PhraseBoundaryType;
  decisionAppliedAtMs?: number;
  executionStartedAtMs?: number;
  fallbackUsed?: boolean;
  cacheHit?: boolean;
}

export type AdaptiveWeakArea =
  | 'long_phrases'
  | 'numbers'
  | 'names'
  | 'punctuation'
  | 'high_rate'
  | 'low_semantic_completeness'
  | 'unsafe_boundaries'
  | 'replay'
  | 'lag'
  | 'lag_instability'
  | 'corrections'
  | 'low_accuracy'
  | 'accuracy_instability'
  | 'support_dependency'
  | 'unsafe_boundary_pressure'
  | 'flow_instability'
  | 'omissions'
  | 'detail_loss'
  | 'function_words'
  | 'prepositions'
  | 'word_order'
  | 'long_clause_overload'
  | 'content_word_loss';

export interface InputLanguageBenchmarkRecommendation {
  targetRateRange: [number, number];
  targetPhraseSize: PhraseSize;
  targetPauseMs: number;
  nextTrainingFocus: string[];
  confidence: number;
  summary: string;
}

export interface InputLanguageBenchmarkMetrics {
  inputMode: InputMode;
  language: LanguageCode;
  rollingWindowDays: 30;
  sessionCount: number;
  sampleCount: number;
  lastUpdatedAt: string | null;
  semanticFidelityScore: number;
  controlFidelityScore: number;
  learningEffectivenessScore: number;
  flowStabilityScore: number;
  sweetSpotScore: number;
  averageAccuracy: number;
  averageWpm: number;
  averageLagSec: number;
  rawAverageLagSec: number;
  stableAverageLagSec: number;
  medianLagSec: number;
  p75LagSec: number;
  p90AbsLagSec: number;
  lagOutlierCount: number;
  averageCorrectionRate: number;
  semanticCutPenalty: number;
  unsafePauseCount: number;
  safePauseCount: number;
  deferredPauseCount: number;
  replayDeniedByBoundaryCount: number;
  averageSemanticCompleteness: number;
  averagePhraseDifficulty: number;
  listeningPrecisionAverages?: ListeningPrecisionMetrics;
  preferredPlaybackRate: number;
  preferredPhraseSize: PhraseSize;
  preferredPauseAfterPhraseMs: number;
  recoveryScore: number;
  timeToRecoveryMs: number | null;
  errorBurstLength: number;
  modeSwitchFrequency: number;
  rateVariance: number;
  pauseVariance: number;
  inputExecutionFidelityScore: number;
  rateAccuracyBuckets: RateAccuracyBucket[];
  timeline: AdaptiveTimelinePoint[];
  ttsEnvironment?: BrowserTtsEnvironmentFingerprint;
  ttsEnvironmentHistory?: BrowserTtsEnvironmentHistoryEntry[];
  environmentChanged?: boolean;
  weakAreas: AdaptiveWeakArea[];
  recommendation: InputLanguageBenchmarkRecommendation;
}
