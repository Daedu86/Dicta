import { clamp } from './appRuntimeHelpers';
import type { PlannedBrowserTtsChunk } from '../inputs/browserTts/ttsDynamicChunkPlanner';
import type { SemanticPhrase } from '../core/adaptive/SemanticPhrasePlanner';

export type BrowserTtsAdaptiveSemanticDebugState = {
  semanticCutPenalty: number;
  unsafePauseCount: number;
  safePauseCount: number;
  deferredPauseCount: number;
  replayDeniedByBoundaryCount: number;
  averageSemanticCompleteness: number;
  averagePhraseDifficulty: number;
  inputExecutionFidelityScore: number;
  currentPhraseIndex: number;
  currentPhraseId: string;
  currentPhraseTextPreview: string;
  totalSemanticPhrases: number;
  phraseAdvanceCount: number;
  phraseReplayCount: number;
  lastPhraseAdvanceReason: string;
};

export type BuildBrowserTtsPhraseStartDebugUpdateInput = {
  current: BrowserTtsAdaptiveSemanticDebugState;
  semanticCompleteness: number;
  chunk: PlannedBrowserTtsChunk;
  shouldPauseNow: boolean;
  pauseAtBoundary: boolean;
  effectivePauseNow: boolean;
  deferPauseUntilSafeBoundary: boolean;
  shouldReplayPhrase: boolean;
  effectiveReplay: boolean;
  macroPhraseIndex: number;
  semanticPhrase: SemanticPhrase | undefined;
  totalSemanticPhrases: number;
  phraseAdvanceCount: number;
  phraseReplayCount: number;
};

export type BuildBrowserTtsChunkCompletionDebugUpdateInput = {
  current: BrowserTtsAdaptiveSemanticDebugState;
  macroPhraseIndex: number;
  semanticPhrases: SemanticPhrase[];
  phraseAdvanceCount: number;
  phraseReplayCount: number;
};

export function buildBrowserTtsPhraseStartDebugUpdate({
  current,
  semanticCompleteness,
  chunk,
  shouldPauseNow,
  pauseAtBoundary,
  effectivePauseNow,
  deferPauseUntilSafeBoundary,
  shouldReplayPhrase,
  effectiveReplay,
  macroPhraseIndex,
  semanticPhrase,
  totalSemanticPhrases,
  phraseAdvanceCount,
  phraseReplayCount,
}: BuildBrowserTtsPhraseStartDebugUpdateInput): BrowserTtsAdaptiveSemanticDebugState {
  const phraseCount = current.safePauseCount + current.unsafePauseCount + current.deferredPauseCount + 1;
  const avgCompleteness = ((current.averageSemanticCompleteness * (phraseCount - 1)) + semanticCompleteness) / phraseCount;
  const difficulty = chunk.phraseDifficulty ?? 0.5;
  const avgDifficulty = ((current.averagePhraseDifficulty * (phraseCount - 1)) + difficulty) / phraseCount;
  const unsafePauseCount = current.unsafePauseCount + (shouldPauseNow && !pauseAtBoundary ? 1 : 0);
  const safePauseCount = current.safePauseCount + (effectivePauseNow ? 1 : 0);
  const deferredPauseCount = current.deferredPauseCount + (deferPauseUntilSafeBoundary ? 1 : 0);
  const replayDeniedByBoundaryCount = current.replayDeniedByBoundaryCount + (shouldReplayPhrase && !effectiveReplay ? 1 : 0);
  const semanticCutPenalty = unsafePauseCount + replayDeniedByBoundaryCount * 0.5 + deferredPauseCount * 0.35;
  const fidelityRaw = 1 - semanticCutPenalty / Math.max(1, phraseCount * 1.5);

  return {
    ...current,
    semanticCutPenalty: Number(semanticCutPenalty.toFixed(2)),
    unsafePauseCount,
    safePauseCount,
    deferredPauseCount,
    replayDeniedByBoundaryCount,
    averageSemanticCompleteness: Number(avgCompleteness.toFixed(3)),
    averagePhraseDifficulty: Number(avgDifficulty.toFixed(3)),
    inputExecutionFidelityScore: Number(clamp(fidelityRaw, 0, 1).toFixed(3)),
    currentPhraseIndex: macroPhraseIndex,
    currentPhraseId: semanticPhrase?.id ?? `phrase-${macroPhraseIndex}`,
    currentPhraseTextPreview: chunk.text.slice(0, 80),
    totalSemanticPhrases,
    phraseAdvanceCount,
    phraseReplayCount,
    lastPhraseAdvanceReason: 'phrase_start',
  };
}

export function buildBrowserTtsChunkCompletionDebugUpdate({
  current,
  macroPhraseIndex,
  semanticPhrases,
  phraseAdvanceCount,
  phraseReplayCount,
}: BuildBrowserTtsChunkCompletionDebugUpdateInput): BrowserTtsAdaptiveSemanticDebugState {
  return {
    ...current,
    currentPhraseIndex: macroPhraseIndex,
    currentPhraseId: semanticPhrases[macroPhraseIndex]?.id ?? 'complete',
    currentPhraseTextPreview: semanticPhrases[macroPhraseIndex]?.text.slice(0, 80) ?? '',
    totalSemanticPhrases: semanticPhrases.length,
    phraseAdvanceCount,
    phraseReplayCount,
    lastPhraseAdvanceReason: 'chunk_complete',
  };
}
