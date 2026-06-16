import type { BrowserTtsPlaybackLoopOptions } from './browserTtsPlaybackLoopTypes';

type BrowserTtsPlaybackLoopStartHandlerParams = {
  perfDiagnostics: BrowserTtsPlaybackLoopOptions['perfDiagnostics'];
  perfUtteranceId: ReturnType<BrowserTtsPlaybackLoopOptions['perfDiagnostics']['beginTtsUtterance']>;
};

export function handleBrowserTtsPlaybackLoopChunkStart({
  perfDiagnostics,
  perfUtteranceId,
}: BrowserTtsPlaybackLoopStartHandlerParams): void {
  perfDiagnostics.recordTtsStart(perfUtteranceId);
}
