import type { useActiveSessionStateSync } from './useActiveSessionStateSync';
import type { useFocusedTrainingLiveMetrics } from './useFocusedTrainingLiveMetrics';
import type { useFocusedTrainingRouteRuntime } from './useFocusedTrainingRouteRuntime';
import type { useTtsPlaybackIntervalsRuntime } from './useTtsPlaybackIntervalsRuntime';
import type { useTtsSessionOrchestrationRuntime } from './useTtsSessionOrchestrationRuntime';

export type LiveMetricsArgs = Parameters<typeof useFocusedTrainingLiveMetrics>[0];
export type IntervalsArgs = Parameters<typeof useTtsPlaybackIntervalsRuntime>[0];
export type StateSyncArgs = Parameters<typeof useActiveSessionStateSync>[0];
export type TtsOrchestrationArgs = Parameters<typeof useTtsSessionOrchestrationRuntime>[0];
export type FocusedTrainingRouteArgs = Parameters<typeof useFocusedTrainingRouteRuntime>[0];

export type PlaybackIntervalsDelegateArgs = Omit<IntervalsArgs, 'ttsHasText' | 'tickMs'>;
export type ActiveSessionSyncDelegateArgs = Omit<
  StateSyncArgs,
  'activeVisibleAccuracy' | 'activeVisibleScore' | 'activePoints'
>;
export type TtsOrchestrationDelegateArgs = Omit<TtsOrchestrationArgs, 'ttsHasText' | 'ttsTranscript'>;
export type FocusedTrainingRouteDelegateArgs = Omit<
  FocusedTrainingRouteArgs,
  | 'activeVisibleScore'
  | 'activeLiveScoreHelpText'
  | 'activeLivePointsLabel'
  | 'activeLivePointsHelpText'
  | 'activeVisibleAccuracy'
  | 'activeLiveAccuracyHelpText'
  | 'ttsHasText'
  | 'ttsTranscript'
  | 'estimateTtsSpokenWordIndex'
  | 'seekTtsPlayback'
  | 'playTtsFromWord'
  | 'resetSession'
  | 'playTts'
  | 'resumeTts'
  | 'pauseTts'
  | 'stopTtsPlayback'
  | 'punctuateTtsPracticeText'
  | 'onTtsPracticeChange'
  | 'onTtsPracticeKeyDown'
  | 'submitTtsSession'
  | 'practiceChunkRuntime'
>;

export type UseFocusedTrainingRuntimeArgs =
  LiveMetricsArgs &
  PlaybackIntervalsDelegateArgs &
  ActiveSessionSyncDelegateArgs &
  TtsOrchestrationDelegateArgs &
  FocusedTrainingRouteDelegateArgs & {
    config: {
      tickMs: number;
    };
  };

export type FocusedTrainingRuntimeDelegateArgs = {
  liveMetrics: LiveMetricsArgs;
  playbackIntervals: PlaybackIntervalsDelegateArgs;
  activeSessionSync: ActiveSessionSyncDelegateArgs;
  ttsOrchestration: TtsOrchestrationDelegateArgs;
  focusedRoute: FocusedTrainingRouteDelegateArgs;
};
