import type { ComponentType, ReactElement } from 'react';

export type LeaderboardLanguageCode = 'en' | 'es' | 'de' | 'fr' | 'pt';

export type LeaderboardSectionId = 'precision' | 'stabilize' | 'challenge';

export type LeaderboardGenerationOrigin = 'manual' | 'openrouter' | 'fallback-template';

export type LeaderboardSessionStatus = 'ready' | 'running' | 'paused' | 'finished' | 'error';

export type LeaderboardSessionMetrics = {
  controllerState: string;
  rate: number;
  lagSec: number;
  lagWords: number;
  wpm: number;
  accuracy: number;
  trend: string;
  score: number;
  points: number;
};

export type LeaderboardSession = {
  id: string;
  status: LeaderboardSessionStatus;
  updatedAt: string;
  generationOrigin: LeaderboardGenerationOrigin;
  generationError?: string;
  metrics: LeaderboardSessionMetrics;
  [key: string]: unknown;
};

export type LeaderboardEntry<TSession extends LeaderboardSession = LeaderboardSession> = {
  rank: number;
  session: TSession;
};

export type LeaderboardRangeMetric = {
  range: string;
  label: string;
  sessionCount: number;
  durationLabel: string;
  avgPointsLabel: string;
  avgScoreLabel: string;
  avgAccuracyLabel: string;
  avgWpmLabel: string;
};

export type LeaderboardSection<TSession extends LeaderboardSession = LeaderboardSession> = {
  id: LeaderboardSectionId;
  label: string;
  sessions: Array<LeaderboardEntry<TSession>>;
  rangeMetrics: LeaderboardRangeMetric[];
};

export type MetricComponentType = (props: { label: string; value: string; title?: string }) => ReactElement;

export type SessionDeviceIconComponentType<TSession extends LeaderboardSession = LeaderboardSession> = ComponentType<{ session: TSession }>;

export type LeaderboardWorkspaceProps<TSession extends LeaderboardSession = LeaderboardSession> = {
  leaderboard: Array<LeaderboardEntry<TSession>>;
  leaderboardSections: Array<LeaderboardSection<TSession>>;
  leaderboardMonthSessionCount: number;
  leaderboardLanguageView: LeaderboardLanguageCode;
  leaderboardExpanded: boolean;
  leaderboardSectionExpanded: Record<LeaderboardSectionId, boolean>;
  activeSessionId: string | null;
  supportedLanguages: readonly LeaderboardLanguageCode[];
  languageLabels: Record<LeaderboardLanguageCode, string>;
  onChangeLeaderboardLanguageView: (code: LeaderboardLanguageCode) => void;
  onToggleLeaderboardExpanded: () => void;
  onToggleLeaderboardSectionExpanded: (sectionId: LeaderboardSectionId) => void;
  onOpenWorkspaceForSession: (session: TSession) => void;
  onOpenDashboardForSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onBackToTraining: () => void;
  formatLeaderboardSessionStatus: (session: TSession) => string;
  formatSessionGenerationOrigin: (generationOrigin: LeaderboardGenerationOrigin) => string;
  formatSessionPlaybackDuration: (session: TSession) => string;
  formatSessionDate: (date: string) => string;
  formatSessionPointsForSession: (points: number, session: TSession) => string;
  buildSessionScoreHelpText: (metrics: TSession['metrics']) => string;
  buildSessionPointsHelpText: (maxPoints: number) => string;
  computeSessionMaxPoints: (session: TSession) => number | null;
  getSessionDisplayTitle: (session: TSession) => string;
  isSessionReadyForTraining: (session: TSession) => boolean;
  MetricComponent: MetricComponentType;
  SessionDeviceIconComponent: SessionDeviceIconComponentType<TSession>;
};
