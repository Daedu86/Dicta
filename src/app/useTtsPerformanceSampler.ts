import { useCallback } from 'react';
import { evaluateTranscriptAttempt } from '../core/evaluation';
import { computeSessionScore } from '../core/sessionScore';
import { buildBrowserTtsControlLagSample } from '../inputs/browserTts/browserTtsRatePolicy';
import { trackAction, trackSample } from '../core/telemetry';
import { cloneTelemetry } from '../core/sessionNormalization';
import {
  derivePerformanceTrend,
  deriveTtsControlAction,
} from './appRuntimeHelpers';
import type { TtsPerformanceSampleResult } from './sessionTypes';
import type {
  TtsPerformanceSampleOptions,
  TtsPerformanceSamplerDependencies,
} from './ttsPerformanceSamplerTypes';

export type {
  TtsPerformanceSampleOptions,
  TtsPerformanceSamplerDependencies,
  WritableRef,
} from './ttsPerformanceSamplerTypes';

const TTS_BASE_WORDS_PER_SECOND = 2.6;

export function sampleTtsPerformance(
  {
    ttsStartedAtMsRef,
    ttsPracticeLiveTextRef,
    ttsTranscript,
    ttsSpeechRate,
    ttsLanguage,
    ttsLastValidControlLagSecRef,
    ttsLagOutlierCountRef,
    ttsLiveSignalRef,
    previousLagRef,
    previousAccuracyRef,
    telemetryRef,
    ttsLastControllerActionRef,
    estimateTtsSpokenWordIndex,
    getTtsElapsedSeconds,
    ensureAttemptTelemetry,
    publishTtsUiState,
    nowMs,
    nowIso,
  }: TtsPerformanceSamplerDependencies,
  options: TtsPerformanceSampleOptions = {},
): TtsPerformanceSampleResult {
  const now = nowMs ? nowMs() : performance.now();
  if (ttsStartedAtMsRef.current === null) {
    ttsStartedAtMsRef.current = now;
  }

  const practiceTextForEvaluation = options.practiceTextOverride ?? ttsPracticeLiveTextRef.current;
  const evaluation = evaluateTranscriptAttempt(practiceTextForEvaluation, ttsTranscript);
  const practiceWords = evaluation.typedWords;
  const sourceWordCount = ttsTranscript?.words.length ?? 0;
  const visibleAccuracy = practiceWords.length > 0 && sourceWordCount > 0 ? evaluation.accuracy : 0;
  const typedProgress = Math.max(0, evaluation.lastMatchedTargetIndex + 1);
  const spokenPosition = estimateTtsSpokenWordIndex(now);
  const nextLagWords = sourceWordCount > 0 ? spokenPosition - typedProgress : 0;
  const wordsPerSecond = Math.max(1, TTS_BASE_WORDS_PER_SECOND * ttsSpeechRate);
  const nextRawLagSec = nextLagWords / wordsPerSecond;
  const lagSample = buildBrowserTtsControlLagSample({
    rawLagSec: nextRawLagSec,
    language: ttsLanguage,
    previousValidControlLagSec: ttsLastValidControlLagSecRef.current,
  });
  if (lagSample.isOutlier) {
    ttsLagOutlierCountRef.current += 1;
  }
  const nextLagSec = lagSample.stableLagSec;
  if (!lagSample.usedFallbackControlLag && Number.isFinite(nextLagSec)) {
    ttsLastValidControlLagSecRef.current = nextLagSec;
  }
  const elapsedMinutes = Math.max(getTtsElapsedSeconds(now) / 60, 1 / 60);
  const nextWpm = practiceWords.length > 0 ? practiceWords.length / elapsedMinutes : 0;
  const nextAccuracy = practiceWords.length > 0 ? visibleAccuracy : 100;
  const nextControllerAction = deriveTtsControlAction({
    accuracy: nextAccuracy,
    lagSec: nextLagSec,
    wpm: nextWpm,
    typedWords: practiceWords.length,
  });
  const nextTrend = derivePerformanceTrend(nextLagSec, nextAccuracy, previousLagRef.current, previousAccuracyRef.current);
  const nextRate = ttsSpeechRate;
  const nextScore =
    practiceWords.length > 0 && sourceWordCount > 0
      ? computeSessionScore({
          accuracy: nextAccuracy,
          lagSec: nextLagSec,
          wpm: nextWpm,
          rate: nextRate,
          points: evaluation.points,
        })
      : 0;

  ttsLiveSignalRef.current = {
    accuracy: nextAccuracy,
    lagSec: nextLagSec,
    rawLagSec: lagSample.rawLagSec,
    stableLagSec: lagSample.stableLagSec,
    lagOutlierCount: ttsLagOutlierCountRef.current,
    wpm: nextWpm,
    trend: nextTrend,
    controllerState: nextControllerAction,
  };

  publishTtsUiState(
    {
      controllerState: nextControllerAction,
      rate: nextRate,
      lagSec: nextLagSec,
      lagWords: nextLagWords,
      wpm: nextWpm,
      accuracy: nextAccuracy,
      trend: nextTrend,
    },
    now,
    Boolean(options.forcePublishUi || options.finalize || options.action),
  );
  previousLagRef.current = nextLagSec;
  previousAccuracyRef.current = nextAccuracy;

  const telemetry = ensureAttemptTelemetry();
  const nextTelemetry = cloneTelemetry(telemetry);
  trackSample(nextTelemetry, nextLagSec, nextWpm, nextAccuracy, nextRate);

  if (options.action) {
    trackAction(nextTelemetry, getTtsElapsedSeconds(now), options.action, nextRate);
  } else if (nextControllerAction !== ttsLastControllerActionRef.current) {
    trackAction(nextTelemetry, getTtsElapsedSeconds(now), nextControllerAction, nextRate);
    ttsLastControllerActionRef.current = nextControllerAction;
  }

  if (options.finalize) {
    nextTelemetry.finishedAt = nowIso ? nowIso() : new Date().toISOString();
  }

  telemetryRef.current = nextTelemetry;
  return {
    metrics: {
      controllerState: nextControllerAction,
      rate: nextRate,
      lagSec: nextLagSec,
      lagWords: nextLagWords,
      wpm: nextWpm,
      accuracy: nextAccuracy,
      trend: nextTrend,
      score: nextScore,
      points: evaluation.points,
    },
    telemetry: nextTelemetry,
  };
}

