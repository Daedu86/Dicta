import type { PhraseBoundaryType } from './types';

export interface SemanticPhrase {
  id: string;
  text: string;
  language?: string;
  boundaryType: PhraseBoundaryType;
  canPauseAfter: boolean;
  canReplayIndependently: boolean;
  semanticCompleteness: number;
  difficulty: number;
  wordCount: number;
  charCount: number;
  punctuationLoad: number;
  rareWordLoad: number;
  syntaxComplexity: number;
}

export interface SemanticPhrasePlaybackState {
  currentPhraseIndex: number;
  phraseAdvanceCount: number;
  phraseReplayCount: number;
  lastPhraseAdvanceReason: string;
}

export type PlannerLanguage = 'en' | 'es' | 'de' | 'fr' | 'pt';
