import { resolveSessionLanguage, type SessionLanguageLike } from './liveMetrics';

type TrainingSubmitSession = SessionLanguageLike & {
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
    `Points ${formatPoints(submittedSession.metrics.points)}`,
    `Duration ${formatTelemetryDuration(submittedSession.telemetry)}`,
  ].join(', ');

  if (rank <= 0) {
    return `Submitted to leaderboard (${languageLabel}). ${resultSummary}.`;
  }
  return `Submitted to leaderboard. Position #${rank} (${languageLabel}). ${resultSummary}.`;
}

function formatScore(value: number): string {
  const normalized = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  return `${Math.round(normalized * 100)}%`;
}

function formatAccuracy(value: number): string {
  const normalized = Number.isFinite(value) ? (value > 1 ? value : value * 100) : 0;
  return `${Math.max(0, Math.min(100, normalized)).toFixed(1)}%`;
}

function formatPoints(value: number): string {
  return String(Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0);
}

function formatTelemetryDuration(telemetry: TrainingSubmitSession['telemetry']): string {
  const started = telemetry?.startedAt ? Date.parse(telemetry.startedAt) : Number.NaN;
  const finished = telemetry?.finishedAt ? Date.parse(telemetry.finishedAt) : Number.NaN;
  if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) return 'n/a';
  const seconds = Math.max(0, Math.round((finished - started) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}
