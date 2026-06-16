import { computeSessionMaxPoints, formatSessionPointsLabel } from '../evaluation';
import type { AdaptiveReportSession, AdaptiveUserSystemReport } from './adaptiveUserSystemReportTypes';

export function summarizeLatestSession(session: AdaptiveReportSession): AdaptiveUserSystemReport['userProgressSummary']['latestSession'] {
  const maxPoints = computeSessionMaxPoints(session);
  const pointsLabel = formatSessionPointsLabel(session.metrics.points, maxPoints);
  return {
    id: session.id,
    name: session.name,
    status: session.status,
    difficulty: session.difficulty ?? session.dictationScript?.difficulty ?? null,
    inputMode: session.inputModeLabel ?? session.inputMode ?? null,
    language: session.language ?? null,
    score: session.metrics.score,
    points: pointsLabel,
    accuracy: `${normalizePercent(session.metrics.accuracy).toFixed(1)}%`,
    wpm: session.metrics.wpm.toFixed(1),
    lag: `${session.metrics.lagSec.toFixed(2)}s`,
    duration: session.durationLabel ?? null,
    updatedAt: session.updatedAt ?? null,
    finishedAt: session.telemetry?.finishedAt ?? null,
    trend: session.metrics.trend ?? null,
    repeatCount: typeof session.telemetry?.repeatCount === 'number' ? session.telemetry.repeatCount : null,
  };
}


export function buildHowYouDid(session: AdaptiveUserSystemReport['userProgressSummary']['latestSession']): string {
  if (!session) {
    return 'No finished session is available for this selected input/language yet, so the learner summary is based on benchmark data only.';
  }
  return `${session.name} finished with ${session.accuracy} accuracy, ${session.points} points, ${session.wpm} WPM, ${session.lag} lag, and score ${session.score}.`;
}


export function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value <= 1 ? value * 100 : value;
}


export function parsePointsRatio(pointsLabel: string): number | null {
  const [earnedText, totalText] = pointsLabel.split('/');
  const earned = Number(earnedText);
  const total = Number(totalText);
  if (!Number.isFinite(earned) || !Number.isFinite(total) || total <= 0) return null;
  return earned / total;
}

