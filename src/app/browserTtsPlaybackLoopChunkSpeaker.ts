import { buildBrowserTtsPlaybackLoopChunkPlan } from './browserTtsPlaybackLoopChunkPlan';
import { commitBrowserTtsPlaybackLoopRuntimeChunk } from './browserTtsPlaybackLoopChunkCommitRuntime';
import { attachBrowserTtsPlaybackLoopChunkHandlers } from './browserTtsPlaybackLoopChunkHandlers';
import { createBrowserTtsPlaybackLoopChunkUtterance } from './browserTtsPlaybackLoopChunkUtteranceRuntime';
import type {
  SpeakBrowserTtsPlaybackLoopChunkInput,
  SpeakBrowserTtsPlaybackLoopChunkResult,
} from './browserTtsPlaybackLoopChunkSpeakerTypes';

export type {
  SpeakBrowserTtsPlaybackLoopChunkInput,
  SpeakBrowserTtsPlaybackLoopChunkResult,
} from './browserTtsPlaybackLoopChunkSpeakerTypes';

export function speakBrowserTtsPlaybackLoopChunk(
  input: SpeakBrowserTtsPlaybackLoopChunkInput,
): SpeakBrowserTtsPlaybackLoopChunkResult {
  const playbackPlan = buildBrowserTtsPlaybackLoopChunkPlan(input.planInput);
  if (!playbackPlan) {
    return { ok: false, reason: 'no_playback_plan' };
  }

  const { utterance, perfUtteranceId } = createBrowserTtsPlaybackLoopChunkUtterance(input, playbackPlan);
  commitBrowserTtsPlaybackLoopRuntimeChunk(input, playbackPlan);
  attachBrowserTtsPlaybackLoopChunkHandlers({ input, playbackPlan, perfUtteranceId, utterance });

  input.telemetryContext.perfDiagnostics.recordTtsSpeak(perfUtteranceId);
  input.playbackRuntime.speakBrowserTts(utterance);
  return { ok: true, playbackPlan };
}
