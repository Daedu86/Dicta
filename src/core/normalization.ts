import type { Transcript } from '../types/dictation';

export function normalizeWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .trim();
}

export function normalizeTranscript(transcript: Transcript): Transcript {
  return {
    words: transcript.words
      .map((word) => ({
        ...word,
        word: normalizeWord(word.word),
      }))
      .filter((word) => word.word.length > 0),
  };
}

export function buildTargetWords(transcript: Transcript): string[] {
  return transcript.words.map((w) => w.word);
}
