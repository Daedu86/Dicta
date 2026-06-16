import type { AttemptEvaluation } from '../core/evaluation';
import { averageNumbers, clamp01 } from './appRuntimeHelpers';
import type { TtsLiveSignal } from './ttsPlaybackProfile';

export type BrowserTtsChunkAccuracySnapshot = {
  sessionAccuracy: number;
  chunkAccuracy: number;
  rollingAccuracyLast3: number;
  rollingAccuracyLast5: number;
  nextAccuracyWindow: number[];
  typedWordsNow: number;
  matchedWordsNow: number;
};

export function buildBrowserTtsChunkAccuracySnapshot({
  liveSignal,
  livePracticeEvaluation,
  accuracyWindow,
  lastAccuracySnapshot,
}: {
  liveSignal: TtsLiveSignal;
  livePracticeEvaluation: AttemptEvaluation;
  accuracyWindow: number[];
  lastAccuracySnapshot: {
    typedWords: number;
    matchedWords: number;
  };
}): BrowserTtsChunkAccuracySnapshot {
  const typedWordsNow = livePracticeEvaluation.typedWords.length;
  const matchedWordsNow = livePracticeEvaluation.matchedWords;
  const typedDelta = Math.max(0, typedWordsNow - lastAccuracySnapshot.typedWords);
  const matchedDelta = Math.max(0, matchedWordsNow - lastAccuracySnapshot.matchedWords);
  const sessionAccuracy = clamp01(liveSignal.accuracy / 100);
  const chunkAccuracy = typedDelta > 0 ? clamp01(matchedDelta / typedDelta) : sessionAccuracy;
  const rollingWindow = [...accuracyWindow, chunkAccuracy];

  return {
    sessionAccuracy,
    chunkAccuracy,
    rollingAccuracyLast3: averageNumbers(rollingWindow.slice(-3), chunkAccuracy),
    rollingAccuracyLast5: averageNumbers(rollingWindow.slice(-5), chunkAccuracy),
    nextAccuracyWindow: rollingWindow.slice(-5),
    typedWordsNow,
    matchedWordsNow,
  };
}
