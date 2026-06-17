import { createBrowserTtsPlaybackUtterance } from './browserTtsPlaybackLoopUtterance';
import type { BrowserTtsPlaybackPlan } from './browserTtsPlaybackPlanTypes';
import type { SpeakBrowserTtsPlaybackLoopChunkInput } from './browserTtsPlaybackLoopChunkSpeakerTypes';

export function createBrowserTtsPlaybackLoopChunkUtterance(
  input: SpeakBrowserTtsPlaybackLoopChunkInput,
  playbackPlan: BrowserTtsPlaybackPlan,
) {
  const utteranceRuntime = createBrowserTtsPlaybackUtterance({
    chunk: playbackPlan.chunk,
    perfDiagnostics: input.playbackRuntime.perfDiagnostics,
    perfPlayId: input.playbackRuntime.perfPlayId,
    chunkIndex: input.runnerState.cursor.chunkIndex,
    ttsLanguage: input.playbackRuntime.ttsLanguage,
    pacingMode: playbackPlan.pacingMode,
    rate: playbackPlan.rate,
    browserTtsVoice: input.playbackRuntime.browserTtsVoice,
    activeSession: input.playbackRuntime.activeSession,
    browserTtsVoices: input.playbackRuntime.browserTtsVoices,
  });

  input.playbackRuntime.ttsUtteranceRef.current = utteranceRuntime.utterance;
  return utteranceRuntime;
}
