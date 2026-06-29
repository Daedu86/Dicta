import type { SemanticPhrase } from '../core/adaptive/SemanticPhrasePlanner';
import type {
  BrowserTtsPracticeChunkResolution,
  BrowserTtsPracticeChunkTelemetry,
} from '../types/dictation';

export type BrowserTtsPracticeChunkDefinition = {
  id: string;
  index: number;
  startWordIndex: number;
  wordCount: number;
  firstSemanticPhraseIndex: number;
  lastSemanticPhraseIndex: number;
  isFinal: boolean;
};

export type BrowserTtsPracticeChunkView = BrowserTtsPracticeChunkDefinition & {
  typedText: string;
  resolution?: BrowserTtsPracticeChunkResolution;
};

export function buildBrowserTtsPracticeChunks({
  semanticPhrases,
  semanticPhraseStartWordIndices,
  semanticPhraseWords,
}: {
  semanticPhrases: SemanticPhrase[];
  semanticPhraseStartWordIndices: number[];
  semanticPhraseWords: string[][];
}): BrowserTtsPracticeChunkDefinition[] {
  const chunks: BrowserTtsPracticeChunkDefinition[] = [];
  let firstSemanticPhraseIndex = 0;

  for (let phraseIndex = 0; phraseIndex < semanticPhrases.length; phraseIndex += 1) {
    const phrase = semanticPhrases[phraseIndex];
    const isLastPhrase = phraseIndex === semanticPhrases.length - 1;
    if (!phrase?.canPauseAfter && !isLastPhrase) continue;

    const startWordIndex = semanticPhraseStartWordIndices[firstSemanticPhraseIndex] ?? 0;
    const wordCount = semanticPhraseWords
      .slice(firstSemanticPhraseIndex, phraseIndex + 1)
      .reduce((sum, words) => sum + words.length, 0);
    const index = chunks.length;

    chunks.push({
      id: `practice-${index}-${startWordIndex}`,
      index,
      startWordIndex,
      wordCount,
      firstSemanticPhraseIndex,
      lastSemanticPhraseIndex: phraseIndex,
      isFinal: isLastPhrase,
    });
    firstSemanticPhraseIndex = phraseIndex + 1;
  }

  return chunks;
}

export function findBrowserTtsPracticeChunkForPhrase(
  chunks: BrowserTtsPracticeChunkDefinition[],
  semanticPhraseIndex: number,
): BrowserTtsPracticeChunkDefinition | null {
  return chunks.find((chunk) =>
    semanticPhraseIndex >= chunk.firstSemanticPhraseIndex &&
    semanticPhraseIndex <= chunk.lastSemanticPhraseIndex) ?? null;
}

export function buildBrowserTtsPracticeChunkTelemetry({
  definition,
  typedText,
  completed,
  resolution,
}: {
  definition: BrowserTtsPracticeChunkDefinition;
  typedText: string;
  completed: BrowserTtsPracticeChunkTelemetry[];
  resolution: BrowserTtsPracticeChunkResolution;
}): BrowserTtsPracticeChunkTelemetry {
  const normalizedTypedText = typedText.trim();
  const typedWordCount = splitTypedWords(normalizedTypedText).length;
  const typedWordStartIndex = completed.reduce((sum, chunk) => sum + chunk.typedWordCount, 0);

  return {
    id: definition.id,
    index: definition.index,
    startWordIndex: definition.startWordIndex,
    wordCount: definition.wordCount,
    typedWordStartIndex,
    typedWordCount,
    typedText: normalizedTypedText,
    resolution,
  };
}

export function composeBrowserTtsPracticeText(
  completed: Pick<BrowserTtsPracticeChunkTelemetry, 'typedText'>[],
  activeDraft = '',
): string {
  return [...completed.map((chunk) => chunk.typedText.trim()), activeDraft.trim()]
    .filter(Boolean)
    .join(' ');
}

export function splitTypedWords(value: string): string[] {
  return value.split(/\s+/).map((word) => word.trim()).filter(Boolean);
}
