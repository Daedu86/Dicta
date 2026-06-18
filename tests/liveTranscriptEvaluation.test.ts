import { describe, expect, it } from 'vitest';
import {
  evaluateLiveTranscriptAttempt,
  evaluateTranscriptAttempt,
} from '../src/core/evaluation';
import type { Transcript } from '../src/types/dictation';

function transcriptFromWords(words: string[]): Transcript {
  return {
    words: words.map((word, index) => ({
      word,
      start: index,
      end: index + 1,
    })),
  };
}

describe('live transcript evaluation', () => {
  it('tracks sequential typing with nearby omissions and extra words', () => {
    const transcript = transcriptFromWords(['alpha', 'beta', 'gamma', 'delta', 'epsilon']);

    const evaluation = evaluateLiveTranscriptAttempt('alpha wrong gamma delta', transcript);

    expect(evaluation.matchedWords).toBe(3);
    expect(evaluation.points).toBe(3);
    expect(evaluation.accuracy).toBe(75);
    expect(evaluation.lastMatchedTargetIndex).toBe(3);
    expect(evaluation.alignedPairs.map((pair) => pair.targetIndex)).toEqual([0, 2, 3]);
  });

  it('keeps live matching bounded while exact evaluation can scan the full target', () => {
    const transcript = transcriptFromWords([
      'alpha',
      ...Array.from({ length: 20 }, (_, index) => `filler${index}`),
      'omega',
    ]);

    const liveEvaluation = evaluateLiveTranscriptAttempt('omega', transcript, 4);
    const exactEvaluation = evaluateTranscriptAttempt('omega', transcript);

    expect(liveEvaluation.matchedWords).toBe(0);
    expect(liveEvaluation.lastMatchedTargetIndex).toBe(-1);
    expect(exactEvaluation.matchedWords).toBe(1);
    expect(exactEvaluation.lastMatchedTargetIndex).toBe(21);
  });
});
