import type {
  AdaptivePacingInput,
  HistoricalPerformanceProfile,
  InputCapabilities,
  LiveTelemetryFrame,
} from '../../core/adaptive/types';

export const audioInputCapabilities: InputCapabilities = {
  supportsClausePause: false,
  supportsSentencePause: true,
  supportsMidPhraseReplay: false,
  supportsDynamicRateChange: true,
  requiresPreChunking: false,
};

export interface AudioTelemetryParams {
  inputMode: 'audio';
  phraseId: string;
  audioTime: number;
  phraseDurationSec: number;
  typedProgressRatio: number;
  typedWordIndex: number;
  expectedWordIndex: number;
  lagWords: number;
  lagChars: number;
  phraseDifficulty: number;
  phraseLengthWords: number;
  phraseLengthChars: number;
  currentPlaybackRate: number;
  currentPauseAfterPhraseMs: number;
  language?: 'en' | 'de' | 'es' | string;
  trend: 'improving' | 'stable' | 'declining';
  accuracy: number;
  errorRate: number;
  wpm: number;
  pauseMs: number;
  longestPauseMs: number;
  backspaceRate: number;
  correctionRate: number;
}

export function buildAudioTelemetryFrame(params: AudioTelemetryParams): LiveTelemetryFrame {
  const spokenProgressRatio = params.phraseDurationSec > 0 ? clamp(params.audioTime / params.phraseDurationSec, 0, 1) : 0;

  return {
    inputMode: params.inputMode,
    phraseId: params.phraseId,
    spokenProgressRatio,
    typedProgressRatio: clamp(params.typedProgressRatio, 0, 1),
    lagSec: clamp(params.audioTime - params.typedProgressRatio * params.phraseDurationSec, -10, 10),
    lagWords: params.lagWords,
    lagChars: params.lagChars,
    accuracy: clamp(params.accuracy, 0, 1),
    errorRate: clamp(params.errorRate, 0, 1),
    wpm: params.wpm,
    charsPerMinute: Number((params.phraseLengthChars / Math.max(1 / 60, params.phraseDurationSec / 60)).toFixed(0)),
    pauseMs: params.pauseMs,
    longestPauseMs: params.longestPauseMs,
    backspaceRate: clamp(params.backspaceRate, 0, 1),
    correctionRate: clamp(params.correctionRate, 0, 1),
    phraseDifficulty: params.phraseDifficulty,
    phraseLengthWords: params.phraseLengthWords,
    phraseLengthChars: params.phraseLengthChars,
    language: params.language,
    currentPlaybackRate: params.currentPlaybackRate,
    currentPauseAfterPhraseMs: params.currentPauseAfterPhraseMs,
    trend: params.trend,
  };
}

export function buildAdaptiveAudioInput(live: LiveTelemetryFrame, history: HistoricalPerformanceProfile): AdaptivePacingInput {
  return { live, history, capabilities: audioInputCapabilities };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
