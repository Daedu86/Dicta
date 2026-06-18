import type {
  AdaptivePacingInput,
  InputExecutionTelemetry,
  PacingDecision,
} from './types';
import type {
  ContinuousAdaptiveListeningSnapshot,
} from './continuousAdaptiveListeningTypes';
import {
  mapAdaptiveLevelToLegacyMode,
  buildAdaptiveListeningState,
  deriveAdaptiveLabel,
} from './continuousAdaptiveListeningBrain';
import {
  mapAdaptiveStateToPacingOutput,
  mapBoundaryStrictnessToLegacy,
  mapOutputPhraseSizeToLegacyPhraseSize,
} from './adaptivePacingOutputMapper';
import { buildAdaptivePressureVector } from './adaptivePressureVector';
import { normalizeRuntimeTelemetry } from './continuousTelemetryNormalizer';
import { resolveLanguageAdaptiveCalibration } from './languageAdaptiveCalibration';
import { evaluateRuntimeSampleQuality } from './runtimeSampleQualityGate';

export type BuildContinuousAdaptiveListeningSnapshotInput = {
  input: AdaptivePacingInput;
  decision?: Partial<PacingDecision>;
  execution?: InputExecutionTelemetry;
  event?: string;
  phraseIndex?: number;
  totalSemanticPhrases?: number;
  previousAdaptiveLevel?: number;
};

export function buildContinuousAdaptiveListeningSnapshot({
  input,
  decision,
  execution,
  event,
  phraseIndex,
  totalSemanticPhrases,
  previousAdaptiveLevel,
}: BuildContinuousAdaptiveListeningSnapshotInput): ContinuousAdaptiveListeningSnapshot {
  const languageCalibration = resolveLanguageAdaptiveCalibration(input.live.language);
  const telemetry = normalizeRuntimeTelemetry({
    live: input.live,
    history: input.history,
    decision,
    execution,
    event,
    phraseIndex,
    totalSemanticPhrases,
    calibration: languageCalibration,
  });
  const sampleQuality = evaluateRuntimeSampleQuality(telemetry, languageCalibration);
  const pressure = buildAdaptivePressureVector({
    telemetry,
    history: input.history,
    sampleQuality,
    calibration: languageCalibration,
  });
  const state = buildAdaptiveListeningState({
    pressure,
    sampleQuality,
    previousAdaptiveLevel,
  });
  const output = mapAdaptiveStateToPacingOutput({
    state,
    telemetry,
    history: input.history,
    calibration: languageCalibration,
  });

  return {
    telemetry,
    sampleQuality,
    pressure,
    state,
    output,
    languageCalibration,
    derivedAdaptiveLabel: deriveAdaptiveLabel(state.adaptiveLevel),
  };
}

export function applyContinuousAdaptiveSnapshotToDecision(
  decision: PacingDecision,
  snapshot: ContinuousAdaptiveListeningSnapshot,
  supportsPhraseReplay: boolean,
): PacingDecision {
  const reasonCodes = [...new Set([...decision.reasonCodes, ...snapshot.state.reasonCodes])];
  const reason = appendReasonTokens(decision.reason, snapshot.state.reasonCodes);
  const shouldPauseNow = snapshot.telemetry.canPauseAfter && snapshot.output.pauseMsTarget > 0;
  const deferPauseUntilSafeBoundary = !snapshot.telemetry.canPauseAfter && snapshot.output.pauseMsTarget > 0;
  const replayBoundaryIsSafe =
    snapshot.telemetry.canReplayIndependently &&
    snapshot.telemetry.semanticCompleteness >= 0.65 &&
    snapshot.telemetry.phraseBoundaryType !== 'unsafe';
  const shouldReplayPhrase =
    supportsPhraseReplay &&
    replayBoundaryIsSafe &&
    (snapshot.output.replaySupport >= 0.25 || decision.shouldReplayPhrase);
  const playbackRate = snapshot.output.playbackRateTarget;
  const replayRate = Number(Math.min(playbackRate, Math.max(snapshot.languageCalibration.playbackRateFloor, playbackRate - 0.08)).toFixed(2));

  return {
    ...decision,
    mode: mapAdaptiveLevelToLegacyMode(snapshot.state.adaptiveLevel),
    playbackRate,
    pauseAfterPhraseMs: snapshot.output.pauseMsTarget,
    shouldPauseNow,
    shouldReplayPhrase,
    boundaryStrictness: mapBoundaryStrictnessToLegacy(snapshot.output.boundaryStrictness),
    allowMidPhrasePause: snapshot.output.boundaryStrictness >= 0.78 && snapshot.telemetry.phraseBoundaryType === 'minor',
    deferPauseUntilSafeBoundary,
    replayRate,
    nextPhraseSize: mapOutputPhraseSizeToLegacyPhraseSize(snapshot.output.phraseSizeTarget),
    reason,
    reasonCodes,
    adaptiveLevel: snapshot.state.adaptiveLevel,
    adaptiveDirection: snapshot.state.direction,
    pressureVector: snapshot.pressure,
    pacingOutput: snapshot.output,
    sampleQuality: snapshot.sampleQuality,
    languageCalibration: snapshot.languageCalibration,
    derivedAdaptiveLabel: snapshot.derivedAdaptiveLabel,
    perceptualPauseLevel: snapshot.output.perceptualPauseLevel,
    perceptualPauseShortfallMs: snapshot.telemetry.pauseShortfallMs,
  };
}

function appendReasonTokens(reason: string, tokens: string[]): string {
  const existing = reason.split(',').map((value) => value.trim()).filter(Boolean);
  return [...new Set([...existing, ...tokens])].join(', ');
}
