import { useActiveSessionStateSync } from './useActiveSessionStateSync';
import { useFocusedTrainingLiveMetrics } from './useFocusedTrainingLiveMetrics';
import { useFocusedTrainingRouteRuntime } from './useFocusedTrainingRouteRuntime';
import { useTtsPlaybackIntervalsRuntime } from './useTtsPlaybackIntervalsRuntime';
import { useTtsSessionOrchestrationRuntime } from './useTtsSessionOrchestrationRuntime';

type LiveMetricsArgs = Parameters<typeof useFocusedTrainingLiveMetrics>[0];
type IntervalsArgs = Parameters<typeof useTtsPlaybackIntervalsRuntime>[0];
type StateSyncArgs = Parameters<typeof useActiveSessionStateSync>[0];
type TtsOrchestrationArgs = Parameters<typeof useTtsSessionOrchestrationRuntime>[0];
type FocusedTrainingRouteArgs = Parameters<typeof useFocusedTrainingRouteRuntime>[0];

type PlaybackIntervalsDelegateArgs = Omit<IntervalsArgs, 'ttsHasText' | 'tickMs'>;
type ActiveSessionSyncDelegateArgs = Omit<
  StateSyncArgs,
  'activeVisibleAccuracy' | 'activeVisibleScore' | 'activePoints'
>;
type TtsOrchestrationDelegateArgs = Omit<TtsOrchestrationArgs, 'ttsHasText' | 'ttsTranscript'>;
type FocusedTrainingRouteDelegateArgs = Omit<
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
  | 'resetSession'
  | 'playTts'
  | 'resumeTts'
  | 'pauseTts'
  | 'stopTtsPlayback'
  | 'onTtsPracticeChange'
  | 'onTtsPracticeKeyDown'
  | 'submitTtsSession'
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
