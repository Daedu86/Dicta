import { buildBrowserTtsChunkAccuracySnapshot } from './browserTtsChunkAccuracy';
import type { BrowserTtsPlaybackPlanInput } from './browserTtsPlaybackPlanTypes';

export function buildBrowserTtsPlaybackPlanAccuracyState(input: BrowserTtsPlaybackPlanInput) {
  const snapshot = buildBrowserTtsChunkAccuracySnapshot({
    liveSignal: input.liveSignal,
    livePracticeEvaluation: input.livePracticeEvaluation,
    accuracyWindow: input.accuracyWindow,
    lastAccuracySnapshot: input.lastAccuracySnapshot,
  });

  const accuracy = {
    sessionAccuracy: snapshot.sessionAccuracy,
    chunkAccuracy: snapshot.chunkAccuracy,
    rollingAccuracyLast3: snapshot.rollingAccuracyLast3,
    rollingAccuracyLast5: snapshot.rollingAccuracyLast5,
  };

  return { ...snapshot, accuracy };
}
