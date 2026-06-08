import { describe, expect, it } from 'vitest';
import {
  computeListeningPrecisionMetrics,
  createDefaultListeningPrecisionMetrics,
  tokenizeListeningText,
} from '../src/core/adaptive/listeningPrecisionMetrics';

describe('listening precision metrics', () => {
  it('returns neutral metrics for empty target text', () => {
    expect(computeListeningPrecisionMetrics({ targetText: '', typedText: '' })).toEqual(createDefaultListeningPrecisionMetrics());
  });

  it('separates content recall from function-word precision', () => {
    const metrics = computeListeningPrecisionMetrics({
      language: 'en',
      targetText: 'The small train waits at the old station',
      typedText: 'small train waits old station',
    });

    expect(metrics.contentWordRecall).toBe(1);
    expect(metrics.functionWordAccuracy).toBeLessThan(1);
    expect(metrics.detailPrecisionScore).toBeLessThan(1);
    expect(metrics.omissionRate).toBeGreaterThan(0);
  });

  it('detects word-order loss separately from omissions', () => {
    const metrics = computeListeningPrecisionMetrics({
      language: 'en',
      targetText: 'the blue car passed the red bus',
      typedText: 'the red bus passed the blue car',
    });

    expect(metrics.omissionRate).toBe(0);
    expect(metrics.substitutionRate).toBe(0);
    expect(metrics.wordOrderAccuracy).toBeLessThan(1);
    expect(metrics.listeningRecallScore).toBeLessThan(1);
  });

  it('tracks late completion when words arrive after playback ends', () => {
    const metrics = computeListeningPrecisionMetrics({
      language: 'en',
      targetText: 'the box is on the table',
      typedTextAtPlaybackEnd: 'the box is',
      typedText: 'the box is on the table',
    });

    expect(metrics.omissionRate).toBe(0);
    expect(metrics.lateCompletionRate).toBe(1);
  });

  it('tokenizes the five target languages with accented words', () => {
    expect(tokenizeListeningText('Über cafe acao y manana.')).toEqual(['über', 'cafe', 'acao', 'y', 'manana']);
  });
});
