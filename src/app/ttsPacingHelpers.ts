import type { TtsPacingMode } from '../types/dictation';
import type { PacingMode, PhraseSize } from '../core/adaptive/types';
import { planSemanticPhrases, type SemanticPhrase } from '../core/adaptive/SemanticPhrasePlanner';

export function mapAdaptivePacingMode(mode: PacingMode): TtsPacingMode {
  if (mode === 'support' || mode === 'recovery') return 'slow';
  if (mode === 'flow') return 'flow';
  return 'balanced';
}

export function formatTtsPacingMode(mode: TtsPacingMode): string {
  if (mode === 'slow') return 'Slow phrase pacing';
  if (mode === 'flow') return 'Flow pacing';
  return 'Balanced phrase pacing';
}

function phraseSizeForTtsMode(mode: TtsPacingMode): PhraseSize {
  if (mode === 'slow') return 'short';
  if (mode === 'flow') return 'long';
  return 'medium';
}

export function semanticPhraseIndexForWordIndex(phrases: SemanticPhrase[], wordIndex: number): number {
  let cursor = 0;
  for (let index = 0; index < phrases.length; index += 1) {
    const nextCursor = cursor + phrases[index].wordCount;
    if (wordIndex < nextCursor) return index;
    cursor = nextCursor;
  }
  return phrases.length;
}

export function buildOrderedSemanticPhrases(text: string, language: string | undefined, mode: TtsPacingMode): SemanticPhrase[] {
  return planSemanticPhrases(text, language, phraseSizeForTtsMode(mode));
}
