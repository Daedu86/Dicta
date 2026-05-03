export type PhraseSize = 'short' | 'medium' | 'long';
export type KokoroPhraseChunk = {
  text: string;
  startWordIndex: number;
  wordCount: number;
};

export function buildKokoroSourceWords(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

export function buildKokoroPhraseChunks(sourceText: string, targetSize: PhraseSize): KokoroPhraseChunk[] {
  const words = buildKokoroSourceWords(sourceText);
  const chunks: KokoroPhraseChunk[] = [];
  let index = 0;
  const targetWords = phraseSizeToRange(targetSize);

  while (index < words.length) {
    const size = clamp(targetWords.min + Math.floor(Math.random() * (targetWords.max - targetWords.min + 1)), targetWords.min, targetWords.max);
    const endIndex = Math.min(words.length, index + size);
    let wordCount = endIndex - index;

    for (let offset = 0; offset < wordCount; offset += 1) {
      const currentWord = words[index + offset];
      if (/[.!?]$/.test(currentWord) && offset + 1 >= Math.max(2, targetWords.min)) {
        wordCount = offset + 1;
        break;
      }
    }

    chunks.push({
      text: words.slice(index, index + wordCount).join(' '),
      startWordIndex: index,
      wordCount,
    });
    index += wordCount;
  }

  return chunks;
}

function phraseSizeToRange(size: PhraseSize): { min: number; max: number } {
  switch (size) {
    case 'short':
      return { min: 2, max: 4 };
    case 'long':
      return { min: 8, max: 14 };
    default:
      return { min: 4, max: 8 };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
