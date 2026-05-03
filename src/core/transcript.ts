import type { Transcript, WordTiming } from '../types/dictation';

export function parseTranscript(json: string): Transcript {
  const data = JSON.parse(json) as { words?: unknown[] };
  if (!data.words || !Array.isArray(data.words)) {
    throw new Error('Invalid transcript: expected words array.');
  }

  const words: WordTiming[] = data.words.map((entry, i) => {
    const item = entry as Partial<WordTiming>;
    if (typeof item.word !== 'string' || typeof item.start !== 'number' || typeof item.end !== 'number') {
      throw new Error(`Invalid word entry at index ${i}.`);
    }
    return {
      word: item.word,
      start: item.start,
      end: item.end,
    };
  });

  return { words };
}
