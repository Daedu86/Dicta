import type { PhraseBoundaryType, PhraseSize } from '../../core/adaptive/types';

export type BoundaryStrictness = 'sentence' | 'clause' | 'phrase';
export type SupportedLanguage = 'en' | 'es' | 'de' | 'fr' | 'pt';

export type PlanBrowserTtsChunkInput = {
  macroWords: string[];
  macroWordOffset: number;
  globalStartWordIndex: number;
  language: SupportedLanguage;
  nextPhraseSize: PhraseSize;
  boundaryStrictness: BoundaryStrictness;
  germanShortBias?: boolean;
  maxWordsOverride?: number;
  recoverySafeBoundary?: boolean;
};

export type PlannedBrowserTtsChunk = {
  text: string;
  startWordIndex: number;
  wordCount: number;
  phraseBoundaryType: PhraseBoundaryType;
  canPauseAfter: boolean;
  canReplayIndependently: boolean;
  semanticCompleteness: number;
  punctuationLoad: number;
  rareWordLoad: number;
  syntaxComplexity: number;
  phraseDifficulty: number;
};
