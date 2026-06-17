import { describe, expect, it } from 'vitest';

import { planBrowserTtsSurgicalReplay } from '../src/app/browserTtsSurgicalReplayPlan';
import type { PlannedBrowserTtsChunk } from '../src/inputs/browserTts/ttsDynamicChunkPlanner';

function createChunk(overrides: Partial<PlannedBrowserTtsChunk> = {}): PlannedBrowserTtsChunk {
  return {
    text: 'alpha beta gamma',
    startWordIndex: 10,
    wordCount: 3,
    phraseBoundaryType: 'strong',
    canPauseAfter: true,
    canReplayIndependently: true,
    semanticCompleteness: 1,
    punctuationLoad: 0,
    rareWordLoad: 0,
    syntaxComplexity: 0.2,
    phraseDifficulty: 0.2,
    v3Prosody: {
      boundaryStrength: 'strong',
      pauseClass: 'sentence',
      semanticCompletenessClass: 'complete',
      syntacticRisk: 'low',
      edgeWordFlag: false,
      replayStrategy: 'repeat-short',
      breathGroup: {
        startWordIndex: 10,
        endWordIndex: 12,
        wordCount: 3,
        isComplete: true,
      },
    },
    ...overrides,
  };
}

describe('planBrowserTtsSurgicalReplay', () => {
  it('keeps short complete chunks as direct repeat-short replay', () => {
    expect(planBrowserTtsSurgicalReplay({ chunk: createChunk() })).toEqual({
      strategy: 'repeat-short',
      text: 'alpha beta gamma',
      startWordIndex: 10,
      wordCount: 3,
      includesPreroll: false,
      source: 'chunk',
      reasonCodes: ['repeat-short'],
    });
  });

  it('replays only the nucleus for repeat-from-nucleus chunks', () => {
    const replayPlan = planBrowserTtsSurgicalReplay({
      chunk: createChunk({
        text: 'one two three four five six seven',
        wordCount: 7,
        v3Prosody: {
          ...createChunk().v3Prosody!,
          replayStrategy: 'repeat-from-nucleus',
        },
      }),
      nucleusWindowWords: 4,
    });

    expect(replayPlan).toEqual({
      strategy: 'repeat-from-nucleus',
      text: 'four five six seven',
      startWordIndex: 13,
      wordCount: 4,
      includesPreroll: false,
      source: 'chunk-nucleus',
      reasonCodes: ['repeat-from-nucleus'],
    });
  });

  it('adds pre-roll context for fragile repeat-with-preroll chunks', () => {
    const replayPlan = planBrowserTtsSurgicalReplay({
      chunk: createChunk({
        text: 'gamma delta',
        startWordIndex: 12,
        wordCount: 2,
        v3Prosody: {
          ...createChunk().v3Prosody!,
          edgeWordFlag: true,
          replayStrategy: 'repeat-with-preroll',
        },
      }),
      macroWords: ['alpha', 'beta', 'gamma', 'delta', 'epsilon'],
      macroStartWordIndex: 10,
      prerollWords: 2,
    });

    expect(replayPlan).toEqual({
      strategy: 'repeat-with-preroll',
      text: 'alpha beta gamma delta',
      startWordIndex: 10,
      wordCount: 4,
      includesPreroll: true,
      source: 'chunk-with-preroll',
      reasonCodes: ['repeat-with-preroll'],
    });
  });

  it('falls back to the chunk when pre-roll is unavailable', () => {
    const replayPlan = planBrowserTtsSurgicalReplay({
      chunk: createChunk({
        startWordIndex: 10,
        v3Prosody: {
          ...createChunk().v3Prosody!,
          replayStrategy: 'repeat-with-preroll',
        },
      }),
      macroWords: ['alpha', 'beta', 'gamma'],
      macroStartWordIndex: 10,
    });

    expect(replayPlan).toEqual({
      strategy: 'repeat-with-preroll',
      text: 'alpha beta gamma',
      startWordIndex: 10,
      wordCount: 3,
      includesPreroll: false,
      source: 'chunk',
      reasonCodes: ['preroll-unavailable'],
    });
  });
});
