import type { PhraseSize } from '../core/adaptive/types';
import type { BrowserTtsAdaptiveProfile } from '../inputs/browserTts/browserTtsAdaptiveProfiles';
import type { BrowserTtsDeRecoveryState } from '../inputs/browserTts/browserTtsRecoveryPolicy';
import {
  planBrowserTtsAdaptiveChunk,
  type PlannedBrowserTtsChunk,
  type SupportedLanguage,
} from '../inputs/browserTts/ttsDynamicChunkPlanner';
import type { TtsLiveSignal } from './ttsPlaybackProfile';
import type { BrowserTtsBoundaryStrictness, BrowserTtsChunkPlanner } from './browserTtsPlaybackPlanTypes';

export type SelectBrowserTtsChunkInput = {
  macroWords: string[];
  macroWordOffset: number;
  macroStartWordIndex: number;
  language: SupportedLanguage;
  phraseSize: PhraseSize;
  boundaryStrictness: BrowserTtsBoundaryStrictness;
  germanShortBias: boolean;
  recovery: BrowserTtsDeRecoveryState;
  recoverySafeBoundary: boolean;
  chunkPlanner?: BrowserTtsChunkPlanner;
};

export function shouldUseBrowserTtsRecoverySafeChunks(language: SupportedLanguage, recovery: BrowserTtsDeRecoveryState): boolean {
  return language === 'de' && (recovery.level === 'strong' || recovery.level === 'severe');
}

export function shouldApplyGermanShortBias(liveSignal: TtsLiveSignal, profile: BrowserTtsAdaptiveProfile): boolean {
  return (
    profile.germanShortBias.enabled &&
    (liveSignal.lagSec > profile.germanShortBias.lagSecTrigger ||
      liveSignal.accuracy < profile.germanShortBias.accuracyPercentTrigger)
  );
}

export function selectBrowserTtsCandidateChunk({
  macroWords,
  macroWordOffset,
  macroStartWordIndex,
  language,
  phraseSize,
  boundaryStrictness,
  germanShortBias,
  recovery,
  recoverySafeBoundary,
  chunkPlanner = planBrowserTtsAdaptiveChunk,
}: SelectBrowserTtsChunkInput): PlannedBrowserTtsChunk | null {
  return (
    chunkPlanner({
      macroWords,
      macroWordOffset,
      globalStartWordIndex: macroStartWordIndex,
      language,
      nextPhraseSize: phraseSize,
      boundaryStrictness,
      germanShortBias,
      maxWordsOverride: recovery.shortChunkWordCap,
      recoverySafeBoundary,
    }) ??
    chunkPlanner({
      macroWords,
      macroWordOffset,
      globalStartWordIndex: macroStartWordIndex,
      language,
      nextPhraseSize: 'short',
      boundaryStrictness: 'phrase',
      germanShortBias,
      maxWordsOverride: recovery.shortChunkWordCap,
      recoverySafeBoundary,
    })
  );
}

export type SelectBrowserTtsDecisionChunkInput = SelectBrowserTtsChunkInput & {
  fallbackChunk: PlannedBrowserTtsChunk;
};

export function selectBrowserTtsDecisionChunk({
  fallbackChunk,
  ...input
}: SelectBrowserTtsDecisionChunkInput): PlannedBrowserTtsChunk {
  return selectBrowserTtsCandidateChunk(input) ?? fallbackChunk;
}
