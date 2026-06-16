import type { SessionTelemetry } from '../../types/dictation';
import type { SessionScoreMetrics } from '../../core/sessionScore';

export type SessionDashboardStatus = 'ready' | 'running' | 'paused' | 'finished' | 'error';
export type SessionDashboardInputMode = string;

export type SessionDashboardMetrics = SessionScoreMetrics & {
  lagWords: number;
};

export type SessionDashboardSession = {
  id: string;
  name: string;
  updatedAt: string;
  inputMode: SessionDashboardInputMode;
  ttsText: string;
  ttsPracticeText: string;
  status: SessionDashboardStatus;
  metrics: SessionDashboardMetrics;
  telemetry: SessionTelemetry;
};

export type DashboardGoals = {
  accuracy: number;
  wpmMin: number;
  wpmMax: number;
  lagMin: number;
  lagMax: number;
  repeatsMax: number;
};

export type TranscriptReviewToken = {
  typedIndex: number;
  word: string;
  expected: string;
  status: 'correct' | 'fuzzy' | 'extra';
  points: number;
};

export type TranscriptReview = {
  tokens: TranscriptReviewToken[];
  correct: number;
  fuzzy: number;
  extra: number;
  missed: number;
};
