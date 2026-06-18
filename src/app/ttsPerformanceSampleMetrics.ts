import { buildBrowserTtsControlLagSample } from '../inputs/browserTts/browserTtsRatePolicy';
import { computeSessionScore } from '../core/sessionScore';
import {
  evaluateLiveTranscriptAttempt,
  evaluateTranscriptAttempt,
} from '../core/evaluation';
import type { Transcript } from '../types/dictation';
import type { TtsLanguage } from './sessionTypes';
import {
  derivePerformanceTrend,
  deriveTtsControlAction,
} from './appRuntimeHelpers';

const TTS_BASE_WORDS_PER_SECOND = 2.6;

type TtsPerformanceMetricSnapshotInput = {
  practiceTextForEvaluation: string;
  ttsTranscript: Transcript | null;
  ttsSpeechRate: number;
  ttsLanguage: TtsLanguage;
  previousValidControlLagSec: number;
  previousLagSec: number;
  previousAccuracy: number;
  spokenPosition: number;
  elapsedSeconds: number;
  useExactEvaluation?: boolean;
};

export function buildTtsPerformanceMetricSnapshot({
  practiceTextForEvaluation,
  ttsTranscript,
  ttsSpeechRate,
  ttsLanguage,
  previousValidControlLagSec,
  previousLagSec,
  previousAccuracy,
  spokenPosition,
  elapsedSeconds,
  useExactEvaluation = false,
}: TtsPerformanceMetricSnapshotInput) {
  const evaluation = useExactEvaluation
    ? evaluateTranscriptAttempt(practiceTextForEvaluation, ttsTranscript)
    : evaluateLiveTranscriptAttempt(practiceTextForEvaluation, ttsTranscript);
  const practiceWords = evaluation.typedWords;
  const sourceWordCount = ttsTranscript?.words.length ?? 0;
  const visibleAccuracy = practiceWords.length > 0 && sourceWordCount > 0 ? evaluation.accuracy : 0;
  const typedProgress = Math.max(0, evaluation.lastMatchedTargetIndex + 1);
  const lagWords = sourceWordCount > 0 ? spokenPosition - typedProgress : 0;
  const wordsPerSecond = Math.max(1, TTS_BASE_WORDS_PER_SECOND * ttsSpeechRate);
  const rawLagSec = lagWords / wordsPerSecond;
  const lagSample = buildBrowserTtsControlLagSample({
    rawLagSec,
    language: ttsLanguage,
    previousValidControlLagSec,
  });
  const lagSec = lagSample.stableLagSec;
  const elapsedMinutes = Math.max(elapsedSeconds / 60, 1 / 60);
  const wpm = practiceWords.length > 0 ? practiceWords.length / elapsedMinutes : 0;
  const accuracy = practiceWords.length > 0 ? visibleAccuracy : 100;
  const controllerAction = deriveTtsControlAction({
    accuracy,
    lagSec,
    wpm,
    typedWords: practiceWords.length,
  });
  const trend = derivePerformanceTrend(lagSec, accuracy, previousLagSec, previousAccuracy);
  const rate = ttsSpeechRate;
  const score =
    practiceWords.length > 0 && sourceWordCount > 0
      ? computeSessionScore({
          accuracy,
          lagSec,
          wpm,
          rate,
          points: evaluation.points,
        })
      : 0;

  return {
    evaluation,
    lagSample,
    controllerAction,
    rate,
    lagSec,
    lagWords,
    wpm,
    accuracy,
    trend,
    score,
  };
}
