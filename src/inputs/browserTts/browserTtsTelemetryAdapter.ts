import type {
  AdaptivePacingInput,
  HistoricalPerformanceProfile,
  InputCapabilities,
  ListeningPrecisionMetrics,
  LiveTelemetryFrame,
  PhraseBoundaryType,
} from '../../core/adaptive/types';

export const browserTtsInputCapabilities: InputCapabilities = {
  supportsClausePause: false,
  supportsSentencePause: true,
  supportsPhraseReplay: false,
  supportsMidPhraseReplay: false,
  supportsDynamicRateChange: true,
  requiresPreChunking: true,
};

export interface BrowserTtsTelemetryParams {
  inputMode: 'browser-tts';
  phraseId: string;
  sessionChunkIndex?: number;
  estimatedSpokenRatio: number;
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
  currentPlaybackRate: number;
  currentPauseAfterPhraseMs: number;
  language?: 'en' | 'de' | 'es' | 'fr' | 'pt' | string;
  phraseBoundaryType?: PhraseBoundaryType;
  canPauseAfter?: boolean;
  canReplayIndependently?: boolean;
  semanticCompleteness?: number;
  punctuationLoad?: number;
  rareWordLoad?: number;
  syntaxComplexity?: number;
  trend: 'improving' | 'stable' | 'declining';
}

export function buildBrowserTtsTelemetryFrame(params: BrowserTtsTelemetryParams): LiveTelemetryFrame {
  return {
    inputMode: params.inputMode,
    phraseId: params.phraseId,
    sessionChunkIndex: params.sessionChunkIndex ?? deriveSessionChunkIndex(params.phraseId),
    spokenProgressRatio: clamp(params.estimatedSpokenRatio, 0, 1),
    typedProgressRatio: clamp(params.typedProgressRatio, 0, 1),
    lagSec: params.lagSec,
    lagWords: params.lagWords,
    lagChars: params.lagChars,
    rawLagSec: params.rawLagSec,
    stableLagSec: params.stableLagSec,
    lagOutlierCount: params.lagOutlierCount,
    unsafeChunkCount: params.unsafeChunkCount,
    accuracy: clamp(params.accuracy, 0, 1),
    chunkAccuracy: params.chunkAccuracy,
    rollingAccuracyLast3: params.rollingAccuracyLast3,
    rollingAccuracyLast5: params.rollingAccuracyLast5,
    sessionAccuracy: params.sessionAccuracy,
    errorRate: clamp(params.errorRate, 0, 1),
    listeningPrecision: params.listeningPrecision,
    wpm: params.wpm,
    charsPerMinute: params.charsPerMinute,
    pauseMs: params.pauseMs,
    longestPauseMs: params.longestPauseMs,
    backspaceRate: clamp(params.backspaceRate, 0, 1),
    correctionRate: clamp(params.correctionRate, 0, 1),
    phraseDifficulty: params.phraseDifficulty,
    phraseLengthWords: params.phraseLengthWords,
    phraseLengthChars: params.phraseLengthChars,
    language: params.language,
    phraseBoundaryType: params.phraseBoundaryType,
    canPauseAfter: params.canPauseAfter,
    canReplayIndependently: params.canReplayIndependently,
    semanticCompleteness: params.semanticCompleteness,
    punctuationLoad: params.punctuationLoad,
    rareWordLoad: params.rareWordLoad,
    syntaxComplexity: params.syntaxComplexity,
    currentPlaybackRate: params.currentPlaybackRate,
    currentPauseAfterPhraseMs: params.currentPauseAfterPhraseMs,
    trend: params.trend,
  };
}

export function buildAdaptiveBrowserTtsInput(live: LiveTelemetryFrame, history: HistoricalPerformanceProfile): AdaptivePacingInput {
  return { live, history, capabilities: browserTtsInputCapabilities };
}

function deriveSessionChunkIndex(phraseId: string): number | undefined {
  const match = /^tts-(\d+)(?:-chunk)?$/.exec(phraseId);
  if (!match) return undefined;
  const index = Number(match[1]);
  return Number.isInteger(index) && index >= 0 ? index : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
