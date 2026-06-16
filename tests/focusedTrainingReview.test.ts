import { describe, expect, it } from 'vitest';
import { buildFocusedTrainingReview } from '../src/app/focusedTrainingReview';

describe('buildFocusedTrainingReview', () => {
  it('marks matched, missing, and extra words from the attempt', () => {
    const review = buildFocusedTrainingReview(
      'Der Bäcker öffnet früh morgens die Tür',
      'Der backer offnet fruh morgens',
    );

    expect(review.matchedCount).toBeGreaterThan(0);
    expect(review.missedCount).toBeGreaterThan(0);
    expect(review.extraCount).toBeGreaterThanOrEqual(0);
    expect(review.targetWords.some((word) => word.state === 'missing')).toBe(true);
    expect(review.typedWords.some((word) => word.state === 'matched')).toBe(true);
  });
});
