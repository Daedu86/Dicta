import type { useBrowserTtsPlaybackLoop } from './useBrowserTtsPlaybackLoop';
import type { useKeyboardRemapRuntime } from './useKeyboardRemapRuntime';
import type { useResetSessionRuntime } from './useResetSessionRuntime';
import type { useTtsPlaybackControls } from './useTtsPlaybackControls';
import type { useTtsPlaybackMetricsRuntime } from './useTtsPlaybackMetricsRuntime';
import type { useTtsPracticeInputRuntime } from './useTtsPracticeInputRuntime';
import type { useTtsSessionSubmitAction } from './useTtsSessionSubmitAction';

export type KeyboardArgs = Parameters<typeof useKeyboardRemapRuntime>[0];
export type PracticeInputArgs = Parameters<typeof useTtsPracticeInputRuntime>[0];
export type PlaybackMetricsArgs = Parameters<typeof useTtsPlaybackMetricsRuntime>[0];
export type BrowserPlaybackArgs = Parameters<typeof useBrowserTtsPlaybackLoop>[0];
export type PlaybackControlsArgs = Parameters<typeof useTtsPlaybackControls>[0];
export type ResetSessionArgs = Parameters<typeof useResetSessionRuntime>[0];
export type SubmitSessionArgs = Parameters<typeof useTtsSessionSubmitAction>[0];

export type PracticeInputDelegateArgs = Omit<PracticeInputArgs, 'handleEsKeyboardRemapKeyDown'>;
export type BrowserPlaybackDelegateArgs = Omit<
  BrowserPlaybackArgs,
  | 'estimateTtsSpokenWordIndex'
  | 'ensureAttemptTelemetry'
  | 'recordTtsTelemetryAction'
  | 'recordTtsChunkTelemetry'
  | 'applyTtsPerformanceSample'
>;
export type PlaybackControlsDelegateArgs = Omit<
  PlaybackControlsArgs,
  | 'estimateTtsSpokenWordIndex'
  | 'playTtsFromWord'
  | 'recordTtsTelemetryAction'
>;
export type ResetSessionDelegateArgs = Omit<ResetSessionArgs, 'stopTtsPlayback'>;
export type SubmitSessionDelegateArgs = Omit<SubmitSessionArgs, 'applyTtsPerformanceSample' | 'stopTtsPlayback'>;

export type UseTtsSessionOrchestrationRuntimeArgs =
  KeyboardArgs &
  PracticeInputDelegateArgs &
  Omit<PlaybackMetricsArgs, 'baseWordsPerSecond'> &
  Omit<BrowserPlaybackDelegateArgs, 'buildSemanticPhrasesForCurrentSession'> &
  Omit<PlaybackControlsDelegateArgs, 'ttsTranscriptWordCount'> &
  ResetSessionDelegateArgs &
  SubmitSessionDelegateArgs;

export type TtsSessionOrchestrationDelegateArgs = {
  keyboardRemap: KeyboardArgs;
  practiceInput: PracticeInputDelegateArgs;
  playbackMetrics: PlaybackMetricsArgs;
  browserPlayback: BrowserPlaybackDelegateArgs;
  playbackControls: PlaybackControlsDelegateArgs;
  resetSession: ResetSessionDelegateArgs;
  submitSession: SubmitSessionDelegateArgs;
};

export type BuildSemanticPhrasesForCurrentSession = BrowserPlaybackArgs['buildSemanticPhrasesForCurrentSession'];
