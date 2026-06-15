import type { Difficulty } from '../core/config';
import type { MetricsRangeView } from '../core/liveMetrics';

export type LeaderboardSectionId =
  | 'precision'
  | 'stabilize'
  | 'challenge';

export type LeaderboardRangeMetric = {
  range: MetricsRangeView;
  label: string;
  sessionCount: number;
  durationLabel: string;
  avgPointsLabel: string;
  avgScoreLabel: string;
  avgAccuracyLabel: string;
  avgWpmLabel: string;
};

export type LeaderboardSection<TSession> = {
  id: LeaderboardSectionId;
  label: string;
  difficulty: Difficulty;
  sessions: Array<{ rank: number; session: TSession }>;
  rangeMetrics: LeaderboardRangeMetric[];
};

export const LEADERBOARD_SECTION_DEFINITIONS: Array<{
  id: LeaderboardSectionId;
  label: string;
  difficulty: Difficulty;
}> = [
  { id: 'precision', label: 'Precision', difficulty: 'easy' },
  { id: 'stabilize', label: 'Stabilize', difficulty: 'normal' },
  { id: 'challenge', label: 'Challenge', difficulty: 'hard' },
];

export const LEADERBOARD_RANGE_DEFINITIONS: Array<{ range: MetricsRangeView; label: string }> = [
  { range: 'today', label: 'Today' },
  { range: 'week', label: 'Week' },
  { range: 'twoWeeks', label: '2 Weeks' },
  { range: 'threeWeeks', label: '3 Weeks' },
  { range: 'month', label: 'Month' },
];

export const DEFAULT_LEADERBOARD_SECTION_EXPANDED: Record<LeaderboardSectionId, boolean> = {
  precision: false,
  stabilize: false,
  challenge: false,
};
