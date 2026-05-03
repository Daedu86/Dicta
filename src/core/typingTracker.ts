import { evaluateTranscriptAttempt } from './evaluation';
import type { TypingEvent } from '../types/dictation';

export class TypingTracker {
  private events: TypingEvent[] = [];
  private typedWords: string[] = [];
  private accuracyCorrect = 0;
  private accuracyTotal = 0;
  private lastMatchedTargetIndex = -1;

  reset(): void {
    this.events = [];
    this.typedWords = [];
    this.accuracyCorrect = 0;
    this.accuracyTotal = 0;
    this.lastMatchedTargetIndex = -1;
  }

  onInput(rawText: string, nowSec: number, targetWords: string[]): void {
    const evaluation = evaluateTranscriptAttempt(
      rawText,
      targetWords.length > 0
        ? { words: targetWords.map((word, index) => ({ word, start: index, end: index })) }
        : null,
    );

    this.typedWords = evaluation.typedWords;
    this.events.push({ t: nowSec, key: 'bulk_input' });
    this.accuracyCorrect = evaluation.matchedWords;
    this.accuracyTotal = Math.max(evaluation.typedWords.length, 1);
    this.lastMatchedTargetIndex = evaluation.lastMatchedTargetIndex;
  }

  getTypedWords(): string[] {
    return this.typedWords;
  }

  getTypedWordIndex(): number {
    return this.lastMatchedTargetIndex;
  }

  getAccuracyPercent(): number {
    return (this.accuracyCorrect / this.accuracyTotal) * 100;
  }

  getWpm(nowSec: number): number {
    if (this.typedWords.length < 2 || nowSec <= 0) {
      return 0;
    }

    const minutes = nowSec / 60;
    return this.typedWords.length / Math.max(minutes, 0.001);
  }
}
