# Adaptive Listening V3 Normalization Plan

_Snapshot tag: `adaptive-v3-pre-continuous-reset`_

This document is the starting snapshot for the Continuous Adaptive Listening reset. It describes the current Browser TTS / Listening V3 cycle as historical evidence, then defines the target architecture. Existing behavior, especially DE and ES tuning, is not the new contract.

## Current Cycle Snapshot

Dicta currently runs a closed Browser TTS loop:

1. Generation and prescription: `ListeningTrainerPolicy` converts one `(inputMode, language)` benchmark and recent feedback into a `ListeningTrainingPrescription`. OpenRouter prompts consume target rate, pause, phrase size, and content guidance, but the LLM only generates structured training material.
2. Planner and chunking: `SemanticPhrasePlanner` and Browser TTS dynamic chunk planning split text into semantic chunks with boundary, semantic completeness, phrase difficulty, and V3 prosody metadata.
3. Browser TTS runtime: `browserTtsPlaybackPlan` builds a candidate chunk, asks the adaptive controller, applies runtime policies, resolves the executable pause, and schedules the next chunk.
4. Controller and pacing: `AdaptiveDictationController` chooses a legacy `mode` (`recovery`, `support`, `balanced`, or `flow`) from lag, accuracy, correction, progress gap, phrase overload, and history. That mode then influences rate, pause, phrase size, boundary strictness, replay fallback, and reason codes.
5. Telemetry sampling: `ttsPerformanceSampler` and Browser TTS telemetry builders capture accuracy, WPM, raw/stable lag, correction pressure, phrase boundary, semantic completeness, current rate, and current pause.
6. Benchmark memory: `AdaptiveInputLanguageBenchmarkService` appends timeline points, computes acceptance/scoring, updates rolling benchmark metrics, and produces recommendation targets.
7. Feedback recency: session feedback packages summarize recent playback, benchmark before/after, diagnostics, and DictationScript context.
8. V3 report: `listeningCycleInsightReportV3` and the adaptive user/system report explain segmentation, reconstruction, typing mechanics, TTS environment, controller, and benchmark signals.
9. Language-specific logic: Browser TTS profiles exist for all five languages, but DE has the most special handling: strict benchmark sample acceptance, session insight fallback, recovery-safe chunking, German short bias, recommendation clamps, and Android recovery policy.

## Legacy State Locations

The four legacy pacing states live mainly in:

- `src/core/adaptive/types/pacing.ts`: `PacingMode` and `PacingDecision.mode`.
- `src/core/adaptive/adaptiveDictationControllerMode.ts`: initial mode choice.
- `src/core/adaptive/adaptiveDictationControllerFrames.ts`: sticky recovery/support/flow frame transitions.
- `src/core/adaptive/adaptiveDictationControllerPlaybackPolicy.ts`: support-like pause/replay/boundary behavior.
- `src/core/adaptive/adaptiveDictationControllerRatePolicy.ts`: mode floors/ceilings and support caps.
- `src/core/adaptive/adaptiveDictationControllerMath.ts`: phrase size and ideal pause maps by mode.
- `src/app/ttsPacingHelpers.ts`: maps adaptive modes to visible `slow | balanced | flow`.
- `src/app/browserTtsPlaybackPlan.ts`: extends V3 pauses only for `support`/`recovery`.
- Benchmark and report code: timeline `mode`, `support_entered`, `flow_entered`, mode distributions, weak areas, and wording.

Today those states control:

- Rate floors, ceilings, smoothing, and caps.
- Pause targets, pause extension, and replay fallback.
- Phrase size growth or contraction.
- Boundary strictness and mid-phrase pause allowance.
- Replay execution or recovery fallback when Browser TTS cannot replay phrases.
- Timeline events, benchmark derived metrics, weak areas, and report wording.
- UI/debug labels such as Slow phrase pacing, Balanced phrase pacing, and Flow pacing.

## Why Legacy States Are Not The Target Motor

