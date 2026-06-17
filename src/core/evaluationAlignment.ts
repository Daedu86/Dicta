export interface WordAlignmentPair {
  typedIndex: number;
  targetIndex: number;
  exact: boolean;
}

export function alignWordPairs(typedWords: string[], targetWords: string[]): WordAlignmentPair[] {
  const rows = typedWords.length;
  const cols = targetWords.length;
  const dp: number[][] = Array.from({ length: rows + 1 }, () => Array(cols + 1).fill(0));

  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = cols - 1; j >= 0; j -= 1) {
      if (wordsMatch(typedWords[i], targetWords[j])) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const pairs: WordAlignmentPair[] = [];
  let i = 0;
  let j = 0;

  while (i < rows && j < cols) {
    if (wordsMatch(typedWords[i], targetWords[j])) {
      pairs.push({ typedIndex: i, targetIndex: j, exact: typedWords[i] === targetWords[j] });
      i += 1;
      j += 1;
      continue;
    }

    if (dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }

  return pairs;
}

function wordsMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  return levenshteinDistanceAtMostOne(a, b);
}

function levenshteinDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  const aLen = a.length;
  const bLen = b.length;
  if (Math.abs(aLen - bLen) > 1) return false;

  let i = 0;
  let j = 0;
  let edits = 0;

  while (i < aLen && j < bLen) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) {
      return false;
    }

    if (aLen > bLen) {
      i += 1;
    } else if (bLen > aLen) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }

  if (i < aLen || j < bLen) {
    edits += 1;
  }

  return edits <= 1;
}
