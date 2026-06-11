import { describe, expect, it } from 'vitest';
import { formatLeaderboardSectionIntentLabel } from '../src/components/leaderboard/leaderboardViewHelpers';

describe('LeaderboardWorkspace intent section labels', () => {
  it('maps legacy leaderboard section ids to listening-first intent labels', () => {
    expect(formatLeaderboardSectionIntentLabel({ id: 'easy-standard', label: 'Easy Standard' })).toBe('Precision');
    expect(formatLeaderboardSectionIntentLabel({ id: 'medium-standard', label: 'Medium Standard' })).toBe('Stabilize');
    expect(formatLeaderboardSectionIntentLabel({ id: 'hard-standard', label: 'Hard Standard' })).toBe('Challenge');
  });

  it('maps express leaderboard section ids to express intent labels', () => {
    expect(formatLeaderboardSectionIntentLabel({ id: 'easy-express', label: 'Easy Express' })).toBe('Express Precision');
    expect(formatLeaderboardSectionIntentLabel({ id: 'medium-express', label: 'Medium Express' })).toBe('Express Stabilize');
    expect(formatLeaderboardSectionIntentLabel({ id: 'hard-express', label: 'Hard Express' })).toBe('Express Challenge');
  });

  it('keeps unknown section labels unchanged for forward compatibility', () => {
    expect(formatLeaderboardSectionIntentLabel({ id: 'custom-section', label: 'Custom Section' })).toBe('Custom Section');
  });
});
