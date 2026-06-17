import type { AdaptivePacingInput } from './types';
import type { computeAdaptivePacingScores } from './adaptiveDictationControllerTelemetry';
import type { AdaptiveDictationControllerState } from './adaptiveDictationControllerState';
import type { resolveAdaptiveControllerRuntimeContext } from './adaptiveDictationControllerRuntimeContext';

export type AdaptiveControllerRuntime = ReturnType<typeof resolveAdaptiveControllerRuntimeContext>;
export type AdaptivePacingScores = ReturnType<typeof computeAdaptivePacingScores>;

export interface BuildAdaptiveDictationDecisionPlanInput {
  input: AdaptivePacingInput;
  state: AdaptiveDictationControllerState;
  runtime: AdaptiveControllerRuntime;
  scores: AdaptivePacingScores;
  initialPlaybackRate: number;
}
