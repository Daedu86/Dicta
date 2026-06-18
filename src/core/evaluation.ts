import { normalizeWord } from './normalization';
import type { Transcript } from '../types/dictation';
import {
  alignWordPairs,
  alignWordPairsGreedyWindow,
  type WordAlignmentPair,
} from './evaluationAlignment';

export type { WordAlignmentPair } from './evaluationAlignment';
export { alignWordPairs, alignWordPairsGreedyWindow } from './evaluationAlignment';
export type { SessionPointsSource } from './sessionPoints';
export {
  buildSessionPointsHelpText,
  computeSessionMaxPoints,
  formatSessionPointsForSession,
  formatSessionPointsLabel,
} from './sessionPoints';

export interface AttemptEvaluation {
  typedWords: string[];
  targetWords: string[];
  alignedPairs: WordAlignmentPair[];
  matchedWords: number;
  missedWords: number;
  extraWords: number;
  accuracy: number;
  points: number;
  lastMatchedTargetIndex: number;
}

export function evaluateTranscriptAttempt(input: string, transcript: Transcript | null): AttemptEvaluation {
  return evaluateTranscriptAttemptWithAligner(input, transcript, alignWordPairs);
}

export function evaluateLiveTranscriptAttempt(
  input: string,
  transcript: Transcript | null,
  lookaheadWords = 12,
): AttemptEvaluation {
  return evaluateTranscriptAttemptWithAligner(
    input,
    transcript,
    (typedWords, targetWords) => alignWordPairsGreedyWindow(typedWords, targetWords, lookaheadWords),
  );
}

function evaluateTranscriptAttemptWithAligner(
  input: string,
  transcript: Transcript | null,
  aligner: (typedWords: string[], targetWords: string[]) => WordAlignmentPair[],
): AttemptEvaluation {
  const typedWords = input
    .split(/\s+/)
    .map((word) => normalizeWord(word))
    .filter(Boolean);
  const targetWords = transcript ? transcript.words.map((word) => normalizeWord(word.word)) : [];

  if (targetWords.length === 0) {
    return {
      typedWords,
      targetWords,
      alignedPairs: [],
      matchedWords: 0,
      missedWords: 0,
      extraWords: typedWords.length,
      accuracy: typedWords.length === 0 ? 100 : 0,
      points: 0,
      lastMatchedTargetIndex: -1,
    };
  }

  const pairs = aligner(typedWords, targetWords);
  const matchedWords = pairs.length;
  const accuracy = typedWords.length === 0 ? 100 : (matchedWords / typedWords.length) * 100;

  return {
    typedWords,
    targetWords,
    alignedPairs: pairs,
    matchedWords,
    missedWords: Math.max(targetWords.length - matchedWords, 0),
    extraWords: Math.max(typedWords.length - matchedWords, 0),
    accuracy,
    points: matchedWords,
    lastMatchedTargetIndex: pairs.length > 0 ? pairs[pairs.length - 1].targetIndex : -1,
  };
}
