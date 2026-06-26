import { alignWordPairs } from '../core/evaluation';
import { normalizeWord } from '../core/normalization';

type WordToken = {
  partIndex: number;
  text: string;
  normalized: string;
};

type TokenPunctuation = {
  prefix: string;
  core: string;
  suffix: string;
};

export type CompletedChunkPunctuationInput = {
  targetText: string;
  typedText: string;
  completedWordCount: number;
};

export function applyCompletedChunkPunctuation({
  targetText,
  typedText,
  completedWordCount,
}: CompletedChunkPunctuationInput): string {
  const boundedCompletedWordCount = Math.max(0, Math.floor(completedWordCount));
  if (!targetText.trim() || !typedText.trim() || boundedCompletedWordCount <= 0) return typedText;

  const targetWords = buildTargetWordTokens(targetText);
  const typedParts = typedText.match(/\s+|\S+/g) ?? [];
  const typedWords = buildTypedWordTokens(typedParts);
  if (targetWords.length === 0 || typedWords.length === 0) return typedText;

  const alignedPairs = alignWordPairs(
    typedWords.map((word) => word.normalized),
    targetWords.map((word) => word.normalized),
  );
  if (alignedPairs.length === 0) return typedText;

  const nextParts = [...typedParts];
  for (const pair of alignedPairs) {
    if (pair.targetIndex >= boundedCompletedWordCount) continue;

    const typedWord = typedWords[pair.typedIndex];
    const targetWord = targetWords[pair.targetIndex];
    if (!typedWord || !targetWord) continue;

    nextParts[typedWord.partIndex] = applyTargetPunctuation(typedWord.text, targetWord.text);
  }

  return nextParts.join('');
}

function buildTargetWordTokens(text: string): WordToken[] {
  return text
    .split(/\s+/)
    .map((part, index) => buildWordToken(part, index))
    .filter((word): word is WordToken => Boolean(word));
}

function buildTypedWordTokens(parts: string[]): WordToken[] {
  return parts
    .map((part, index) => (/^\s+$/.test(part) ? null : buildWordToken(part, index)))
    .filter((word): word is WordToken => Boolean(word));
}

function buildWordToken(text: string, partIndex: number): WordToken | null {
  const normalized = normalizeWord(text);
  return normalized ? { partIndex, text, normalized } : null;
}

function applyTargetPunctuation(typedToken: string, targetToken: string): string {
  const typed = splitTokenPunctuation(typedToken);
  const target = splitTokenPunctuation(targetToken);
  return `${target.prefix}${typed.core}${target.suffix}`;
}

function splitTokenPunctuation(token: string): TokenPunctuation {
  const chars = Array.from(token);
  const firstWordCharIndex = chars.findIndex(isWordChar);
  if (firstWordCharIndex < 0) {
    return { prefix: '', core: token, suffix: '' };
  }

  let lastWordCharIndex = chars.length - 1;
  while (lastWordCharIndex > firstWordCharIndex && !isWordChar(chars[lastWordCharIndex])) {
    lastWordCharIndex -= 1;
  }

  return {
    prefix: chars.slice(0, firstWordCharIndex).join(''),
    core: chars.slice(firstWordCharIndex, lastWordCharIndex + 1).join(''),
    suffix: chars.slice(lastWordCharIndex + 1).join(''),
  };
}

function isWordChar(char: string): boolean {
  return /[\p{L}\p{N}']/u.test(char);
}
