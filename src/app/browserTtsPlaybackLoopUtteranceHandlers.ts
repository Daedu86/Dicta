import { handleBrowserTtsPlaybackLoopChunkEnd } from './browserTtsPlaybackLoopCompletionHandler';
import { handleBrowserTtsPlaybackLoopChunkStart } from './browserTtsPlaybackLoopStartHandler';
import { handleBrowserTtsPlaybackLoopError } from './browserTtsPlaybackLoopErrorHandler';
import { attachBrowserTtsUtteranceLifecycle } from './browserTtsUtteranceLifecycle';

type BrowserTtsPlaybackLoopChunkStartInput = Parameters<typeof handleBrowserTtsPlaybackLoopChunkStart>[0];
type BrowserTtsPlaybackLoopChunkEndInput = Parameters<typeof handleBrowserTtsPlaybackLoopChunkEnd>[0];
type BrowserTtsPlaybackLoopErrorInput = Parameters<typeof handleBrowserTtsPlaybackLoopError>[0];

export interface BrowserTtsPlaybackLoopUtteranceHandlersInput {
  utterance: SpeechSynthesisUtterance;
  start: () => BrowserTtsPlaybackLoopChunkStartInput;
  end: () => BrowserTtsPlaybackLoopChunkEndInput;
  error: (event: SpeechSynthesisErrorEvent) => BrowserTtsPlaybackLoopErrorInput;
}

export function attachBrowserTtsPlaybackLoopUtteranceHandlers({
  utterance,
  start,
  end,
  error,
}: BrowserTtsPlaybackLoopUtteranceHandlersInput): void {
  attachBrowserTtsUtteranceLifecycle({
    utterance,
    onStart: () => {
      handleBrowserTtsPlaybackLoopChunkStart(start());
    },
    onEnd: () => {
      handleBrowserTtsPlaybackLoopChunkEnd(end());
    },
    onError: (event) => {
      handleBrowserTtsPlaybackLoopError(error(event));
    },
  });
}
