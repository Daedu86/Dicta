import type { InputMode } from '../inputModes';
import type { ListenerStateV3 } from '../listenerStateV3';
import type { ListeningPrecisionMetrics } from '../listeningPrecisionMetrics';

export type PhraseSize = 'short' | 'medium' | 'long';
export type PacingMode = 'recovery' | 'support' | 'balanced' | 'flow';
export type PacingReasonCode =
  | 'mode-recovery'
  | 'mode-support'
  | 'mode-balanced'
  | 'mode-flow'
  | 'session-warmup-calibration'
  | 'phrase-overload'
  | 'long-phrase-sensitive'
  | 'replay-due-to-lag-or-error'
  | 'replay-disabled-recovery'
  | 'replay-blocked-boundary'
  | 'replay-blocked-incomplete-phrase'
  | 'defer-pause-until-safe-boundary'
  | 'high-accuracy-low-lag'
  | 'support-needed'
  | 'recovery-needed'
  | 'extended-catch-up-window'
  | 'flow-blocked-after-recovery'
  | 'stable-recovery-confirmed'
  | 'low-history-confidence'
  | 'adaptive-playback-comfort-profile'
  | 'adaptive-pause-very-low-accuracy'
  | 'adaptive-pause-low-accuracy'
  | 'adaptive-pause-severe-lag'
  | 'adaptive-pause-lag'
  | 'adaptive-pause-progress-gap'
  | 'adaptive-pause-history-pressure'
  | 'adaptive-pause-session-pressure'
  | 'listening-precision-rate-ceiling';
export type ImprovementTrend = 'improving' | 'stable' | 'declining';
export type PhraseBoundaryType = 'sentence' | 'clause' | 'minor' | 'unsafe';
export type LanguageCode = 'en' | 'es' | 'de' | 'fr' | 'pt' | 'unknown' | string;

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
  sessionChunkIndex?: number;

  spokenProgressRatio: number;
  typedProgressRatio: number;

  lagSec: number;
  lagWords: number;
  lagChars: number;
  rawLagSec?: number;
  stableLagSec?: number;
  lagFallbackUsed?: boolean;
  lagOutlierCount?: number;
  unsafeChunkCount?: number;

  accuracy: number;
  chunkAccuracy?: number;
  rollingAccuracyLast3?: number;
  rollingAccuracyLast5?: number;
  sessionAccuracy?: number;
  errorRate: number;
  listeningPrecision?: ListeningPrecisionMetrics;
  listenerStateV3?: ListenerStateV3;

  wpm: number;
  charsPerMinute: number;

  pauseMs: number;
  longestPauseMs: number;

  backspaceRate: number;
  correctionRate: number;

  phraseDifficulty: number;
  phraseLengthWords: number;
  phraseLengthChars: number;

  language?: 'en' | 'de' | 'es' | 'fr' | 'pt' | string;
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

export interface AdaptivePlaybackComfortProfile {
  source: 'bootstrap' | 'history' | 'benchmark';
  confidence: number;
  rateRange: [number, number];
  pauseRangeMs: [number, number];
  preferredRate: number;
  preferredPauseMs: number;
  preferredPhraseSize: PhraseSize;
  statePauseMs: Record<PacingMode, number>;
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

  adaptivePlaybackComfortProfile?: AdaptivePlaybackComfortProfile;

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
  reasonCodes: PacingReasonCode[];

  lagScore: number;
  accuracyScore: number;
  hesitationScore: number;
  confidenceScore: number;
}
