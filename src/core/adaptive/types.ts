export type InputMode = 'audio' | 'browser-tts' | 'kokoro' | 'qwen-cloud';
export type PhraseSize = 'short' | 'medium' | 'long';
export type PacingMode = 'support' | 'balanced' | 'flow';
export type ImprovementTrend = 'improving' | 'stable' | 'declining';
export type PhraseBoundaryType = 'sentence' | 'clause' | 'minor' | 'unsafe';
export type LanguageCode = 'en' | 'es' | 'de' | 'unknown' | string;

export interface InputCapabilities {
  supportsClausePause: boolean;
  supportsSentencePause: boolean;
  supportsPhraseReplay?: boolean;
  supportsMidPhraseReplay: boolean;
  supportsDynamicRateChange: boolean;
  requiresPreChunking: boolean;
  supportsCachedChunks?: boolean;
}

export interface LiveTelemetryFrame {
  inputMode: InputMode;
  phraseId: string;

  spokenProgressRatio: number;
  typedProgressRatio: number;

  lagSec: number;
  lagWords: number;
  lagChars: number;
  rawLagSec?: number;
  stableLagSec?: number;
  lagOutlierCount?: number;
  unsafeChunkCount?: number;

  accuracy: number;
  chunkAccuracy?: number;
  rollingAccuracyLast3?: number;
  rollingAccuracyLast5?: number;
  sessionAccuracy?: number;
  errorRate: number;

  wpm: number;
  charsPerMinute: number;

  pauseMs: number;
  longestPauseMs: number;

  backspaceRate: number;
  correctionRate: number;

  phraseDifficulty: number;
  phraseLengthWords: number;
  phraseLengthChars: number;

  language?: 'en' | 'de' | 'es' | string;
  phraseBoundaryType?: PhraseBoundaryType;
  canPauseAfter?: boolean;
  canReplayIndependently?: boolean;
  semanticCompleteness?: number;
  punctuationLoad?: number;
  rareWordLoad?: number;
  syntaxComplexity?: number;

  currentPlaybackRate: number;
  currentPauseAfterPhraseMs: number;

  trend: ImprovementTrend;
}

export interface HistoricalPerformanceProfile {
  language?: string;
  inputMode?: InputMode;

  comfortablePlaybackRate: number;
  averageWpm: number;
  averageAccuracy: number;
  averageLagSec: number;
  averagePauseMs: number;

  preferredPhraseSize: PhraseSize;
  preferredPauseAfterPhraseMs: number;

  typicalBackspaceRate: number;
  typicalCorrectionRate: number;

  strugglesWithLongPhrases: boolean;
  strugglesWithNumbers: boolean;
  strugglesWithNames: boolean;
  strugglesWithPunctuation: boolean;

  improvementTrend: ImprovementTrend;

  sessionsCount: number;
  profileConfidence: number;
}

export interface AdaptivePacingInput {
  live: LiveTelemetryFrame;
  history: HistoricalPerformanceProfile;
  capabilities?: InputCapabilities;
}

export interface PacingDecision {
  mode: PacingMode;

  playbackRate: number;
  pauseAfterPhraseMs: number;

  shouldPauseNow: boolean;
  shouldReplayPhrase: boolean;
  boundaryStrictness: 'sentence' | 'clause' | 'phrase';
  allowMidPhrasePause: boolean;
  deferPauseUntilSafeBoundary: boolean;
  executionHint?: string;
  replayRate: number;

  nextPhraseSize: PhraseSize;

  reason: string;

  lagScore: number;
  accuracyScore: number;
  hesitationScore: number;
  confidenceScore: number;
}

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
  inputMode: InputMode;
  language: LanguageCode;
  mode: PacingMode;
  playbackRate: number;
  accuracy: number;
  lagSec: number;
  rawLagSec?: number;
  stableLagSec?: number;
  lagOutlierCount?: number;
  unsafeChunkCount?: number;
  wpm: number;
  pauseMs: number;
  correctionRate?: number;
  phraseBoundaryType?: PhraseBoundaryType;
  semanticCompleteness?: number;
  sessionId?: string;
  phraseId?: string;
  phraseIndex?: number;
  totalSemanticPhrases?: number;
  decisionReason?: string;
  executionHint?: string;
  event?:
    | 'pause'
    | 'replay'
    | 'defer_pause'
    | 'mode_change'
    | 'rate_change'
    | 'phrase_advance'
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
  | 'flow_instability';

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
  weakAreas: AdaptiveWeakArea[];
  recommendation: InputLanguageBenchmarkRecommendation;
}

export type PhrasePlaybackEventType =
  | 'phrase_started'
  | 'phrase_completed'
  | 'phrase_replayed'
  | 'phrase_skipped'
  | 'phrase_advanced';

export interface PhrasePlaybackEvent {
  sessionId: string;
  phraseId: string;
  phraseIndex: number;
  textPreview: string;
  event: PhrasePlaybackEventType;
  timestampMs: number;
  inputMode: InputMode;
  language: LanguageCode;
}

export interface AdaptiveSessionFeedback {
  sessionId: string;
  inputMode: InputMode;
  language: LanguageCode;
  scriptId?: string;
  scriptTitle?: string;
  createdAt: string;
  completedAt?: string;
  sourceType: 'plain_text' | 'dictation_script';
  benchmarkBefore?: Partial<InputLanguageBenchmarkMetrics>;
  benchmarkAfter?: Partial<InputLanguageBenchmarkMetrics>;
  sessionCountDroppedReason?: string;
  improvementDelta: {
    accuracyDelta: number;
    lagDelta: number;
    wpmDelta: number;
    sweetSpotScoreDelta: number;
    semanticFidelityDelta: number;
    controlFidelityDelta: number;
    learningEffectivenessDelta: number;
    flowStabilityDelta: number;
    overallImprovementScore: number;
  };
  playbackIssues: {
    repeatedPhraseCount: number;
    maxRepeatCountForSinglePhrase: number;
    repeatedPhrases: Array<{
      phraseId: string;
      textPreview: string;
      repeatCount: number;
      timestampsMs: number[];
    }>;
    skippedPhraseCount: number;
    skippedPhrases: Array<{
      phraseId: string;
      textPreview: string;
      expectedIndex: number;
    }>;
    outOfOrderAdvanceCount: number;
    replayAdvancedPhraseCount: number;
    phraseIndexJumpCount: number;
  };
  phraseStats: {
    totalPhrases: number;
    completedPhrases: number;
    replayCount: number;
    phraseAdvanceCount: number;
    averageRepeatsPerPhrase: number;
  };
  verdict: 'improved' | 'stable' | 'regressed' | 'inconclusive';
  notes: string[];
}
