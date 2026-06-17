import type { PlannedBrowserTtsChunk } from '../inputs/browserTts/ttsDynamicChunkPlanner';
import type { BrowserTtsV3ReplayStrategy } from '../inputs/browserTts/ttsDynamicChunkPlannerTypes';

export type BrowserTtsSurgicalReplayPlan = {
  strategy: BrowserTtsV3ReplayStrategy;
  text: string;
  startWordIndex: number;
  wordCount: number;
  includesPreroll: boolean;
  source: 'chunk' | 'chunk-nucleus' | 'chunk-with-preroll';
  reasonCodes: string[];
};

export type BrowserTtsSurgicalReplayPlanInput = {
  chunk: Pick<PlannedBrowserTtsChunk, 'text' | 'startWordIndex' | 'wordCount' | 'v3Prosody'>;
  macroWords?: string[];
  macroStartWordIndex?: number;
  maxShortReplayWords?: number;
  nucleusWindowWords?: number;
  prerollWords?: number;
};

const DEFAULT_MAX_SHORT_REPLAY_WORDS = 6;
const DEFAULT_NUCLEUS_WINDOW_WORDS = 5;
const DEFAULT_PREROLL_WORDS = 2;

export function planBrowserTtsSurgicalReplay({
  chunk,
  macroWords = [],
  macroStartWordIndex = chunk.startWordIndex,
  maxShortReplayWords = DEFAULT_MAX_SHORT_REPLAY_WORDS,
  nucleusWindowWords = DEFAULT_NUCLEUS_WINDOW_WORDS,
  prerollWords = DEFAULT_PREROLL_WORDS,
}: BrowserTtsSurgicalReplayPlanInput): BrowserTtsSurgicalReplayPlan {
  const chunkWords = splitReplayWords(chunk.text);
  const safeChunkWordCount = Math.max(0, chunk.wordCount || chunkWords.length);
  const replayStrategy = chunk.v3Prosody?.replayStrategy ?? 'repeat-short';

  if (replayStrategy === 'repeat-with-preroll') {
    return planReplayWithPreroll({
      chunk,
      chunkWords,
      macroWords,
      macroStartWordIndex,
      prerollWords,
    });
  }

  if (replayStrategy === 'repeat-from-nucleus' || safeChunkWordCount > maxShortReplayWords) {
    return planReplayFromNucleus({
      chunk,
      chunkWords,
      nucleusWindowWords,
      strategy: replayStrategy,
      forcedByLength: replayStrategy !== 'repeat-from-nucleus',
    });
  }

  return {
    strategy: replayStrategy,
    text: chunk.text,
    startWordIndex: chunk.startWordIndex,
    wordCount: safeChunkWordCount,
    includesPreroll: false,
    source: 'chunk',
    reasonCodes: ['repeat-short'],
  };
}

function planReplayFromNucleus({
  chunk,
  chunkWords,
  nucleusWindowWords,
  strategy,
  forcedByLength,
}: {
  chunk: Pick<PlannedBrowserTtsChunk, 'text' | 'startWordIndex' | 'wordCount'>;
  chunkWords: string[];
  nucleusWindowWords: number;
  strategy: BrowserTtsV3ReplayStrategy;
  forcedByLength: boolean;
}): BrowserTtsSurgicalReplayPlan {
  const windowSize = clampReplayWordCount(nucleusWindowWords, 1, Math.max(1, chunkWords.length));
  const startOffset = Math.max(0, chunkWords.length - windowSize);
  const replayWords = chunkWords.slice(startOffset);

  return {
    strategy,
    text: replayWords.join(' '),
    startWordIndex: chunk.startWordIndex + startOffset,
    wordCount: replayWords.length,
    includesPreroll: false,
    source: 'chunk-nucleus',
    reasonCodes: [forcedByLength ? 'long-chunk-nucleus' : 'repeat-from-nucleus'],
  };
}

function planReplayWithPreroll({
  chunk,
  chunkWords,
  macroWords,
  macroStartWordIndex,
  prerollWords,
}: {
  chunk: Pick<PlannedBrowserTtsChunk, 'text' | 'startWordIndex' | 'wordCount'>;
  chunkWords: string[];
  macroWords: string[];
  macroStartWordIndex: number;
  prerollWords: number;
}): BrowserTtsSurgicalReplayPlan {
  const chunkOffsetInMacro = Math.max(0, chunk.startWordIndex - macroStartWordIndex);
  const availablePrerollWords = macroWords.slice(
    Math.max(0, chunkOffsetInMacro - clampReplayWordCount(prerollWords, 0, 4)),
    chunkOffsetInMacro,
  );
  const replayWords = [...availablePrerollWords, ...chunkWords];

  return {
    strategy: 'repeat-with-preroll',
    text: replayWords.join(' ') || chunk.text,
    startWordIndex: chunk.startWordIndex - availablePrerollWords.length,
    wordCount: replayWords.length || chunk.wordCount,
    includesPreroll: availablePrerollWords.length > 0,
    source: availablePrerollWords.length > 0 ? 'chunk-with-preroll' : 'chunk',
    reasonCodes: [availablePrerollWords.length > 0 ? 'repeat-with-preroll' : 'preroll-unavailable'],
  };
}

function splitReplayWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function clampReplayWordCount(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
