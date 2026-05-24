export type SessionScoreInput = {
  accuracy: number;
  lagSec: number;
  wpm: number;
  rate: number;
  points: number;
};

export type SessionScoreMetrics = SessionScoreInput & {
  score?: number;
};

export function computeSessionScore({
  accuracy,
  lagSec,
  wpm,
  rate,
  points,
}: SessionScoreInput): number {
  const lagPenalty = Math.abs(lagSec) * 8;
  const accuracyWeight = accuracy * 0.65;
  const paceWeight = Math.min(wpm, 120) * 0.35;
  const pointsWeight = points * 3;
  const rateWeight = Math.abs(rate - 1) < 0.01 ? 4 : 0;
  return Math.max(0, Math.round(pointsWeight + accuracyWeight + paceWeight + rateWeight - lagPenalty));
}

export function buildSessionScoreHelpText(metrics: SessionScoreMetrics): string {
  const pointsWeight = metrics.points * 3;
  const accuracyWeight = metrics.accuracy * 0.65;
  const paceWeight = Math.min(metrics.wpm, 120) * 0.35;
  const rateBonus = Math.abs(metrics.rate - 1) < 0.01 ? 4 : 0;
  const lagPenalty = Math.abs(metrics.lagSec) * 8;
  const finalScore = typeof metrics.score === 'number' && Number.isFinite(metrics.score)
    ? metrics.score
    : computeSessionScore(metrics);

  return [
    'Score is a weighted session score: matched-word points are multiplied by 3, accuracy and WPM add credit, steady 1.0x playback can add a small bonus, and timing lag subtracts points.',
    'Formula: points * 3 + accuracy * 0.65 + min(WPM, 120) * 0.35 + rate bonus - abs(lag) * 8.',
    `Breakdown: points ${formatScorePart(metrics.points)} * 3 = ${formatScorePart(pointsWeight)}; accuracy ${formatScorePart(metrics.accuracy)} * 0.65 = ${formatScorePart(accuracyWeight)}; WPM min(${formatScorePart(metrics.wpm)}, 120) * 0.35 = ${formatScorePart(paceWeight)}; rate bonus = ${formatScorePart(rateBonus)}; lag penalty abs(${formatScorePart(metrics.lagSec)}) * 8 = ${formatScorePart(lagPenalty)}; final score = ${formatScorePart(finalScore)}.`,
  ].join(' ');
}

function formatScorePart(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const normalized = Object.is(value, -0) ? 0 : value;
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(2).replace(/\.?0+$/, '');
}
