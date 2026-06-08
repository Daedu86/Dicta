import { normalizeWord } from './normalization';
import type { Transcript } from '../types/dictation';

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

export interface WordAlignmentPair {
  typedIndex: number;
  targetIndex: number;
  exact: boolean;
}

export type SessionPointsSource = {
  inputMode?: string;
  ttsText?: string | null;
};

export function evaluateTranscriptAttempt(input: string, transcript: Transcript | null): AttemptEvaluation {
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

  const pairs = alignWordPairs(typedWords, targetWords);
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

export function computeSessionMaxPoints(session: SessionPointsSource | null | undefined): number | null {
  if (!session) return null;

  let maxPoints = 0;
  if (session.inputMode === 'input2') {
    maxPoints = countNormalizedTextWords(session.ttsText ?? '');
  }

  return maxPoints > 0 ? maxPoints : null;
}

export function formatSessionPointsLabel(points: number, maxPoints: number | null): string {
  const earned = Number.isFinite(points) ? Math.max(0, Math.round(points)) : 0;
  return maxPoints !== null ? `${earned}/${maxPoints}` : String(earned);
}

export function formatSessionPointsForSession(points: number, session: SessionPointsSource | null | undefined): string {
  return formatSessionPointsLabel(points, computeSessionMaxPoints(session));
}

export function buildSessionPointsHelpText(maxPoints: number | null): string {
  const totalText = maxPoints !== null ? ` Maximum ${maxPoints} points for this session.` : '';
  return `1 point per matched target word; exact and one-character typo matches count; missed/extra words do not.${totalText}`;
}

export function alignWordPairs(typedWords: string[], targetWords: string[]): WordAlignmentPair[] {
  const rows = typedWords.length;
  const cols = targetWords.length;
  const dp: number[][] = Array.from({ length: rows + 1 }, () => Array(cols + 1).fill(0));

  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = cols - 1; j >= 0; j -= 1) {
      if (wordsMatch(typedWords[i], targetWords[j])) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const pairs: WordAlignmentPair[] = [];
  let i = 0;
  let j = 0;

  while (i < rows && j < cols) {
    if (wordsMatch(typedWords[i], targetWords[j])) {
      pairs.push({ typedIndex: i, targetIndex: j, exact: typedWords[i] === targetWords[j] });
      i += 1;
      j += 1;
      continue;
    }

    if (dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }

  return pairs;
}

function countNormalizedTextWords(text: string): number {
  return text
    .split(/\s+/)
    .map((word) => normalizeWord(word))
    .filter(Boolean).length;
}

function wordsMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  return levenshteinDistanceAtMostOne(a, b);
}

function levenshteinDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  const aLen = a.length;
  const bLen = b.length;
  if (Math.abs(aLen - bLen) > 1) return false;

  let i = 0;
  let j = 0;
  let edits = 0;

  while (i < aLen && j < bLen) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) {
      return false;
    }

    if (aLen > bLen) {
      i += 1;
    } else if (bLen > aLen) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }

  if (i < aLen || j < bLen) {
    edits += 1;
  }

  return edits <= 1;
}
