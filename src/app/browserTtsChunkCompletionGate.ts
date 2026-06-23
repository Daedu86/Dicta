import type { Transcript } from '../types/dictation';
import { alignWordPairsGreedyWindow } from '../core/evaluation';
import { normalizeWord } from '../core/normalization';
import type { PlannedBrowserTtsChunk } from '../inputs/browserTts/ttsDynamicChunkPlanner';

type BrowserTtsCompletionGateChunk = Pick<PlannedBrowserTtsChunk, 'startWordIndex' | 'wordCount'>;

export type BrowserTtsChunkCompletionGateInput = {
  typedText: string;
  transcript: Transcript | null;
  chunk: BrowserTtsCompletionGateChunk;
  lookaheadWords?: number;
};

export function isBrowserTtsChunkTypedWithTolerantMatch({
  typedText,
  transcript,
  chunk,
  lookaheadWords,
}: BrowserTtsChunkCompletionGateInput): boolean {
  if (!transcript || chunk.wordCount <= 0 || chunk.startWordIndex < 0) return false;

  const targetWords = transcript.words.map((word) => normalizeWord(word.word));
  const chunkStart = chunk.startWordIndex;
  const chunkEnd = chunkStart + chunk.wordCount;
  if (chunkEnd > targetWords.length) return false;

  const typedWords = typedText
    .split(/\s+/)
    .map((word) => normalizeWord(word))
    .filter(Boolean);
  if (typedWords.length === 0) return false;

  const alignedPairs = alignWordPairsGreedyWindow(typedWords, targetWords, lookaheadWords);
  const matchedChunkTargets = new Set(
    alignedPairs
      .filter((pair) => pair.targetIndex >= chunkStart && pair.targetIndex < chunkEnd)
      .map((pair) => pair.targetIndex),
  );

  return matchedChunkTargets.size === chunk.wordCount;
}
