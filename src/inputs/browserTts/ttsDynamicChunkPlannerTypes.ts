import type { PhraseBoundaryType, PhraseSize } from '../../core/adaptive/types';

export type BoundaryStrictness = 'sentence' | 'clause' | 'phrase';
export type SupportedLanguage = 'en' | 'es' | 'de' | 'fr' | 'pt';

export type BrowserTtsV3PauseClass = 'none' | 'micro' | 'boundary' | 'sentence' | 'recovery';
export type BrowserTtsV3SemanticCompletenessClass = 'complete' | 'stable-clause' | 'partial' | 'fragile';
export type BrowserTtsV3SyntacticRisk = 'low' | 'medium' | 'high';
export type BrowserTtsV3ReplayStrategy = 'repeat-short' | 'repeat-from-nucleus' | 'repeat-with-preroll';

export type BrowserTtsV3BreathGroup = {
  startWordIndex: number;
  endWordIndex: number;
  wordCount: number;
  isComplete: boolean;
};

export type BrowserTtsV3ProsodyMetadata = {
  boundaryStrength: PhraseBoundaryType;
  pauseClass: BrowserTtsV3PauseClass;
  semanticCompletenessClass: BrowserTtsV3SemanticCompletenessClass;
  syntacticRisk: BrowserTtsV3SyntacticRisk;
  edgeWordRisk: boolean;
  replayStrategy: BrowserTtsV3ReplayStrategy;
  breathGroup: BrowserTtsV3BreathGroup;
};

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
  v3Prosody?: BrowserTtsV3ProsodyMetadata;
};