The legacy states are deterministic boxes. `support` is a broad catch-all for low accuracy, correction pressure, phrase overload, boundary risk, replay pressure, and some history pressure. `recovery` is intended for catch-up pressure, but it still shares many support-like outputs. The result is sticky behavior: once pressure appears, rate, pause, phrase size, and wording can move together even when only one axis needs help.

This does not express the important Dicta case: high accuracy and clean lag, but insufficient perceptual space between phrases. That should increase a perceptual pause axis without necessarily lowering rate, reducing content difficulty, or calling the whole session `support`. A continuous model needs independent axes for rate, pause, chunk size, boundary safety, reconstruction, typing, environment, history, and trace quality.

## Current Sample Acceptance

The benchmark service is central, but sample quality is not yet universally normalized:

- Non-DE Browser TTS samples generally score through the generic timeline path.
- DE Browser TTS samples use strict helpers such as `isValidBrowserTtsDeBenchmarkSample`.
- DE session insight may accept stable-lag fallback samples even when raw lag is rejected from benchmark scoring.
- Rejection reasons include stale progress, missing or non-finite lag, clipped lag sentinels, raw lag out of range, non-positive WPM, unsafe boundaries, low semantic completeness, and non-scoring events.
- DE pressure analysis dedupes scoring events and uses recent clean samples to avoid locking current sessions into historical support pressure.

This was useful historically because DE Browser TTS had raw lag alignment problems and Android/runtime pressure. It protected benchmark averages while still allowing session insight. It is not the target architecture because it is a language-specific pipeline. The reset keeps the idea of separate use buckets, but moves it into a universal gate with language calibration.

## Why ES Can Feel Fast Despite Accepted Samples

Browser TTS ES can accept many samples and still feel too fast because the current loop does not treat perceptual pause as a primary signal.

- `targetPauseMs` is a benchmark recommendation, not guaranteed perceived phrase space.
- V3 chunk pause buckets are fixed defaults: micro, boundary, sentence, recovery.
- Controller pauses only extend V3 buckets when the runtime decision is `support` or `recovery`.
- A clean ES chunk with high accuracy may use sentence or boundary pauses that remain too short for dictation.
- `defer_pause` can hide the learner-facing problem: the system knows a pause was unsafe or delayed, but that does not become a central pressure axis.
- Chunk pause does not always equal macro phrase pause; a chunk boundary may be technically valid while the learner experiences the phrase-to-phrase gap as rushed.
- Rate, WPM, chunking, boundary strictness, and pause are still coupled through legacy mode labels.

## Target Architecture

The target cycle is one normalized, continuous adaptive brain for Browser TTS across `en`, `es`, `de`, `fr`, and `pt`. Languages calibrate the same cycle; they do not replace it.

### Phase 1: Telemetry Intake / Normalizer

Inputs include runtime telemetry, accuracy, WPM, raw/stable lag, correction rate, phrase boundary type, semantic completeness, event, phrase index, total semantic phrases, requested/actual rate, requested/actual pause, defer information, environment, and voice/browser metadata.

Outputs:

- Normalized runtime telemetry.
- `lagReliability`: `raw`, `stable`, `fallback`, or `invalid`.
- Timing, semantic, boundary, and execution confidence.
- Perceptual gap information for requested vs actual pause and chunk vs macro phrase pacing.

### Phase 2: Universal Trace / Sample Quality Gate

Every language passes through the same conceptual gate. The gate produces:

```ts
type RuntimeSampleQuality = {
  acceptedForBenchmark: boolean;
  acceptedForSessionInsight: boolean;
  acceptedForTelemetryLearning: boolean;
  acceptedForRuntimePressure: boolean;
  rejectionReason?: string;
  confidenceWeight: number;
  lagReliability: 'raw' | 'stable' | 'fallback' | 'invalid';
};
```

Benchmark acceptance stays strict by technical quality. Insight, runtime pressure, and debug can use partially reliable samples with lower confidence. Language tolerance is calibration/config, not a fork.

### Phase 3: Pressure Vector

The central model computes:

