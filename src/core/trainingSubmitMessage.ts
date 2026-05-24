import { resolveSessionLanguage, type SessionLanguageLike } from './liveMetrics';
import { estimateSessionVoiceDurationSec, type SessionDurationInput } from './sessionDuration';
import { formatSessionPointsForSession, type SessionPointsSource } from './evaluation';

type TrainingSubmitSession = SessionLanguageLike & SessionDurationInput & SessionPointsSource & {
  id: string;
  metrics: {
    points: number;
    score: number;
    accuracy: number;
  };
  telemetry?: {
    startedAt?: string;
    finishedAt?: string;
  };
};

export function buildTrainingSubmitMessage(sessions: TrainingSubmitSession[], sessionId: string): string {
  const submittedSession = sessions.find((session) => session.id === sessionId);
  if (!submittedSession) return 'Submitted to leaderboard.';

  const language = resolveSessionLanguage(submittedSession);
  const rankedByLanguage = [...sessions]
    .filter((session) => resolveSessionLanguage(session) === language)
    .sort((a, b) => b.metrics.points - a.metrics.points || b.metrics.score - a.metrics.score || b.metrics.accuracy - a.metrics.accuracy);
  const rank = rankedByLanguage.findIndex((session) => session.id === sessionId) + 1;
  const languageLabel = String(language).toUpperCase();
  const resultSummary = [
    `Score ${formatScore(submittedSession.metrics.score)}`,
    `Accuracy ${formatAccuracy(submittedSession.metrics.accuracy)}`,
    `Points ${formatSessionPointsForSession(submittedSession.metrics.points, submittedSession)}`,
    `Duration ${formatDuration(estimateSessionVoiceDurationSec(submittedSession))}`,
  ].join(', ');

  if (rank <= 0) {
    return `Submitted to leaderboard (${languageLabel}). ${resultSummary}.`;
  }
  return `Submitted to leaderboard. Position #${rank} (${languageLabel}). ${resultSummary}.`;
}

function formatScore(value: number): string {
  const normalized = Number.isFinite(value) ? Math.max(0, value) : 0;
  if (Number.isInteger(normalized)) return String(normalized);
  return normalized.toFixed(2).replace(/\.?0+$/, '');
}

function formatAccuracy(value: number): string {
  const normalized = Number.isFinite(value) ? (value > 1 ? value : value * 100) : 0;
  return `${Math.max(0, Math.min(100, normalized)).toFixed(1)}%`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'n/a';
  const roundedSeconds = Math.max(0, Math.round(seconds));
  if (roundedSeconds < 60) return `${roundedSeconds}s`;
  const minutes = Math.floor(roundedSeconds / 60);
  const remainder = roundedSeconds % 60;
  return `${minutes}m ${remainder}s`;
}
