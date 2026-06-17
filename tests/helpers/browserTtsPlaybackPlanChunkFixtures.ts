import type { PlannedBrowserTtsChunk } from '../../src/inputs/browserTts/ttsDynamicChunkPlanner';

export function chunk(overrides: Partial<PlannedBrowserTtsChunk> = {}): PlannedBrowserTtsChunk {
  const text = overrides.text ?? 'We listen carefully.';
  const wordCount = overrides.wordCount ?? text.split(/\s+/).length;

  return {
    text,
    startWordIndex: overrides.startWordIndex ?? 0,
    wordCount,
    phraseBoundaryType: overrides.phraseBoundaryType ?? 'sentence',
    canPauseAfter: overrides.canPauseAfter ?? true,
    canReplayIndependently: false,
    semanticCompleteness: overrides.semanticCompleteness ?? 1,
    punctuationLoad: overrides.punctuationLoad ?? 0.1,
    rareWordLoad: overrides.rareWordLoad ?? 0,
    syntaxComplexity: overrides.syntaxComplexity ?? 0.1,
    phraseDifficulty: overrides.phraseDifficulty ?? 0.2,
  };
}
