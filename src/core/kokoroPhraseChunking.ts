import type { TtsPacingMode } from '../types/dictation';

export type KokoroPhraseChunk = {
  text: string;
  startWordIndex: number;
  wordCount: number;
};

export function buildKokoroSourceWords(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function getKokoroTargetChunkWords(mode: TtsPacingMode, profileChunkWords: number): number {
  if (mode === 'slow') return clamp(Math.round(profileChunkWords - 2), 3, 5);
  if (mode === 'flow') return clamp(Math.round(profileChunkWords + 4), 9, 12);
  return clamp(Math.round(profileChunkWords), 6, 8);
}

export function buildKokoroAdaptiveChunk(
  sourceWords: string[],
  startWordIndex: number,
  mode: TtsPacingMode,
  profileChunkWords: number,
): KokoroPhraseChunk {
  const targetWords = getKokoroTargetChunkWords(mode, profileChunkWords);
  const minWords = Math.max(1, targetWords - 1);
  const maxWords = Math.min(sourceWords.length - startWordIndex, targetWords + 1);
  let wordCount = maxWords;

  for (let offset = minWords; offset <= maxWords; offset += 1) {
    const word = sourceWords[startWordIndex + offset - 1] ?? '';
    if (/[.!?,;:]$/.test(word)) {
      wordCount = offset;
      break;
    }
  }

  return {
    text: sourceWords.slice(startWordIndex, startWordIndex + wordCount).join(' '),
    startWordIndex,
    wordCount,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
