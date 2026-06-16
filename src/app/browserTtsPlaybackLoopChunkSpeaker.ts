/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildBrowserTtsPlaybackLoopChunkPlan } from './browserTtsPlaybackLoopChunkPlan';
import { commitBrowserTtsPlaybackLoopChunk } from './browserTtsPlaybackLoopChunkCommit';
import { createBrowserTtsPlaybackUtterance } from './browserTtsPlaybackLoopUtterance';
import { attachBrowserTtsPlaybackLoopUtteranceHandlers } from './browserTtsPlaybackLoopUtteranceHandlers';

export function speakBrowserTtsPlaybackLoopChunk(input: any): boolean {
  const playbackPlan = buildBrowserTtsPlaybackLoopChunkPlan(input.chunkPlanArgs);
  if (!playbackPlan) return false;

  const { utterance, perfUtteranceId } = createBrowserTtsPlaybackUtterance(input.utteranceArgs(playbackPlan));
  input.ttsUtteranceRef.current = utterance;
  commitBrowserTtsPlaybackLoopChunk(input.commitArgs(playbackPlan, utterance, perfUtteranceId));
  attachBrowserTtsPlaybackLoopUtteranceHandlers(input.handlerArgs(playbackPlan, utterance, perfUtteranceId));
  input.perfDiagnostics.recordTtsSpeak(perfUtteranceId);
  input.speakBrowserTts(utterance);
  return true;
}
