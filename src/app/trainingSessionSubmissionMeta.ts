import {
  buildSessionPointsHelpText,
  computeSessionMaxPoints,
  formatSessionPointsLabel,
} from '../core/evaluation';
import { resolveSessionLanguage } from '../core/liveMetrics';
import { isSubmittedFinishedAttempt } from '../core/sessionNormalization';
import { buildSessionScoreHelpText } from '../core/sessionScore';
import { formatSubmittedAt } from './sessionDateFormatters';
import { formatSessionPlaybackDuration } from './sessionPlaybackDuration';

export type TrainingSessionSubmissionMeta = {
  positionLabel: string;
  scoreLabel: string;
  scoreHelpText: string;
  accuracyLabel: string;
  pointsLabel: string;
  pointsHelpText: string;
  durationLabel: string;
  submittedAtLabel: string;
};

type TrainingSessionSubmissionSession =
  Parameters<typeof resolveSessionLanguage>[0] &
  Parameters<typeof computeSessionMaxPoints>[0] &
  Parameters<typeof formatSessionPlaybackDuration>[0] & {
    id: string;
    status: string;
    updatedAt: string;
    metrics: Parameters<typeof buildSessionScoreHelpText>[0] & {
      accuracy: number;
      points: number;
      score: number;
    };
    telemetry: {
      finishedAt?: string | null;
    };
  };

export function buildTrainingSessionSubmissionMeta(
  sessions: TrainingSessionSubmissionSession[],
  activeSession: TrainingSessionSubmissionSession | null,
): TrainingSessionSubmissionMeta | null {
  if (!activeSession || activeSession.status !== 'finished' || !isSubmittedFinishedAttempt(activeSession)) {
    return null;
  }

  const language = resolveSessionLanguage(activeSession);
  const rankedByLanguage = [...sessions]
    .filter((session) => resolveSessionLanguage(session) === language)
    .sort((a, b) => b.metrics.points - a.metrics.points || b.metrics.score - a.metrics.score || b.metrics.accuracy - a.metrics.accuracy);
  const rank = rankedByLanguage.findIndex((session) => session.id === activeSession.id) + 1;
  const submittedAt = activeSession.telemetry.finishedAt ?? activeSession.updatedAt;
  const maxPoints = computeSessionMaxPoints(activeSession);

  return {
    positionLabel: rank > 0 ? `#${rank}` : 'n/a',
    scoreLabel: String(activeSession.metrics.score),
    scoreHelpText: buildSessionScoreHelpText(activeSession.metrics),
    accuracyLabel: `${activeSession.metrics.accuracy.toFixed(1)}%`,
    pointsLabel: formatSessionPointsLabel(activeSession.metrics.points, maxPoints),
    pointsHelpText: buildSessionPointsHelpText(maxPoints),
    durationLabel: formatSessionPlaybackDuration(activeSession),
    submittedAtLabel: formatSubmittedAt(submittedAt),
  };
}
