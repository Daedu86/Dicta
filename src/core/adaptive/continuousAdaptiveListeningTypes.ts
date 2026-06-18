import type { InputMode } from './inputModes';
import type { LanguageCode, ListeningPrecisionMetrics, PhraseBoundaryType, PhraseSize } from './types';

export type LagReliability = 'raw' | 'stable' | 'fallback' | 'invalid';

export type AdaptiveDirection = 'easing' | 'holding' | 'challenging';

export type DerivedAdaptiveLabel =
  | 'legacy-recovery'
  | 'legacy-support'
  | 'legacy-guided'
  | 'legacy-balanced'
  | 'legacy-flow';

export type AdaptivePhraseSizeTarget = 'micro' | PhraseSize;

export type RuntimeSampleQuality = {
  acceptedForBenchmark: boolean;
  acceptedForSessionInsight: boolean;
  acceptedForTelemetryLearning: boolean;
  acceptedForRuntimePressure: boolean;
  rejectionReason?: string;
  confidenceWeight: number;
  lagReliability: LagReliability;
};

export type LanguageAdaptiveCalibration = {
  language: LanguageCode;
  playbackRateFloor: number;
  playbackRateCeiling: number;
  pauseMsFloor: number;
  pauseMsCeiling: number;
  comfortableWpmRange: [number, number];
  lagToleranceRange: [number, number];
  perceptualPauseBias: number;
  phraseLengthBias: number;
  boundaryStrictnessBias: number;
  semanticLoadBias: number;
  minPerceptualPauseMs: number;
  benchmarkMinSemanticCompleteness: number;
  sessionInsightMinSemanticCompleteness: number;
  reliableRawLagRange: [number, number];
};

export type NormalizedRuntimeTelemetry = {
  inputMode: InputMode;
  language: LanguageCode;
  event?: string;
  phraseId?: string;
  phraseIndex?: number;
  totalSemanticPhrases?: number;
  accuracy: number;
  chunkAccuracy: number;
  rollingAccuracyLast3: number;
  rollingAccuracyLast5: number;
  wpm: number;
  lagSec: number;
  rawLagSec?: number;
  stableLagSec?: number;
  lagFallbackUsed: boolean;
  lagOutlierCount: number;
  lagReliability: LagReliability;
  correctionRate: number;
  backspaceRate: number;
  listeningPrecision?: ListeningPrecisionMetrics;
  phraseBoundaryType?: PhraseBoundaryType;
  canPauseAfter: boolean;
  semanticCompleteness: number;
  phraseDifficulty: number;
  phraseLengthWords: number;
  phraseLengthChars: number;
  syntaxComplexity: number;
  requestedPlaybackRate?: number;
  actualPlaybackRate?: number;
  requestedPauseMs?: number;
  actualPauseMs?: number;
  currentPlaybackRate: number;
  currentPauseAfterPhraseMs: number;
  pauseDeferred: boolean;
  deferReason?: string;
  pauseShortfallMs: number;
  perceptualGapMs: number;
  progressGap: number;
  timingConfidence: number;
  semanticConfidence: number;
  boundaryConfidence: number;
  executionConfidence: number;
};

export type AdaptivePressureVector = {
  accuracy: number;
  lag: number;
  correction: number;
  boundary: number;
  semanticLoad: number;
  reconstruction: number;
  typing: number;
  environment: number;
  history: number;
  currentSession: number;
  perceptualPause: number;
  traceQuality: number;
};

export type AdaptiveListeningState = {
  adaptiveLevel: number;
  confidence: number;
  direction: AdaptiveDirection;
  pressure: AdaptivePressureVector;
  reasonCodes: string[];
};

export type AdaptivePacingOutput = {
  playbackRateTarget: number;
  pauseMsTarget: number;
  phraseSizeTarget: AdaptivePhraseSizeTarget;
  boundaryStrictness: number;
  replaySupport: number;
  perceptualPauseLevel: number;
  perceptualRateLevel: number;
  targetWpmRange?: [number, number];
};

export type ContinuousAdaptiveListeningSnapshot = {
  telemetry: NormalizedRuntimeTelemetry;
  sampleQuality: RuntimeSampleQuality;
  pressure: AdaptivePressureVector;
  state: AdaptiveListeningState;
  output: AdaptivePacingOutput;
  languageCalibration: LanguageAdaptiveCalibration;
  derivedAdaptiveLabel: DerivedAdaptiveLabel;
};
