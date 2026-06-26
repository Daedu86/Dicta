import { useFocusedTrainingInputTelemetryRuntime } from './useFocusedTrainingInputTelemetryRuntime';
import { useFocusedTrainingRouteControls } from './useFocusedTrainingRouteControls';
import { useFocusedTrainingRouteGenerationButtons } from './useFocusedTrainingRouteGenerationButtons';
import { useFocusedTrainingRoutePresentationState } from './useFocusedTrainingRoutePresentationState';
import { useFocusedTrainingRouteReplayTts } from './useFocusedTrainingRouteReplayTts';
import type {
  UseFocusedTrainingRouteRuntimeArgs,
  UseFocusedTrainingRouteRuntimeResult,
} from './useFocusedTrainingRouteRuntimeTypes';
import { useFocusedTrainingRouteViewProps } from './useFocusedTrainingRouteViewProps';

export type {
  ResetSessionOptions,
  UseFocusedTrainingRouteRuntimeArgs,
  UseFocusedTrainingRouteRuntimeResult,
  WritableRef,
} from './useFocusedTrainingRouteRuntimeTypes';

export function useFocusedTrainingRouteRuntime(
  args: UseFocusedTrainingRouteRuntimeArgs,
): UseFocusedTrainingRouteRuntimeResult {
  const focusedTrainingControls = useFocusedTrainingRouteControls(args);
  void args.ttsPlayerProgressTick;

  const focusedTrainingPresentationState = useFocusedTrainingRoutePresentationState(args);
  const focusedImmediateInputHandler = useFocusedTrainingInputTelemetryRuntime({
    telemetryRef: args.telemetryRef,
    ttsStartedAtMsRef: args.ttsStartedAtMsRef,
    ttsPracticeLiveTextRef: args.ttsPracticeLiveTextRef,
    ttsPracticeLastInputAtMsRef: args.ttsPracticeLastInputAtMsRef,
  });
  const focusedTrainingGenerationButtons = useFocusedTrainingRouteGenerationButtons(args);
  const replayFocusedTts = useFocusedTrainingRouteReplayTts(
    args,
    focusedTrainingPresentationState.ttsPlayerProgressPercent,
  );

  const focusedTrainingProps = useFocusedTrainingRouteViewProps({
    args,
    focusedTrainingControls,
    focusedImmediateInputHandler,
    focusedTrainingGenerationButtons,
    focusedTrainingPresentationState,
    replayFocusedTts,
  });

  return {
    focusedTrainingProps,
  };
}
