import { trackAction, trackSample } from '../core/telemetry';
import { cloneTelemetry } from '../core/sessionNormalization';
import type { ControlAction, SessionTelemetry } from '../types/dictation';
import type { TtsPerformanceSampleOptions } from './ttsPerformanceSamplerTypes';

type TtsPerformanceSampleTelemetrySnapshot = {
  controllerAction: ControlAction;
  rate: number;
  lagSec: number;
  wpm: number;
  accuracy: number;
};

type UpdateTtsPerformanceSampleTelemetryInput = {
  telemetry: SessionTelemetry;
  snapshot: TtsPerformanceSampleTelemetrySnapshot;
  elapsedSeconds: number;
  options: TtsPerformanceSampleOptions;
  previousControllerAction: ControlAction;
  finishedAtIso: string;
};

export function updateTtsPerformanceSampleTelemetry({
  telemetry,
  snapshot,
  elapsedSeconds,
  options,
  previousControllerAction,
  finishedAtIso,
}: UpdateTtsPerformanceSampleTelemetryInput): {
  telemetry: SessionTelemetry;
  nextControllerAction: ControlAction;
} {
  const nextTelemetry = cloneTelemetry(telemetry);
  trackSample(nextTelemetry, snapshot.lagSec, snapshot.wpm, snapshot.accuracy, snapshot.rate);

  if (options.action) {
    trackAction(nextTelemetry, elapsedSeconds, options.action, snapshot.rate);
  } else if (snapshot.controllerAction !== previousControllerAction) {
    trackAction(nextTelemetry, elapsedSeconds, snapshot.controllerAction, snapshot.rate);
  }

  if (options.finalize) {
    nextTelemetry.finishedAt = finishedAtIso;
  }

  return {
    telemetry: nextTelemetry,
    nextControllerAction: options.action ? previousControllerAction : snapshot.controllerAction,
  };
}
