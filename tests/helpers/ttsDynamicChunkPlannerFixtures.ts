import {
  planBrowserTtsAdaptiveChunk,
  type PlanBrowserTtsChunkInput,
} from '../../src/inputs/browserTts/ttsDynamicChunkPlanner';

type PlanChunkOverrides = Partial<PlanBrowserTtsChunkInput> & {
  text?: string;
};

const DEFAULT_CHUNK_TEXT = 'We listen carefully, then we type the sentence.';

export function splitWords(text: string): string[] {
  return text.split(' ');
}

export function planChunk({ text, ...overrides }: PlanChunkOverrides = {}) {
  return planBrowserTtsAdaptiveChunk({
    macroWords: overrides.macroWords ?? splitWords(text ?? DEFAULT_CHUNK_TEXT),
    macroWordOffset: 0,
    globalStartWordIndex: 0,
    language: 'en',
    nextPhraseSize: 'short',
    boundaryStrictness: 'phrase',
    ...overrides,
  });
}
