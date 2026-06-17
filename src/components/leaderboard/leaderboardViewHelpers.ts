import { LEADERBOARD_SECTION_DEFINITIONS, type LeaderboardSectionId } from '../../app/leaderboardSections';

type LeaderboardSectionLabelSource = {
  id: LeaderboardSectionId | string;
  label: string;
};

export function formatLeaderboardSectionIntentLabel(section: LeaderboardSectionLabelSource): string {
  const canonicalSection = LEADERBOARD_SECTION_DEFINITIONS.find((definition) => definition.id === section.id);
  return canonicalSection?.label ?? section.label;
}
