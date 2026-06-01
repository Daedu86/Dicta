import type {
  AdaptivePacingInput,
  HistoricalPerformanceProfile,
  InputCapabilities,
  LiveTelemetryFrame,
  PhraseBoundaryType,
} from '../../core/adaptive/types';

export const kokoroInputCapabilities: InputCapabilities = {
  supportsClausePause: true,
  supportsSentencePause: true,
  supportsMidPhraseReplay: true,
  supportsDynamicRateChange: true,
  requiresPreChunking: true,
};

export interface KokoroTelemetryParams {
  inputMode: 'kokoro';
  phraseId: string;
  spokenProgressRatio: number;
  typedProgressRatio: number;
  lagSec: number;
  lagWords: number;
  lagChars: number;
  accuracy: number;
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

export function buildKokoroTelemetryFrame(params: KokoroTelemetryParams): LiveTelemetryFrame {
  return {
    inputMode: params.inputMode,
    phraseId: params.phraseId,
    spokenProgressRatio: clamp(params.spokenProgressRatio, 0, 1),
    typedProgressRatio: clamp(params.typedProgressRatio, 0, 1),
    lagSec: params.lagSec,
    lagWords: params.lagWords,
    lagChars: params.lagChars,
    accuracy: clamp(params.accuracy, 0, 1),
    errorRate: clamp(params.errorRate, 0, 1),
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

export function buildAdaptiveKokoroInput(live: LiveTelemetryFrame, history: HistoricalPerformanceProfile): AdaptivePacingInput {
  return { live, history, capabilities: kokoroInputCapabilities };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