export function useTtsPerformanceSampler({
  ttsStartedAtMsRef,
  ttsPracticeLiveTextRef,
  ttsTranscript,
  ttsSpeechRate,
  ttsLanguage,
  ttsLastValidControlLagSecRef,
  ttsLagOutlierCountRef,
  ttsLiveSignalRef,
  previousLagRef,
  previousAccuracyRef,
  telemetryRef,
  ttsLastControllerActionRef,
  estimateTtsSpokenWordIndex,
  getTtsElapsedSeconds,
  ensureAttemptTelemetry,
  publishTtsUiState,
  nowMs,
  nowIso,
}: TtsPerformanceSamplerDependencies) {
  return useCallback(
    (options: TtsPerformanceSampleOptions = {}) =>
      sampleTtsPerformance(
        {
          ttsStartedAtMsRef,
          ttsPracticeLiveTextRef,
          ttsTranscript,
          ttsSpeechRate,
          ttsLanguage,
          ttsLastValidControlLagSecRef,
          ttsLagOutlierCountRef,
          ttsLiveSignalRef,
          previousLagRef,
          previousAccuracyRef,
          telemetryRef,
          ttsLastControllerActionRef,
          estimateTtsSpokenWordIndex,
          getTtsElapsedSeconds,
          ensureAttemptTelemetry,
          publishTtsUiState,
          nowMs,
          nowIso,
        },
        options,
      ),
    [
      ensureAttemptTelemetry,
      estimateTtsSpokenWordIndex,
      getTtsElapsedSeconds,
      nowIso,
      nowMs,
      previousAccuracyRef,
      previousLagRef,
      publishTtsUiState,
      telemetryRef,
      ttsLagOutlierCountRef,
      ttsLanguage,
      ttsLastControllerActionRef,
      ttsLastValidControlLagSecRef,
      ttsLiveSignalRef,
      ttsPracticeLiveTextRef,
      ttsSpeechRate,
      ttsStartedAtMsRef,
      ttsTranscript,
    ],
  );
}
