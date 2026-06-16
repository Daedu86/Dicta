import { createBrowserTtsPlaybackLoopActions } from './browserTtsPlaybackLoopActions';
import type { BrowserTtsPlaybackLoopOptions } from './browserTtsPlaybackLoopTypes';

export type { BrowserTtsPlaybackLoopOptions } from './browserTtsPlaybackLoopTypes';

export function useBrowserTtsPlaybackLoop(options: BrowserTtsPlaybackLoopOptions) {
  return createBrowserTtsPlaybackLoopActions(options);
}
