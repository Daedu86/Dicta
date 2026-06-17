import type { HistoricalPerformanceProfile, LiveTelemetryFrame } from './types';

export function resolveAdaptiveControllerPhraseContext(
  live: LiveTelemetryFrame,
  history: HistoricalPerformanceProfile,
  rollingAccuracyLast3: number,
) {
  const canReplayIndependently = live.canReplayIndependently ?? true;
  const semanticCompleteness = live.semanticCompleteness ?? 1;
  const longPhrase = live.phraseLengthWords >= 10 || live.phraseLengthChars >= 65 || live.phraseDifficulty >= 0.75;
  const phraseOverload = longPhrase && (rollingAccuracyLast3 < 0.88 || live.lagSec > 1.5 || live.correctionRate > 0.08);
  const longPhraseSensitive = history.strugglesWithLongPhrases && live.phraseLengthWords >= 8;

  return {
    canReplayIndependently,
    semanticCompleteness,
    phraseOverload,
    longPhraseSensitive,
  };
}
