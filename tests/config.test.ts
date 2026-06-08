import { describe, expect, it } from 'vitest';
import { formatDifficultyLabel } from '../src/core/config';

describe('formatDifficultyLabel', () => {
  it('maps internal difficulty values to user-facing intent labels', () => {
    expect(formatDifficultyLabel('easy')).toBe('Precision');
    expect(formatDifficultyLabel('normal')).toBe('Stabilize');
    expect(formatDifficultyLabel('hard')).toBe('Challenge');
  });
});
