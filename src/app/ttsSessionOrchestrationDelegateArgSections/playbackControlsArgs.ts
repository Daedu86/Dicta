import type {
  PlaybackControlsDelegateArgs,
  UseTtsSessionOrchestrationRuntimeArgs,
} from '../ttsSessionOrchestrationDelegateTypes';

export function buildTtsSessionPlaybackControlsArgs(
  args: UseTtsSessionOrchestrationRuntimeArgs,
): PlaybackControlsDelegateArgs {
  return {
    activeInputMode: args.activeInputMode,
    activeSessionFinished: args.activeSessionFinished,
    ttsHasText: args.ttsHasText,
    ttsStatus: args.ttsStatus,
    ttsText: args.ttsText,
    ttsPracticeText: args.ttsPracticeText,
    ttsTranscriptWordCount: args.ttsTranscript?.words.length ?? 0,
    isBrowserTtsSupported: args.isBrowserTtsSupported,
    cancelBrowserTts: args.cancelBrowserTts,
    resumeBrowserTts: args.resumeBrowserTts,
    ttsStartedAtMsRef: args.ttsStartedAtMsRef,
    ttsUtteranceRef: args.ttsUtteranceRef,
    ttsChunkStartMsRef: args.ttsChunkStartMsRef,
    ttsCompletedSourceWordsRef: args.ttsCompletedSourceWordsRef,
    ttsPausedAtWordIndexRef: args.ttsPausedAtWordIndexRef,
    setTtsCurrentChunk: args.setTtsCurrentChunk,
    setTtsPacingMode: args.setTtsPacingMode,
    setTtsSpeechRate: args.setTtsSpeechRate,
    setRunning: args.setRunning,
    setSessionStatus: args.setSessionStatus,
    setTtsStatus: args.setTtsStatus,
    setTtsPlayerProgressTick: args.setTtsPlayerProgressTick,
  };
}
