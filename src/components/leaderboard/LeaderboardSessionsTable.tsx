import { LeaderboardSessionRow } from './LeaderboardSessionRow';
import type { LeaderboardEntry, LeaderboardLanguageCode, LeaderboardSession, SessionDeviceIconComponentType } from './leaderboardWorkspaceTypes';

type LeaderboardSessionsTableProps<TSession extends LeaderboardSession> = {
  sectionLabel: string;
  sessions: Array<LeaderboardEntry<TSession>>;
  leaderboardLanguageView: LeaderboardLanguageCode;
  activeSessionId: string | null;
  onOpenWorkspaceForSession: (session: TSession) => void;
  onOpenDashboardForSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  formatLeaderboardSessionStatus: (session: TSession) => string;
  formatSessionGenerationOrigin: (generationOrigin: TSession['generationOrigin']) => string;
  formatSessionPlaybackDuration: (session: TSession) => string;
  formatSessionDate: (date: string) => string;
  formatSessionPointsForSession: (points: number, session: TSession) => string;
  buildSessionScoreHelpText: (metrics: TSession['metrics']) => string;
  buildSessionPointsHelpText: (maxPoints: number) => string;
  computeSessionMaxPoints: (session: TSession) => number | null;
  getSessionDisplayTitle: (session: TSession) => string;
  isSessionReadyForTraining: (session: TSession) => boolean;
  SessionDeviceIconComponent: SessionDeviceIconComponentType<TSession>;
};

export function LeaderboardSessionsTable<TSession extends LeaderboardSession>({
  sectionLabel,
  sessions,
  leaderboardLanguageView,
  activeSessionId,
  onOpenWorkspaceForSession,
  onOpenDashboardForSession,
  onDeleteSession,
  formatLeaderboardSessionStatus,
  formatSessionGenerationOrigin,
  formatSessionPlaybackDuration,
  formatSessionDate,
  formatSessionPointsForSession,
  buildSessionScoreHelpText,
  buildSessionPointsHelpText,
  computeSessionMaxPoints,
  getSessionDisplayTitle,
  isSessionReadyForTraining,
  SessionDeviceIconComponent,
}: LeaderboardSessionsTableProps<TSession>) {
  return (
    <div className="leaderboard-table leaderboard-list-full">
      <div className="leaderboard-table-header">
        <span>Position</span>
        <span>Name</span>
        <span>Points</span>
        <span>Score</span>
        <span>Accuracy</span>
        <span>WPM</span>
        <span>Lag</span>
        <span>Rate</span>
        <span>Status</span>
        <span>Duration</span>
        <span>Updated</span>
        <span>Action</span>
      </div>
      {sessions.length === 0 ? (
        <div className="leaderboard-empty">
          No {sectionLabel.toLowerCase()} sessions yet for {leaderboardLanguageView.toUpperCase()}.
        </div>
      ) : null}
      {sessions.map(({ rank, session }) => (
        <LeaderboardSessionRow
          key={session.id}
          rank={rank}
          session={session}
          activeSessionId={activeSessionId}
          onOpenWorkspaceForSession={onOpenWorkspaceForSession}
          onOpenDashboardForSession={onOpenDashboardForSession}
          onRemoveSession={onDeleteSession}
          formatLeaderboardSessionStatus={formatLeaderboardSessionStatus}
          formatSessionGenerationOrigin={formatSessionGenerationOrigin}
          formatSessionPlaybackDuration={formatSessionPlaybackDuration}
          formatSessionDate={formatSessionDate}
          formatSessionPointsForSession={formatSessionPointsForSession}
          buildSessionScoreHelpText={buildSessionScoreHelpText}
          buildSessionPointsHelpText={buildSessionPointsHelpText}
          computeSessionMaxPoints={computeSessionMaxPoints}
          getSessionDisplayTitle={getSessionDisplayTitle}
          isSessionReadyForTraining={isSessionReadyForTraining}
          SessionDeviceIconComponent={SessionDeviceIconComponent}
        />
      ))}
    </div>
  );
}
