import { LeaderboardRangeMetrics } from './LeaderboardRangeMetrics';
import { LeaderboardSessionsTable } from './LeaderboardSessionsTable';
import { formatLeaderboardSectionIntentLabel } from './leaderboardViewHelpers';
import type { LeaderboardLanguageCode, LeaderboardSection, LeaderboardSectionId, LeaderboardSession, MetricComponentType, SessionDeviceIconComponentType } from './leaderboardWorkspaceTypes';

type LeaderboardWorkspaceSectionProps<TSession extends LeaderboardSession> = {
  section: LeaderboardSection<TSession>;
  sectionExpanded: boolean;
  leaderboardLanguageView: LeaderboardLanguageCode;
  activeSessionId: string | null;
  onToggleLeaderboardSectionExpanded: (sectionId: LeaderboardSectionId) => void;
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
  MetricComponent: MetricComponentType;
  SessionDeviceIconComponent: SessionDeviceIconComponentType<TSession>;
};

export function LeaderboardWorkspaceSection<TSession extends LeaderboardSession>({
  section,
  sectionExpanded,
  leaderboardLanguageView,
  activeSessionId,
  onToggleLeaderboardSectionExpanded,
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
  MetricComponent,
  SessionDeviceIconComponent,
}: LeaderboardWorkspaceSectionProps<TSession>) {
  const sectionLabel = formatLeaderboardSectionIntentLabel(section);

  return (
    <section className="leaderboard-difficulty-section">
      <button
        type="button"
        className="leaderboard-section-header"
        onClick={() => onToggleLeaderboardSectionExpanded(section.id)}
        aria-expanded={sectionExpanded}
      >
        <span>
          <strong>{sectionLabel}</strong>
          <small>
            {section.sessions.length} {section.sessions.length === 1 ? 'session' : 'sessions'}
          </small>
        </span>
        <span className={`leaderboard-section-chevron ${sectionExpanded ? 'leaderboard-section-chevron-open' : ''}`} aria-hidden="true">
          ⌄
        </span>
      </button>
      {sectionExpanded ? (
        <div className="leaderboard-section-body">
          <LeaderboardRangeMetrics sectionLabel={sectionLabel} rangeMetrics={section.rangeMetrics} MetricComponent={MetricComponent} />
          <LeaderboardSessionsTable
            sectionLabel={sectionLabel}
            sessions={section.sessions}
            leaderboardLanguageView={leaderboardLanguageView}
            activeSessionId={activeSessionId}
            onOpenWorkspaceForSession={onOpenWorkspaceForSession}
            onOpenDashboardForSession={onOpenDashboardForSession}
            onDeleteSession={onDeleteSession}
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
        </div>
      ) : null}
    </section>
  );
}
