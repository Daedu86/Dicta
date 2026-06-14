export interface BrowserTtsNextChunkSchedulerInput {
  shouldPauseBeforeNextChunk: boolean;
  pauseBeforeNextChunkMs: number;
  scheduleTimeout: (callback: () => void, delayMs: number) => unknown;
  speakNext: () => void;
}

export function scheduleBrowserTtsNextChunk({
  shouldPauseBeforeNextChunk,
  pauseBeforeNextChunkMs,
  scheduleTimeout,
  speakNext,
}: BrowserTtsNextChunkSchedulerInput): void {
  if (shouldPauseBeforeNextChunk) {
    scheduleTimeout(() => {
      speakNext();
    }, pauseBeforeNextChunkMs);
    return;
  }

  speakNext();
}