```ts
type AdaptivePressureVector = {
  accuracy: number;
  lag: number;
  correction: number;
  boundary: number;
  semanticLoad: number;
  reconstruction: number;
  typing: number;
  environment: number;
  history: number;
  currentSession: number;
  perceptualPause: number;
  traceQuality: number;
};
```

`perceptualPause` is mandatory. "Between phrases feels too fast" must appear here and not be hidden inside `support`.

### Phase 4: Continuous Adaptive Brain / Adaptive Level

The model computes:

```ts
type AdaptiveListeningState = {
  adaptiveLevel: number;
  confidence: number;
  direction: 'easing' | 'holding' | 'challenging';
  pressure: AdaptivePressureVector;
  reasonCodes: string[];
};
```

`0.0` means maximum perceptual protection, `0.5` is guided neutral dictation, and `1.0` is the maximum challenge allowed by confidence and calibration. Smoothing/hysteresis is allowed only to avoid jitter; it must not become another state machine.

### Phase 5: Pacing / Dictation Output Mapper

The mapper turns continuous state into independent outputs:

```ts
type AdaptivePacingOutput = {
  playbackRateTarget: number;
  pauseMsTarget: number;
  phraseSizeTarget: 'micro' | 'short' | 'medium' | 'long';
  boundaryStrictness: number;
  replaySupport: number;
  perceptualPauseLevel: number;
  perceptualRateLevel: number;
  targetWpmRange?: [number, number];
};
```

Rate, pause, phrase size, boundary strictness, and replay support must move independently. ES can increase pause without lowering rate. Reconstruction pressure can reduce phrase size without treating rate as the problem.

### Phase 6: Language Calibration Layer

Initial calibrations exist for all languages:

- `en`
- `es`
- `de`
- `fr`
- `pt`

Each calibration has playback rate range, pause range, comfortable WPM range, lag tolerance range, perceptual pause bias, phrase length bias, boundary strictness bias, and semantic load bias. DE and ES do not get special pipelines. Future tuning changes calibration, not architecture.

### Phase 7: Runtime Execution Contract + V3 Report

Runtime and reports should expose:

- `adaptiveLevel`
- `pressureVector`
- `pacingOutput`
- `sampleQuality`
- `languageCalibration`
- requested vs actual rate
- requested vs actual pause
- phrase gap and chunk gap when available
- pause deferred and defer reason
- boundary type
- perceptual pause signal
- trace acceptance by use: benchmark, insight, runtime pressure, debug

Legacy labels can remain derived for compatibility/debug only:

```ts
function deriveAdaptiveLabel(level: number): string {
  if (level < 0.20) return 'legacy-recovery';
  if (level < 0.45) return 'legacy-support';
  if (level < 0.65) return 'legacy-guided';
  if (level < 0.85) return 'legacy-balanced';
  return 'legacy-flow';
}
```

Changing a derived label must not change outputs when `adaptiveLevel` and the pressure vector are identical.

## Incremental Implementation Order

1. Add central types and pure shadow model.
2. Wire shadow fields into `PacingDecision`, timeline points, decision traces, and reports without changing playback.
3. Replace sample acceptance with the universal gate.
4. Activate perceptual pause in Browser TTS planning first.
5. Move rate, phrase size, boundary, and replay outputs to the continuous mapper.
6. Gradually reduce report/UI dependence on legacy mode wording.

## Validation Targets

- Universal gate tests across all five languages.
- ES perceptual pause tests.
- DE normalized gate tests without preserving old DE outcomes as the new contract.
- Derived label independence tests.
- Output mapper tests for independent rate and pause movement.
- Planner/runtime tests for macro phrase vs chunk pause and deferred pause pressure.
- V3 report tests for continuous fields.

Run:

```bash
npm run test
npm run build
npm test -- browserTtsDeBenchmarkTolerance
npm test -- useTtsSessionSubmitAction
npm test -- browserTtsPlaybackPlan
npm test -- browserTtsPlaybackLoopPauseModel
npm test -- listeningCycleInsightReportV3
npm test -- adaptiveUserSystemReport
```
