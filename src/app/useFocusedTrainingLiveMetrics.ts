import { useDeferredValue, useMemo } from 'react';
import {
  buildSessionPointsHelpText,
  computeSessionMaxPoints,
  evaluateTranscriptAttempt,
  formatSessionPointsLabel,
} from '../core/evaluation';
import { buildSessionScoreHelpText, computeSessionScore } from '../core/sessionScore';
import { buildTextTranscript } from './repeatWordStats';

type UseFocusedTrainingLiveMetricsArgs = {
  activeInputMode: NonNullable<Parameters<typeof computeSessionMaxPoints>[0]>['inputMode'];
  ttsText: string;
  ttsPracticeText: string;
  lagSec: number;
  wpm: number;
  rate: number;
};

export function useFocusedTrainingLiveMetrics({
  activeInputMode,
  ttsText,
  ttsPracticeText,
  lagSec,
  wpm,
  rate,
}: UseFocusedTrainingLiveMetricsArgs) {
  const ttsHasText = ttsText.trim().length > 0;
  const ttsTranscript = useMemo(() => buildTextTranscript(ttsText), [ttsText]);
  const deferredTtsPracticeText = useDeferredValue(ttsPracticeText);

  const ttsPracticeEvaluation = useMemo(
    () => evaluateTranscriptAttempt(deferredTtsPracticeText, ttsTranscript),
    [deferredTtsPracticeText, ttsTranscript],
  );

  const ttsPracticeWords = ttsPracticeEvaluation.typedWords;
  const activeVisibleAccuracy =
    ttsPracticeWords.length > 0 && (ttsTranscript?.words.length ?? 0) > 0 ? ttsPracticeEvaluation.accuracy : 0;

  const activeVisibleScore =
    ttsPracticeWords.length > 0 && (ttsTranscript?.words.length ?? 0) > 0
      ? computeSessionScore({
          accuracy: activeVisibleAccuracy,
          lagSec,
          wpm,
          rate,
          points: ttsPracticeEvaluation.points,
        })
      : 0;

  const activePoints = ttsPracticeEvaluation.points;

  const activeMaxPoints = useMemo(
    () =>
      computeSessionMaxPoints({
        inputMode: activeInputMode,
        ttsText,
      }),
    [activeInputMode, ttsText],
  );

  const activeLivePointsLabel = formatSessionPointsLabel(activePoints, activeMaxPoints);
  const activeLiveScoreHelpText = buildSessionScoreHelpText({
    accuracy: activeVisibleAccuracy,
    lagSec,
    wpm,
    rate,
    points: activePoints,
    score: activeVisibleScore,
  });
  const activeLivePointsHelpText = buildSessionPointsHelpText(activeMaxPoints);
  const activeLiveAccuracyHelpText =
    'Accuracy is matched target words divided by typed words, including exact and one-character typo matches.';

  return {
    ttsHasText,
    ttsTranscript,
    activePoints,
    activeVisibleAccuracy,
    activeVisibleScore,
    activeMaxPoints,
    activeLivePointsLabel,
    activeLiveScoreHelpText,
    activeLivePointsHelpText,
    activeLiveAccuracyHelpText,
  };
}
