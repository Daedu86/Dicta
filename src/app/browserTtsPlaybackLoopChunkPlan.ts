import type { PhraseSize } from '../core/adaptive/types';
import {
  buildBrowserTtsPlaybackPlan,
  type BrowserTtsBoundaryStrictness,
} from './browserTtsPlaybackPlan';
import { buildBrowserTtsPlaybackRuntimeSnapshot } from './browserTtsPlaybackLoopRuntimeSnapshot';
import type { BrowserTtsPlaybackLoopOptions } from './browserTtsPlaybackLoopTypes';

export type BrowserTtsPlaybackLoopChunkPlanInput = Pick<
  BrowserTtsPlaybackLoopOptions,
  | 'ttsLanguage'
  | 'ttsTranscript'
  | 'ttsLiveSignalRef'
  | 'ttsPracticeLiveTextRef'
  | 'getHistoricalPerformanceProfile'
  | 'getBenchmarkSnapshot'
  | 'ttsSpeechRate'
  | 'ttsPlaybackProfile'
  | 'getAdaptiveController'
  | 'estimateTtsSpokenWordIndex'
> & {
  macroWords: string[];
  macroWordOffset: number;
  macroStartWordIndex: number;
  lastPhraseSize: PhraseSize;
  lastBoundaryStrictness: BrowserTtsBoundaryStrictness;
  sourceWordCount: number;
  chunkIndex: number;
  unsafeChunkCount: number;
  accuracyWindow: number[];
  lastAccuracySnapshot: BrowserTtsPlaybackLoopOptions['ttsLastAccuracySnapshotRef']['current'];
};

export function buildBrowserTtsPlaybackLoopChunkPlan({
  ttsLanguage,
  ttsTranscript,
  ttsLiveSignalRef,
  ttsPracticeLiveTextRef,
  getHistoricalPerformanceProfile,
  getBenchmarkSnapshot,
  ttsSpeechRate,
  ttsPlaybackProfile,
  getAdaptiveController,
  estimateTtsSpokenWordIndex,
  macroWords,
  macroWordOffset,
  macroStartWordIndex,
  lastPhraseSize,
  lastBoundaryStrictness,
  sourceWordCount,
  chunkIndex,
  unsafeChunkCount,
  accuracyWindow,
  lastAccuracySnapshot,
}: BrowserTtsPlaybackLoopChunkPlanInput) {
  const {
    historyProfile,
    liveSignal,
    livePracticeEvaluation,
    browserTtsProfile,
    browserTtsBenchmark,
    navigatorInfo,
    browserTtsRecovery,
  } = buildBrowserTtsPlaybackRuntimeSnapshot({
    ttsLanguage,
    ttsTranscript,
    ttsLiveSignalRef,
    ttsPracticeLiveTextRef,
    getHistoricalPerformanceProfile,
    getBenchmarkSnapshot,
  });

  return buildBrowserTtsPlaybackPlan({
    macroWords,
    macroWordOffset,
    macroStartWordIndex,
    language: ttsLanguage,
    lastPhraseSize,
    lastBoundaryStrictness,
    liveSignal,
    livePracticeEvaluation,
    browserTtsProfile,
    browserTtsBenchmark,
    browserTtsRecovery,
    ttsSpeechRate,
    ttsPlaybackPauseMs: ttsPlaybackProfile.pauseMs,
    adaptiveController: getAdaptiveController('browser-tts', ttsLanguage),
    historyProfile,
    sourceWordCount,
    estimatedSpokenWordIndex: estimateTtsSpokenWordIndex(),
    chunkIndex,
    unsafeChunkCount,
    accuracyWindow,
    lastAccuracySnapshot,
    navigatorInfo,
  });
}
