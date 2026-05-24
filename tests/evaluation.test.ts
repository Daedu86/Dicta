import { describe, expect, it } from 'vitest';
import {
  computeSessionMaxPoints,
  evaluateTranscriptAttempt,
  formatSessionPointsForSession,
  formatSessionPointsLabel,
} from '../src/core/evaluation';

describe('computeSessionMaxPoints', () => {
  it('uses non-empty transcript words for input 1', () => {
    expect(computeSessionMaxPoints({
      inputMode: 'input1',
      transcript: {
        words: [
          { word: 'Eins', start: 0, end: 1 },
          { word: 'zwei', start: 1, end: 2 },
          { word: '!!!', start: 2, end: 3 },
        ],
      },
    })).toBe(2);
  });

  it('uses normalized Browser TTS source words for input 2', () => {
    expect(computeSessionMaxPoints({
      inputMode: 'input2',
      ttsText: 'Alltaegliche Situationen im Cafe und auf dem Weg',
    })).toBe(8);
  });

  it('uses normalized Kokoro source words for input 3', () => {
    expect(computeSessionMaxPoints({
      inputMode: 'input3',
      kokoroText: 'hola mundo otra vez',
    })).toBe(4);
  });

  it('uses normalized Qwen Cloud source words for input 4', () => {
    expect(computeSessionMaxPoints({
      inputMode: 'input4',
      ttsText: 'un deux trois',
    })).toBe(3);
  });

  it('falls back to no total when the active source is missing', () => {
    expect(computeSessionMaxPoints({ inputMode: 'input2', ttsText: '' })).toBeNull();
    expect(computeSessionMaxPoints({ inputMode: 'input1', transcript: null })).toBeNull();
  });
});

describe('evaluateTranscriptAttempt', () => {
  it('awards one point for exact and one-character fuzzy matches only', () => {
    const evaluation = evaluateTranscriptAttempt('helo brave extra', {
      words: [
        { word: 'hello', start: 0, end: 1 },
        { word: 'brave', start: 1, end: 2 },
        { word: 'world', start: 2, end: 3 },
      ],
    });

    expect(evaluation.points).toBe(2);
    expect(evaluation.alignedPairs).toEqual([
      { typedIndex: 0, targetIndex: 0, exact: false },
      { typedIndex: 1, targetIndex: 1, exact: true },
    ]);
    expect(evaluation.missedWords).toBe(1);
    expect(evaluation.extraWords).toBe(1);
  });
});

describe('session point labels', () => {
  it('formats earned points against the dynamic session total when available', () => {
    expect(formatSessionPointsLabel(152, 264)).toBe('152/264');
    expect(formatSessionPointsForSession(3, { inputMode: 'input4', ttsText: 'un deux trois quatre' })).toBe('3/4');
  });

  it('keeps the earned-only fallback for legacy sessions without source text', () => {
    expect(formatSessionPointsForSession(50, { inputMode: 'input3' })).toBe('50');
  });
});
