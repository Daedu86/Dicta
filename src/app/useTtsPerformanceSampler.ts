import { useCallback } from 'react';
import { sampleTtsPerformance } from './ttsPerformanceSampler';
import type {
  TtsPerformanceSampleOptions,
  TtsPerformanceSamplerDependencies,
} from './ttsPerformanceSamplerTypes';

export { sampleTtsPerformance } from './ttsPerformanceSampler';
export type {
  TtsPerformanceSampleOptions,
  TtsPerformanceSamplerDependencies,
  WritableRef,
} from './ttsPerformanceSamplerTypes';

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
