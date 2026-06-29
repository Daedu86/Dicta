import type { PhraseSize } from '../core/adaptive/types';
import type { SemanticPhrase } from '../core/adaptive/SemanticPhrasePlanner';
import type { TtsPacingMode } from '../types/dictation';
import type { TtsLanguage } from './sessionTypes';
import { buildTtsSourceWords } from './dictationScriptSemanticPhrases';
import { clamp } from './appRuntimeHelpers';
import type { BrowserTtsBoundaryStrictness } from './browserTtsPlaybackPlan';
import {
  buildBrowserTtsPracticeChunks,
  type BrowserTtsPracticeChunkDefinition,
} from './browserTtsPracticeChunks';

export type BrowserTtsPlaybackStartPlanInput = {
  ttsText: string;
  ttsLanguage: TtsLanguage;
  ttsPacingMode: TtsPacingMode;
  startWordIndex: number;
  buildSemanticPhrasesForCurrentSession: (
    ttsText: string,
    ttsLanguage: TtsLanguage,
    ttsPacingMode: TtsPacingMode,
  ) => SemanticPhrase[];
};

export type BrowserTtsPlaybackStartPlan =
  | { ok: false; reason: 'empty-source' }
  | {
      ok: true;
      sourceWords: string[];
      clampedStartWordIndex: number;
      chunkIndex: number;
      macroPhraseIndex: number;
      macroWordOffset: number;
      semanticPhrases: SemanticPhrase[];
      semanticPhraseWords: string[][];
      semanticPhraseStartWordIndices: number[];
      practiceChunks: BrowserTtsPracticeChunkDefinition[];
      lastPhraseSize: PhraseSize;
      lastBoundaryStrictness: BrowserTtsBoundaryStrictness;
    };

export function buildBrowserTtsPlaybackStartPlan({
  ttsText,
  ttsLanguage,
  ttsPacingMode,
  startWordIndex,
  buildSemanticPhrasesForCurrentSession,
}: BrowserTtsPlaybackStartPlanInput): BrowserTtsPlaybackStartPlan {
  const sourceWords = buildTtsSourceWords(ttsText);
  if (sourceWords.length === 0) {
    return { ok: false, reason: 'empty-source' };
  }

  const clampedStartWordIndex = Math.floor(clamp(startWordIndex, 0, Math.max(0, sourceWords.length - 1)));
  const semanticPhrases = buildSemanticPhrasesForCurrentSession(ttsText, ttsLanguage, ttsPacingMode);
  const semanticPhraseWords = semanticPhrases.map((phrase) => buildTtsSourceWords(phrase.text));
  const semanticPhraseStartWordIndices = semanticPhraseWords.reduce<number[]>((acc, _words, index) => {
    const prev = index === 0 ? 0 : acc[index - 1] + (semanticPhraseWords[index - 1]?.length ?? 0);
    acc.push(prev);
    return acc;
  }, []);
  const macroPhraseIndex = semanticPhraseStartWordIndices.reduce((selectedIndex, phraseStartWordIndex, index) => {
    return phraseStartWordIndex <= clampedStartWordIndex ? index : selectedIndex;
  }, 0);
  const practiceChunks = buildBrowserTtsPracticeChunks({
    semanticPhrases,
    semanticPhraseStartWordIndices,
    semanticPhraseWords,
  });
  const macroWordOffset = Math.max(0, clampedStartWordIndex - (semanticPhraseStartWordIndices[macroPhraseIndex] ?? 0));

  return {
    ok: true,
    sourceWords,
    clampedStartWordIndex,
    chunkIndex: clampedStartWordIndex > 0 ? clampedStartWordIndex : 0,
    macroPhraseIndex,
    macroWordOffset,
    semanticPhrases,
    semanticPhraseWords,
    semanticPhraseStartWordIndices,
    practiceChunks,
    lastPhraseSize: 'medium',
    lastBoundaryStrictness: 'sentence',
  };
}
