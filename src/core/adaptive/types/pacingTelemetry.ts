import type { InputMode } from '../inputModes';
import type { ListeningPrecisionMetrics } from '../listeningPrecisionMetrics';
import type { ImprovementTrend, PhraseBoundaryType } from './pacingPrimitives';

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
  lagOutlierCount?: number;
  unsafeChunkCount?: number;

  accuracy: number;
  chunkAccuracy?: number;
  rollingAccuracyLast3?: number;
  rollingAccuracyLast5?: number;
  sessionAccuracy?: number;
  errorRate: number;
  listeningPrecision?: ListeningPrecisionMetrics;

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
