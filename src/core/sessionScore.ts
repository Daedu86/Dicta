import type { ListeningPrecisionMetrics } from './adaptive/listeningPrecisionMetrics';

export type SessionScoreInput = {
  accuracy: number;
  lagSec: number;
  wpm: number;
  rate: number;
  points: number;
  listeningPrecision?: ListeningPrecisionMetrics;
};

export type SessionScoreMetrics = SessionScoreInput & {
  score?: number;
};

export function computeSessionScore({
  accuracy,
  lagSec,
  rate,
  points,
  listeningPrecision,
}: SessionScoreInput): number {
  const lagPenalty = Math.abs(lagSec) * 8;
  const accuracyPercent = normalizePercent(accuracy);
  const precisionPercent = resolvePrecisionPercent(listeningPrecision, accuracyPercent);
  const pointsWeight = points * 3;
  const precisionWeight = precisionPercent * 0.85;
  const accuracyWeight = accuracyPercent * 0.25;
  const rateWeight = Math.abs(rate - 1) < 0.01 ? 4 : 0;
  return Math.max(0, Math.round(pointsWeight + precisionWeight + accuracyWeight + rateWeight - lagPenalty));
}

export function buildSessionScoreHelpText(metrics: SessionScoreMetrics): string {
  const pointsWeight = metrics.points * 3;
  const accuracyPercent = normalizePercent(metrics.accuracy);
  const precisionPercent = resolvePrecisionPercent(metrics.listeningPrecision, accuracyPercent);
  const precisionWeight = precisionPercent * 0.85;
  const accuracyWeight = accuracyPercent * 0.25;
  const diagnosticWpm = Math.min(metrics.wpm, 120);
  const rateBonus = Math.abs(metrics.rate - 1) < 0.01 ? 4 : 0;
  const lagPenalty = Math.abs(metrics.lagSec) * 8;
  const finalScore = typeof metrics.score === 'number' && Number.isFinite(metrics.score)
    ? metrics.score
    : computeSessionScore(metrics);

  return [
    'Score is listening-first: matched-word points, listening precision, and completion-window timing drive the score; accuracy adds supporting signal and timing lag subtracts points.',
    'WPM is shown as a diagnostic signal only.',
    'Formula: points * 3 + listening precision * 0.85 + accuracy * 0.25 + rate bonus - abs(lag) * 8.',
    `Breakdown: points ${formatScorePart(metrics.points)} * 3 = ${formatScorePart(pointsWeight)}; listening precision ${formatScorePart(precisionPercent)} * 0.85 = ${formatScorePart(precisionWeight)}; accuracy ${formatScorePart(accuracyPercent)} * 0.25 = ${formatScorePart(accuracyWeight)}; diagnostic WPM min(${formatScorePart(metrics.wpm)}, 120) = ${formatScorePart(diagnosticWpm)}; rate bonus = ${formatScorePart(rateBonus)}; lag penalty abs(${formatScorePart(metrics.lagSec)}) * 8 = ${formatScorePart(lagPenalty)}; final score = ${formatScorePart(finalScore)}.`,
  ].join(' ');
}

function resolvePrecisionPercent(
  listeningPrecision: ListeningPrecisionMetrics | undefined,
  fallbackAccuracyPercent: number,
): number {
  if (!listeningPrecision) return fallbackAccuracyPercent;
  const precisionScore =
    listeningPrecision.listeningRecallScore * 0.28 +
    listeningPrecision.contentWordRecall * 0.23 +
    listeningPrecision.detailPrecisionScore * 0.14 +
    listeningPrecision.functionWordAccuracy * 0.14 +
    listeningPrecision.wordOrderAccuracy * 0.09 +
    listeningPrecision.completionWindowScore * 0.12;
  return clampPercent(precisionScore * 100);
}

function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return clampPercent(value <= 1 ? value * 100 : value);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function formatScorePart(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const normalized = Object.is(value, -0) ? 0 : value;
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(2).replace(/\.?0+$/, '');
}
