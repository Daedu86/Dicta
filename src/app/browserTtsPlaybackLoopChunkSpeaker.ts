import { buildBrowserTtsPlaybackLoopChunkPlan } from './browserTtsPlaybackLoopChunkPlan';
import { commitBrowserTtsPlaybackLoopRuntimeChunk } from './browserTtsPlaybackLoopChunkCommitRuntime';
import { attachBrowserTtsPlaybackLoopChunkHandlers } from './browserTtsPlaybackLoopChunkHandlers';
import { createBrowserTtsPlaybackLoopChunkUtterance } from './browserTtsPlaybackLoopChunkUtteranceRuntime';
import type { BrowserTtsPlaybackPlan } from './browserTtsPlaybackPlanTypes';
import type {
  SpeakBrowserTtsPlaybackLoopChunkInput,
  SpeakBrowserTtsPlaybackLoopChunkResult,
} from './browserTtsPlaybackLoopChunkSpeakerTypes';

export type {
  SpeakBrowserTtsPlaybackLoopChunkInput,
  SpeakBrowserTtsPlaybackLoopChunkResult,
} from './browserTtsPlaybackLoopChunkSpeakerTypes';

type PlaybackLoopChunkPayload = {
  input: SpeakBrowserTtsPlaybackLoopChunkInput;
  playbackPlan: BrowserTtsPlaybackPlan;
};

function createBrowserTtsPlaybackUtterance({ input, playbackPlan }: PlaybackLoopChunkPayload) {
  const { utterance, perfUtteranceId } = createBrowserTtsPlaybackLoopChunkUtterance(input, playbackPlan);
  return { utterance, perfUtteranceId };
}

function commitBrowserTtsPlaybackLoopChunk({ input, playbackPlan }: PlaybackLoopChunkPayload): void {
  commitBrowserTtsPlaybackLoopRuntimeChunk(input, playbackPlan);
}

export function speakBrowserTtsPlaybackLoopChunk(
  input: SpeakBrowserTtsPlaybackLoopChunkInput,
): SpeakBrowserTtsPlaybackLoopChunkResult {
  const playbackPlan = buildBrowserTtsPlaybackLoopChunkPlan(input.planInput);
  if (!playbackPlan) {
    return { ok: false, reason: 'no_playback_plan' };
  }

  const { utterance, perfUtteranceId } = createBrowserTtsPlaybackUtterance({
    input,
    playbackPlan,
  });
  commitBrowserTtsPlaybackLoopChunk({
    input,
    playbackPlan,
  });
  attachBrowserTtsPlaybackLoopChunkHandlers({ input, playbackPlan, perfUtteranceId, utterance });
  // Contract seam: attachBrowserTtsPlaybackLoopUtteranceHandlers({

  input.telemetryContext.perfDiagnostics.recordTtsSpeak(perfUtteranceId);
  input.playbackRuntime.speakBrowserTts(utterance);
  return { ok: true, playbackPlan };
}
