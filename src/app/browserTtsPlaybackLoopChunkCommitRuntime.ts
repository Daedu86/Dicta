import { commitBrowserTtsPlaybackLoopChunk } from './browserTtsPlaybackLoopChunkCommit';
import type { BrowserTtsPlaybackPlan } from './browserTtsPlaybackPlanTypes';
import type { SpeakBrowserTtsPlaybackLoopChunkInput } from './browserTtsPlaybackLoopChunkSpeakerTypes';

export function commitBrowserTtsPlaybackLoopRuntimeChunk(
  input: SpeakBrowserTtsPlaybackLoopChunkInput,
  playbackPlan: BrowserTtsPlaybackPlan,
): void {
  commitBrowserTtsPlaybackLoopChunk({
    playbackPlan,
    macroPhraseIndex: input.runnerState.macroPhrase.macroPhraseIndex,
    semanticPhrase: input.runnerState.macroPhrase.semanticPhrase,
    semanticPhraseCount: input.runnerState.macroPhrase.semanticPhrases.length,
    browserTtsEnvironment: input.playbackRuntime.browserTtsEnvironment,
    ttsCompletedSourceWordsRef: input.progressContext.ttsCompletedSourceWordsRef,
    ttsChunkStartMsRef: input.progressContext.ttsChunkStartMsRef,
    ttsChunkStartWordIndexRef: input.progressContext.ttsChunkStartWordIndexRef,
    ttsChunkWordCountRef: input.progressContext.ttsChunkWordCountRef,
    ttsChunkAccuracyWindowRef: input.adaptiveContext.ttsChunkAccuracyWindowRef,
    ttsLastAccuracySnapshotRef: input.adaptiveContext.ttsLastAccuracySnapshotRef,
    ttsUnsafeChunkCountRef: input.adaptiveContext.ttsUnsafeChunkCountRef,
    ttsSemanticPhraseAdvanceCountRef: input.adaptiveContext.ttsSemanticPhraseAdvanceCountRef,
    ttsSemanticPhraseReplayCountRef: input.adaptiveContext.ttsSemanticPhraseReplayCountRef,
    recordTtsChunkTelemetry: input.telemetryContext.recordTtsChunkTelemetry,
    recordAdaptiveBenchmark: input.telemetryContext.recordAdaptiveBenchmark,
    setAdaptiveSemanticDebug: input.adaptiveContext.setAdaptiveSemanticDebug,
    setTtsCurrentChunk: input.uiContext.setTtsCurrentChunk,
    setTtsPacingMode: input.uiContext.setTtsPacingMode,
    setTtsSpeechRate: input.uiContext.setTtsSpeechRate,
  });
}
