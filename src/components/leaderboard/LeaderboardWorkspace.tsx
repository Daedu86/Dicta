import { LeaderboardWorkspaceHeader } from './LeaderboardWorkspaceHeader';
import { LeaderboardWorkspaceSection } from './LeaderboardWorkspaceSection';
import type { LeaderboardSession, LeaderboardWorkspaceProps } from './leaderboardWorkspaceTypes';

export type { LeaderboardWorkspaceProps } from './leaderboardWorkspaceTypes';

export function LeaderboardWorkspace<TSession extends LeaderboardSession>({
  leaderboard,
  leaderboardSections,
  leaderboardLanguageView,
  leaderboardExpanded,
  leaderboardSectionExpanded,
  activeSessionId,
  supportedLanguages,
  languageLabels,
  onChangeLeaderboardLanguageView,
  onToggleLeaderboardExpanded,
  onToggleLeaderboardSectionExpanded,
  onOpenWorkspaceForSession,
  onOpenDashboardForSession,
  onDeleteSession,
  onBackToTraining,
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
}: LeaderboardWorkspaceProps<TSession>) {
  return (
    <section className="panel workspace-panel leaderboard-workspace">
      <LeaderboardWorkspaceHeader
        sessionCount={leaderboard.length}
        leaderboardLanguageView={leaderboardLanguageView}
        leaderboardExpanded={leaderboardExpanded}
        supportedLanguages={supportedLanguages}
        languageLabels={languageLabels}
        onChangeLeaderboardLanguageView={onChangeLeaderboardLanguageView}
        onToggleLeaderboardExpanded={onToggleLeaderboardExpanded}
        onBackToTraining={onBackToTraining}
      />
      {leaderboardExpanded ? (
        <div className="leaderboard-sections">
          {leaderboard.length === 0 ? (
            <div className="leaderboard-empty">
              No sessions yet for {leaderboardLanguageView.toUpperCase()}. Finish a session in that language to populate this leaderboard.
            </div>
          ) : null}
          {leaderboardSections.map((section) => (
            <LeaderboardWorkspaceSection
              key={section.id}
              section={section}
              sectionExpanded={Boolean(leaderboardSectionExpanded[section.id])}
              leaderboardLanguageView={leaderboardLanguageView}
              activeSessionId={activeSessionId}
              onToggleLeaderboardSectionExpanded={onToggleLeaderboardSectionExpanded}
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
              MetricComponent={MetricComponent}
              SessionDeviceIconComponent={SessionDeviceIconComponent}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
