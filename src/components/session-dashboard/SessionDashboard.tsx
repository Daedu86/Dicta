import { formatSessionPointsForSession } from '../../core/evaluation';
import { buildSessionScoreHelpText } from '../../core/sessionScore';
import { cloneTelemetry } from '../../core/sessionNormalization';
import { SessionDashboardChartsGrid } from './SessionDashboardChartsGrid';
import { SessionDashboardKpiSection } from './SessionDashboardKpiSection';
import { TranscriptReviewWidget } from './SessionDashboardTranscriptReview';
import { buildAdaptiveGoals, buildCoachingInsights, buildTranscriptReview } from './sessionDashboardModel';
import type { SessionDashboardSession, SessionDashboardStatus } from './sessionDashboardTypes';

export type { SessionDashboardSession } from './sessionDashboardTypes';

type SessionDashboardProps<TSession extends SessionDashboardSession = SessionDashboardSession> = {
  session: TSession;
  sessions: TSession[];
  onBackToTraining: () => void;
  formatSessionStatus: (status: SessionDashboardStatus) => string;
  formatSessionDate: (value: string) => string;
  formatSessionPlaybackDuration: (session: TSession) => string;
};

export function SessionDashboard<TSession extends SessionDashboardSession = SessionDashboardSession>({
  session,
  sessions,
  onBackToTraining,
  formatSessionStatus,
  formatSessionDate,
  formatSessionPlaybackDuration,
}: SessionDashboardProps<TSession>) {
  const telemetry = cloneTelemetry(session.telemetry);
  const goals = buildAdaptiveGoals(sessions, session);
  const insights = buildCoachingInsights(session, goals);
  const duration = formatSessionPlaybackDuration(session);
  const transcriptReview = buildTranscriptReview(session);
  const pointsLabel = formatSessionPointsForSession(session.metrics.points, session);
  const scoreHelpText = buildSessionScoreHelpText(session.metrics);

  return (
    <section className="panel workspace-panel dashboard-workspace">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">Coaching dashboard</p>
          <h2>{session.name || 'Untitled session'}</h2>
          <span className="dashboard-meta">
            {formatSessionStatus(session.status)} · {formatSessionDate(session.updatedAt)}
          </span>
        </div>
        <div className="dashboard-header-actions">
          <button type="button" className="secondary-button" onClick={onBackToTraining}>
            Back to training
          </button>
        </div>
      </div>

      <SessionDashboardKpiSection
        session={session}
        telemetry={telemetry}
        goals={goals}
        pointsLabel={pointsLabel}
        scoreHelpText={scoreHelpText}
        duration={duration}
      />

      <TranscriptReviewWidget review={transcriptReview} />

      <SessionDashboardChartsGrid telemetry={telemetry} insights={insights} />
    </section>
  );
}
