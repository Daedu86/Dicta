import type { Transcript } from '../types/dictation';
import { normalizeWord } from './normalization';

export function buildTextTranscript(text: string): Transcript | null {
  const words = text
    .split(/\s+/)
    .map((word, index) => {
      const normalized = normalizeWord(word);
      return normalized ? { word: normalized, start: index, end: index + 1 } : null;
    })
    .filter((word): word is { word: string; start: number; end: number } => Boolean(word));

  return words.length > 0 ? { words } : null;
}
