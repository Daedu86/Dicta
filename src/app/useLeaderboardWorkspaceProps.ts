import { useMemo, type Dispatch, type SetStateAction } from 'react';
import type { LeaderboardWorkspaceProps } from '../components/leaderboard/LeaderboardWorkspace';
import { copySessionSnapshot, downloadSessionSnapshot } from './sessionSnapshotActions';
import type { StoredSession } from './sessionTypes';

type LeaderboardSectionExpanded = LeaderboardWorkspaceProps<StoredSession>['leaderboardSectionExpanded'];
type LeaderboardSectionId = Parameters<LeaderboardWorkspaceProps<StoredSession>['onToggleLeaderboardSectionExpanded']>[0];

type UseLeaderboardWorkspacePropsArgs = Omit<
  LeaderboardWorkspaceProps<StoredSession>,
  'onToggleLeaderboardExpanded' | 'onToggleLeaderboardSectionExpanded' | 'onDownloadSessionSnapshot' | 'onCopySessionSnapshot'
> & {
  setLeaderboardExpanded: Dispatch<SetStateAction<boolean>>;
  setLeaderboardSectionExpanded: Dispatch<SetStateAction<LeaderboardSectionExpanded>>;
  setExportMessage: Dispatch<SetStateAction<string>>;
};

export function useLeaderboardWorkspaceProps({
  leaderboard,
  leaderboardSections,
  leaderboardLanguageView,
  leaderboardExpanded,
  leaderboardSectionExpanded,
  activeSessionId,
  supportedLanguages,
  languageLabels,
  onChangeLeaderboardLanguageView,
  setLeaderboardExpanded,
  setLeaderboardSectionExpanded,
  onOpenWorkspaceForSession,
  onOpenDashboardForSession,
  setExportMessage,
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
}: UseLeaderboardWorkspacePropsArgs): LeaderboardWorkspaceProps<StoredSession> {
  return useMemo(() => ({
    leaderboard,
    leaderboardSections,
    leaderboardLanguageView,
    leaderboardExpanded,
    leaderboardSectionExpanded,
    activeSessionId,
    supportedLanguages,
    languageLabels,
    onChangeLeaderboardLanguageView,
    onToggleLeaderboardExpanded: () => setLeaderboardExpanded((value) => !value),
    onToggleLeaderboardSectionExpanded: (sectionId: LeaderboardSectionId) =>
      setLeaderboardSectionExpanded((current) => ({
        ...current,
        [sectionId]: !current[sectionId],
      })),
    onOpenWorkspaceForSession,
    onOpenDashboardForSession,
    onDownloadSessionSnapshot: downloadSessionSnapshot,
    onCopySessionSnapshot: (session) => {
      void copySessionSnapshot(session, setExportMessage);
    },
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
  }), [
    leaderboard,
    leaderboardSections,
    leaderboardLanguageView,
    leaderboardExpanded,
    leaderboardSectionExpanded,
    activeSessionId,
    supportedLanguages,
    languageLabels,
    onChangeLeaderboardLanguageView,
    setLeaderboardExpanded,
    setLeaderboardSectionExpanded,
    onOpenWorkspaceForSession,
    onOpenDashboardForSession,
    setExportMessage,
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
  ]);
}
