import type { Difficulty } from '../core/config';
import type { MetricsRangeView } from '../core/liveMetrics';

export type LeaderboardSessionLength = 'express' | 'standard';

export type LeaderboardSectionId =
  | 'easy-express'
  | 'medium-express'
  | 'hard-express'
  | 'easy-standard'
  | 'medium-standard'
  | 'hard-standard';

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
  length: LeaderboardSessionLength;
  sessions: Array<{ rank: number; session: TSession }>;
  rangeMetrics: LeaderboardRangeMetric[];
};

export const LEADERBOARD_SECTION_DEFINITIONS: Array<{
  id: LeaderboardSectionId;
  label: string;
  difficulty: Difficulty;
  length: LeaderboardSessionLength;
}> = [
  { id: 'easy-express', label: 'Easy Express', difficulty: 'easy', length: 'express' },
  { id: 'medium-express', label: 'Medium Express', difficulty: 'normal', length: 'express' },
  { id: 'hard-express', label: 'Hard Express', difficulty: 'hard', length: 'express' },
  { id: 'easy-standard', label: 'Easy Standard', difficulty: 'easy', length: 'standard' },
  { id: 'medium-standard', label: 'Medium Standard', difficulty: 'normal', length: 'standard' },
  { id: 'hard-standard', label: 'Hard Standard', difficulty: 'hard', length: 'standard' },
];

export const LEADERBOARD_RANGE_DEFINITIONS: Array<{ range: MetricsRangeView; label: string }> = [
  { range: 'today', label: 'Today' },
  { range: 'week', label: 'Week' },
  { range: 'twoWeeks', label: '2 Weeks' },
  { range: 'threeWeeks', label: '3 Weeks' },
  { range: 'month', label: 'Month' },
];

export const DEFAULT_LEADERBOARD_SECTION_EXPANDED: Record<LeaderboardSectionId, boolean> = {
  'easy-express': false,
  'medium-express': false,
  'hard-express': false,
  'easy-standard': false,
  'medium-standard': false,
  'hard-standard': false,
};
