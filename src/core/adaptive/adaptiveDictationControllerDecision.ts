import type { AdaptivePacingInput, PacingDecision } from './types';
import { computeAdaptivePacingScores } from './adaptiveDictationControllerTelemetry';
import {
  buildAdaptiveSessionWarmupDecision,
  resolveAdaptiveSessionChunkIndex,
  shouldForceAdaptiveSessionWarmup,
} from './adaptiveDictationControllerWarmup';
import type { AdaptiveDictationControllerState } from './adaptiveDictationControllerState';
import { resolveAdaptiveControllerRuntimeContext } from './adaptiveDictationControllerRuntimeContext';
import { buildAdaptiveDictationDecisionPlan } from './adaptiveDictationControllerDecisionPlan';
import {
  applyContinuousAdaptiveSnapshotToDecision,
  buildContinuousAdaptiveListeningSnapshot,
} from './continuousAdaptiveListening';

export function decideAdaptiveDictationController(
  input: AdaptivePacingInput,
  state: AdaptiveDictationControllerState,
): PacingDecision {
  const runtime = resolveAdaptiveControllerRuntimeContext(input, state.getPreviousRate());
  const playbackRate = runtime.playbackRate;
  state.setPreviousRate(playbackRate);

  const scores = computeAdaptivePacingScores({
    live: runtime.live,
    history: runtime.history,
    rollingAccuracyLast3: runtime.rollingAccuracyLast3,
  });
  const sessionWarmup = runtime.browserTtsProfile?.sessionWarmup;
  const sessionChunkIndex = resolveAdaptiveSessionChunkIndex(runtime.live.sessionChunkIndex);

  if (sessionWarmup && shouldForceAdaptiveSessionWarmup({ sessionWarmup, sessionChunkIndex })) {
    const warmupDecision = buildAdaptiveSessionWarmupDecision({
      sessionWarmup,
      extremeSupportRateFloor: runtime.extremeSupportRateFloor,
      supportRateCeiling: runtime.supportRateCeiling,
      scores,
    });

    state.applyWarmupSupportFrame(warmupDecision.playbackRate);

    return warmupDecision;
  }

  const legacyDecision = buildAdaptiveDictationDecisionPlan({
    input,
    state,
    runtime,
    scores,
    initialPlaybackRate: playbackRate,
  });
  const snapshot = buildContinuousAdaptiveListeningSnapshot({
    input,
    decision: legacyDecision,
    previousAdaptiveLevel: state.getPreviousAdaptiveLevel(),
  });
  const decision = applyContinuousAdaptiveSnapshotToDecision(
    legacyDecision,
    snapshot,
    runtime.supportsPhraseReplay,
  );
  state.setPreviousAdaptiveLevel(snapshot.state.adaptiveLevel);
  state.setPreviousRate(decision.playbackRate);

  return decision;
}
