import type { InputLanguageBenchmarkRecommendation } from './types';

type BenchmarkPhraseSize = InputLanguageBenchmarkRecommendation['targetPhraseSize'];

export function clampPhraseSizeAtMost(value: BenchmarkPhraseSize, maximum: BenchmarkPhraseSize): BenchmarkPhraseSize {
  return comparePhraseSize(value, maximum) <= 0 ? value : maximum;
}

export function movePhraseSizeBySteps(
  anchor: BenchmarkPhraseSize,
  desired: BenchmarkPhraseSize,
  maxSteps: number,
): BenchmarkPhraseSize {
  const anchorRank = phraseSizeRank(anchor);
  const desiredRank = phraseSizeRank(desired);
  const delta = Math.max(-maxSteps, Math.min(maxSteps, desiredRank - anchorRank));
  return phraseSizeFromRank(anchorRank + delta);
}

function comparePhraseSize(left: BenchmarkPhraseSize, right: BenchmarkPhraseSize): number {
  return phraseSizeRank(left) - phraseSizeRank(right);
}

function phraseSizeRank(size: BenchmarkPhraseSize): number {
  switch (size) {
    case 'short':
      return 0;
    case 'medium':
      return 1;
    case 'long':
      return 2;
  }
}

function phraseSizeFromRank(rank: number): BenchmarkPhraseSize {
  if (rank <= 0) return 'short';
  if (rank === 1) return 'medium';
  return 'long';
}
