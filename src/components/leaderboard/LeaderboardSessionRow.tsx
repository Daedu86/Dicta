import type { LeaderboardSession, SessionDeviceIconComponentType } from './leaderboardWorkspaceTypes';

type LeaderboardSessionRowProps<TSession extends LeaderboardSession> = {
  rank: number;
  session: TSession;
  activeSessionId: string | null;
  onOpenWorkspaceForSession: (session: TSession) => void;
  onOpenDashboardForSession: (sessionId: string) => void;
  onRemoveSession: (sessionId: string) => void;
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

export function LeaderboardSessionRow<TSession extends LeaderboardSession>({
  rank,
  session,
  activeSessionId,
  onOpenWorkspaceForSession,
  onOpenDashboardForSession,
  onRemoveSession,
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
}: LeaderboardSessionRowProps<TSession>) {
  const readinessClass =
    session.status === 'error'
      ? 'leaderboard-table-row-error'
      : isSessionReadyForTraining(session)
        ? 'leaderboard-table-row-ready'
        : 'leaderboard-table-row-not-ready';
  const statusLabel = formatLeaderboardSessionStatus(session);
  const statusTitle = session.generationError ? `${statusLabel}: ${session.generationError}` : statusLabel;
  const scoreHelpText = buildSessionScoreHelpText(session.metrics);
  const sessionTitle = getSessionDisplayTitle(session);

  return (
    <div className={`leaderboard-table-row ${readinessClass} ${session.id === activeSessionId ? 'leaderboard-table-row-active' : ''}`}>
      <span className="leaderboard-cell leaderboard-cell-rank">#{rank}</span>
      <span className="leaderboard-cell leaderboard-cell-name" title={sessionTitle}>
        <SessionDeviceIconComponent session={session} />
        <span>{sessionTitle}</span>
      </span>
      <span className="leaderboard-cell leaderboard-cell-points" title={buildSessionPointsHelpText(computeSessionMaxPoints(session) ?? 0)}>
        {formatSessionPointsForSession(session.metrics.points, session)}
      </span>
      <span className="leaderboard-cell leaderboard-cell-score" title={scoreHelpText} aria-label={`Score ${session.metrics.score}. ${scoreHelpText}`}>
        {session.metrics.score}
      </span>
      <span className="leaderboard-cell leaderboard-cell-accuracy">{session.metrics.accuracy.toFixed(1)}%</span>
      <span className="leaderboard-cell leaderboard-cell-wpm">{session.metrics.wpm.toFixed(1)}</span>
      <span className="leaderboard-cell leaderboard-cell-lag">{session.metrics.lagSec.toFixed(2)}s</span>
      <span className="leaderboard-cell leaderboard-cell-rate">{session.metrics.rate.toFixed(2)}x</span>
      <span className="leaderboard-cell leaderboard-cell-status" title={statusTitle}>
        {statusLabel}
        <small>{formatSessionGenerationOrigin(session.generationOrigin)}</small>
        {session.generationError ? <small>{session.generationError}</small> : null}
      </span>
      <span className="leaderboard-cell leaderboard-cell-duration">{formatSessionPlaybackDuration(session)}</span>
      <span className="leaderboard-cell leaderboard-cell-date">{formatSessionDate(session.updatedAt)}</span>
      <span className="leaderboard-cell leaderboard-cell-action">
        <div className="leaderboard-action-buttons" aria-label={`Actions for ${sessionTitle}`}>
          <button
            type="button"
            className="secondary-button leaderboard-action-button"
            onClick={() => onOpenWorkspaceForSession(session)}
            aria-label={`Open training workspace for ${sessionTitle}`}
            title="Open in input workspace"
          >
            <span aria-hidden="true">⟵</span>
          </button>
          <button
            type="button"
            className="secondary-button leaderboard-action-button"
            onClick={() => onOpenDashboardForSession(session.id)}
            aria-label={`Open dashboard for ${sessionTitle}`}
            title="Dashboard"
          >
            <span aria-hidden="true">◫</span>
          </button>
          <button
            type="button"
            className="danger-button leaderboard-action-button leaderboard-action-button-danger"
            onClick={() => onRemoveSession(session.id)}
            aria-label={`Remove ${sessionTitle}`}
            title="Remove session"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </span>
    </div>
  );
}
