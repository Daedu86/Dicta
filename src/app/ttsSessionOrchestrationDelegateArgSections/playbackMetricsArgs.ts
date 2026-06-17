import type {
  PlaybackMetricsArgs,
  UseTtsSessionOrchestrationRuntimeArgs,
} from '../ttsSessionOrchestrationDelegateTypes';

const TTS_BASE_WORDS_PER_SECOND = 2.6;

export function buildTtsSessionPlaybackMetricsArgs(
  args: UseTtsSessionOrchestrationRuntimeArgs,
): PlaybackMetricsArgs {
  return {
    ttsTranscript: args.ttsTranscript,
    ttsStatus: args.ttsStatus,
    ttsSpeechRate: args.ttsSpeechRate,
    ttsLanguage: args.ttsLanguage,
    controllerState: args.controllerState,
    rate: args.rate,
    lagSec: args.lagSec,
    lagWords: args.lagWords,
    wpm: args.wpm,
    accuracy: args.accuracy,
    trend: args.trend,
    telemetryRef: args.telemetryRef,
    ttsStartedAtMsRef: args.ttsStartedAtMsRef,
    ttsPracticeLiveTextRef: args.ttsPracticeLiveTextRef,
    ttsChunkStartMsRef: args.ttsChunkStartMsRef,
    ttsChunkWordCountRef: args.ttsChunkWordCountRef,
    ttsChunkStartWordIndexRef: args.ttsChunkStartWordIndexRef,
    ttsCompletedSourceWordsRef: args.ttsCompletedSourceWordsRef,
    ttsLastValidControlLagSecRef: args.ttsLastValidControlLagSecRef,
    ttsLagOutlierCountRef: args.ttsLagOutlierCountRef,
    ttsLiveSignalRef: args.ttsLiveSignalRef,
    previousLagRef: args.previousLagRef,
    previousAccuracyRef: args.previousAccuracyRef,
    ttsLastControllerActionRef: args.ttsLastControllerActionRef,
    ttsPublishedUiRef: args.ttsPublishedUiRef,
    ttsUiLastPublishedAtRef: args.ttsUiLastPublishedAtRef,
    applyTtsPerformanceSampleRef: args.applyTtsPerformanceSampleRef,
    setControllerState: args.setControllerState,
    setRate: args.setRate,
    setLagSec: args.setLagSec,
    setLagWords: args.setLagWords,
    setWpm: args.setWpm,
    setAccuracy: args.setAccuracy,
    setTrend: args.setTrend,
    baseWordsPerSecond: TTS_BASE_WORDS_PER_SECOND,
  };
}
