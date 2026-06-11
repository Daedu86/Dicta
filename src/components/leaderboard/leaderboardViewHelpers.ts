type LeaderboardSectionId =
  | 'easy-express'
  | 'medium-express'
  | 'hard-express'
  | 'easy-standard'
  | 'medium-standard'
  | 'hard-standard';

const LEADERBOARD_INTENT_LABELS: Record<LeaderboardSectionId, string> = {
  'easy-express': 'Express Precision',
  'medium-express': 'Express Stabilize',
  'hard-express': 'Express Challenge',
  'easy-standard': 'Precision',
  'medium-standard': 'Stabilize',
  'hard-standard': 'Challenge',
};

export function formatLeaderboardSectionIntentLabel(section: { id: string; label: string }): string {
  return LEADERBOARD_INTENT_LABELS[section.id as LeaderboardSectionId] ?? section.label;
}
