import { runBrowserTtsPlaybackLoop } from './browserTtsPlaybackLoopRunner';
import type { BrowserTtsPlaybackLoopOptions } from './browserTtsPlaybackLoopTypes';

type BrowserTtsPlaybackLoopActionsInput = BrowserTtsPlaybackLoopOptions;

export function createBrowserTtsPlaybackLoopActions(options: BrowserTtsPlaybackLoopActionsInput) {
  function playTtsFromWord(
    startWordIndex: number,
    perfPlayId = options.perfDiagnostics.beginTtsPlay('browser-tts-direct'),
  ): void {
    runBrowserTtsPlaybackLoop({
      ...options,
      startWordIndex,
      perfPlayId,
    });
  }

  function playTts(): void {
    const perfPlayId = options.perfDiagnostics.beginTtsPlay('browser-tts-play-button');
    playTtsFromWord(
      options.ttsStatus === 'paused'
        ? (options.ttsPausedAtWordIndexRef.current ?? options.ttsCompletedSourceWordsRef.current)
        : 0,
      perfPlayId,
    );
  }

  return {
    playTts,
    playTtsFromWord,
  };
}
