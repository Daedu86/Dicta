import type { PacingDecision } from '../core/adaptive/types';
import type { PlannedBrowserTtsChunk } from '../inputs/browserTts/ttsDynamicChunkPlanner';
import {
  selectBrowserTtsCandidateChunk,
  selectBrowserTtsDecisionChunk,
  shouldApplyGermanShortBias,
  shouldUseBrowserTtsRecoverySafeChunks,
} from './browserTtsPlaybackPlanChunkSelection';
import type { BrowserTtsPlaybackPlanInput } from './browserTtsPlaybackPlanTypes';

export { shouldApplyGermanShortBias, shouldUseBrowserTtsRecoverySafeChunks };

export function planBrowserTtsPlaybackCandidateChunk(
  input: BrowserTtsPlaybackPlanInput,
  germanShortBias: boolean,
  recoverySafeBoundary: boolean,
): PlannedBrowserTtsChunk | null {
  return selectBrowserTtsCandidateChunk({
    macroWords: input.macroWords,
    macroWordOffset: input.macroWordOffset,
    macroStartWordIndex: input.macroStartWordIndex,
    language: input.language,
    phraseSize: input.lastPhraseSize,
    boundaryStrictness: input.lastBoundaryStrictness,
    germanShortBias,
    recovery: input.browserTtsRecovery,
    recoverySafeBoundary,
    chunkPlanner: input.chunkPlanner,
  });
}

export function planBrowserTtsPlaybackDecisionChunk({
  input,
  decision,
  germanShortBias,
  recoverySafeBoundary,
  fallbackChunk,
}: {
  input: BrowserTtsPlaybackPlanInput;
  decision: PacingDecision;
  germanShortBias: boolean;
  recoverySafeBoundary: boolean;
  fallbackChunk: PlannedBrowserTtsChunk;
}): PlannedBrowserTtsChunk {
  return selectBrowserTtsDecisionChunk({
    macroWords: input.macroWords,
    macroWordOffset: input.macroWordOffset,
    macroStartWordIndex: input.macroStartWordIndex,
    language: input.language,
    phraseSize: decision.nextPhraseSize,
    boundaryStrictness: decision.boundaryStrictness,
    germanShortBias,
    recovery: input.browserTtsRecovery,
    recoverySafeBoundary,
    chunkPlanner: input.chunkPlanner,
    fallbackChunk,
  });
}
