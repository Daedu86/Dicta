import { describe, expect, it } from 'vitest';
import {
  buildBrowserTtsPracticeChunkTelemetry,
  buildBrowserTtsPracticeChunks,
  composeBrowserTtsPracticeText,
  findBrowserTtsPracticeChunkForPhrase,
} from '../src/app/browserTtsPracticeChunks';
import type { SemanticPhrase } from '../src/core/adaptive/SemanticPhrasePlanner';

function semanticPhrase(
  text: string,
  index: number,
  overrides: Partial<SemanticPhrase> = {},
): SemanticPhrase {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return {
    id: `semantic-${index}`,
    text,
    language: 'de',
    boundaryType: overrides.canPauseAfter === false ? 'unsafe' : 'clause',
    canPauseAfter: true,
    canReplayIndependently: true,
    semanticCompleteness: 0.8,
    difficulty: 0.2,
    wordCount,
    charCount: text.length,
    punctuationLoad: 0,
    rareWordLoad: 0,
    syntaxComplexity: 0.1,
    ...overrides,
  };
}

describe('browser TTS practice chunks', () => {
  it('merges unsafe planner phrases into the next safe learner-facing chunk', () => {
    const semanticPhrases = [
      semanticPhrase('Der feine Sand', 0, { canPauseAfter: false, canReplayIndependently: false, boundaryType: 'unsafe' }),
      semanticPhrase('glitzert im Morgenlicht,', 1, { canPauseAfter: true, boundaryType: 'clause' }),
      semanticPhrase('und lädt zum Barfußlaufen ein.', 2, { canPauseAfter: true, boundaryType: 'sentence' }),
    ];

    const chunks = buildBrowserTtsPracticeChunks({
      semanticPhrases,
      semanticPhraseStartWordIndices: [0, 3, 6],
      semanticPhraseWords: [
        ['Der', 'feine', 'Sand'],
        ['glitzert', 'im', 'Morgenlicht'],
        ['und', 'lädt', 'zum', 'Barfußlaufen', 'ein'],
      ],
    });

    expect(chunks).toEqual([
      expect.objectContaining({
        index: 0,
        startWordIndex: 0,
        wordCount: 6,
        firstSemanticPhraseIndex: 0,
        lastSemanticPhraseIndex: 1,
        isFinal: false,
      }),
      expect.objectContaining({
        index: 1,
        startWordIndex: 6,
        wordCount: 5,
        firstSemanticPhraseIndex: 2,
        lastSemanticPhraseIndex: 2,
        isFinal: true,
      }),
    ]);
    expect(findBrowserTtsPracticeChunkForPhrase(chunks, 0)?.index).toBe(0);
    expect(findBrowserTtsPracticeChunkForPhrase(chunks, 1)?.index).toBe(0);
    expect(findBrowserTtsPracticeChunkForPhrase(chunks, 2)?.index).toBe(1);
  });

  it('records typed ranges and composes the cumulative practice text from completed plus active drafts', () => {
    const completed = [
      buildBrowserTtsPracticeChunkTelemetry({
        definition: {
          id: 'practice-0-0',
          index: 0,
          startWordIndex: 0,
          wordCount: 3,
          firstSemanticPhraseIndex: 0,
          lastSemanticPhraseIndex: 0,
          isFinal: false,
        },
        typedText: '  Der Sand  ',
        completed: [],
        resolution: 'submitted',
      }),
    ];

    const skipped = buildBrowserTtsPracticeChunkTelemetry({
      definition: {
        id: 'practice-1-3',
        index: 1,
        startWordIndex: 3,
        wordCount: 2,
        firstSemanticPhraseIndex: 1,
        lastSemanticPhraseIndex: 1,
        isFinal: true,
      },
      typedText: '   ',
      completed,
      resolution: 'skipped',
    });

    expect(completed[0]).toMatchObject({
      typedWordStartIndex: 0,
      typedWordCount: 2,
      typedText: 'Der Sand',
      resolution: 'submitted',
    });
    expect(skipped).toMatchObject({
      typedWordStartIndex: 2,
      typedWordCount: 0,
      typedText: '',
      resolution: 'skipped',
    });
    expect(composeBrowserTtsPracticeText([...completed, skipped], '  glitzert  ')).toBe('Der Sand glitzert');
  });
});
