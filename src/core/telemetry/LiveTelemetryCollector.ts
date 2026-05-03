import type {
  InputMode,
  ImprovementTrend,
  LiveTelemetryFrame,
} from '../adaptive/types';

interface CollectorOptions {
  language?: 'en' | 'de' | 'es' | string;
}

export class LiveTelemetryCollector {
  private totalTyped = 0;
  private correctTyped = 0;
  private backspaceCount = 0;
  private correctionCount = 0;
  private pauseMs = 0;
  private longestPauseMs = 0;
  private options: CollectorOptions;

  constructor(options: CollectorOptions = {}) {
    this.options = options;
  }

  reset(): void {
    this.totalTyped = 0;
    this.correctTyped = 0;
    this.backspaceCount = 0;
    this.correctionCount = 0;
    this.pauseMs = 0;
    this.longestPauseMs = 0;
  }

  recordTypedCharacter(correct: boolean): void {
    this.totalTyped += 1;
    if (correct) {
      this.correctTyped += 1;
    }
  }

  recordBackspace(): void {
    this.backspaceCount += 1;
  }

  recordCorrection(): void {
    this.correctionCount += 1;
  }

  recordPause(durationMs: number): void {
    this.pauseMs += durationMs;
    this.longestPauseMs = Math.max(this.longestPauseMs, durationMs);
  }

  buildFrame(params: {
    inputMode: InputMode;
    phraseId: string;
    spokenProgressRatio: number;
    typedProgressRatio: number;
    lagSec: number;
    lagWords: number;
    lagChars: number;
    typedWordCount: number;
    sourceCharCount: number;
    phraseDifficulty: number;
    phraseLengthWords: number;
    phraseLengthChars: number;
    currentPlaybackRate: number;
    currentPauseAfterPhraseMs: number;
    trend: ImprovementTrend;
  }): LiveTelemetryFrame {
    const accuracy = this.totalTyped === 0 ? 1 : this.correctTyped / this.totalTyped;
    const errorRate = 1 - accuracy;
    const minutes = Math.max(1 / 60, Math.max(0, this.pauseMs / 60000));
    const wpm = params.typedWordCount / minutes;
    const charsPerMinute = params.sourceCharCount / minutes;

    return {
      inputMode: params.inputMode,
      phraseId: params.phraseId,
      spokenProgressRatio: clamp(params.spokenProgressRatio, 0, 1),
      typedProgressRatio: clamp(params.typedProgressRatio, 0, 1),
      lagSec: params.lagSec,
      lagWords: params.lagWords,
      lagChars: params.lagChars,
      accuracy: clamp(accuracy, 0, 1),
      errorRate: clamp(errorRate, 0, 1),
      wpm: Number(wpm.toFixed(1)),
      charsPerMinute: Number(charsPerMinute.toFixed(0)),
      pauseMs: this.pauseMs,
      longestPauseMs: this.longestPauseMs,
      backspaceRate: this.totalTyped === 0 ? 0 : this.backspaceCount / this.totalTyped,
      correctionRate: this.totalTyped === 0 ? 0 : this.correctionCount / this.totalTyped,
      phraseDifficulty: params.phraseDifficulty,
      phraseLengthWords: params.phraseLengthWords,
      phraseLengthChars: params.phraseLengthChars,
      language: this.options.language,
      currentPlaybackRate: params.currentPlaybackRate,
      currentPauseAfterPhraseMs: params.currentPauseAfterPhraseMs,
      trend: params.trend,
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
