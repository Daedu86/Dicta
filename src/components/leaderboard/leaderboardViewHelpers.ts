type LeaderboardSectionId =
  | 'precision'
  | 'stabilize'
  | 'challenge';

const LEADERBOARD_INTENT_LABELS: Record<LeaderboardSectionId, string> = {
  precision: 'Precision',
  stabilize: 'Stabilize',
  challenge: 'Challenge',
};

export function formatLeaderboardSectionIntentLabel(section: { id: string; label: string }): string {
  return LEADERBOARD_INTENT_LABELS[section.id as LeaderboardSectionId] ?? section.label;
}
