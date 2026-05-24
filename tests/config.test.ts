import { describe, expect, it } from 'vitest';
import { formatDifficultyLabel } from '../src/core/config';

describe('formatDifficultyLabel', () => {
  it('maps session difficulty values to pending-session labels', () => {
    expect(formatDifficultyLabel('easy')).toBe('Easy');
    expect(formatDifficultyLabel('normal')).toBe('Medium');
    expect(formatDifficultyLabel('hard')).toBe('High');
  });
});
