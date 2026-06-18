# Adaptive Listening Brain Runtime

_Last updated: 2026-06-18_

Runtime facts:

- Browser TTS listening precision is part of runtime telemetry.
- Chunk correction pressure is inferred from evaluation output, not raw keystrokes.
- Controller state is scoped by `(inputMode, language)`.
- Controller state resets on session start.
- Supported Browser TTS profiles are explicit for `en`, `es`, `de`, `fr`, and `pt`.
- Structured `reasonCodes` are preferred over legacy string matching.
- The active adaptive motor is continuous: normalized telemetry -> universal sample quality -> pressure vector -> `adaptiveLevel` -> independent pacing outputs.
- `support`, `recovery`, `balanced`, and `flow` are compatibility/debug labels derived from `adaptiveLevel`; they must not drive rate, pause, chunk, boundary, or replay decisions directly.
- All Browser TTS languages use the same conceptual sample-quality gate. Benchmark remains strict, while session insight, telemetry learning, runtime pressure, and debug can accept partial samples by confidence/use.
- Language differences belong in `LanguageAdaptiveCalibration`, not separate DE/ES pipelines.

Code map:

- `src/core/adaptive/AdaptiveDictationController.ts`
- `src/core/adaptive/continuousAdaptiveListening.ts`
- `src/core/adaptive/continuousAdaptiveListeningTypes.ts`
- `src/core/adaptive/runtimeSampleQualityGate.ts`
- `src/core/adaptive/adaptivePressureVector.ts`
- `src/core/adaptive/adaptivePacingOutputMapper.ts`
- `src/core/adaptive/languageAdaptiveCalibration.ts`
- `src/core/adaptive/types.ts`
- `src/core/adaptive/pacingReasonCodes.ts`
- `src/app/adaptiveControllerRegistry.ts`
- `src/app/useAdaptiveRuntime.ts`
- `src/app/ttsPacingHelpers.ts`
- `src/app/browserTtsPlaybackPlan.ts`
- `src/inputs/browserTts/browserTtsTelemetryAdapter.ts`
- `src/inputs/browserTts/browserTtsAdaptiveProfiles.ts`
- `src/inputs/browserTts/browserTtsRatePolicy.ts`
- `src/core/adaptive/AdaptiveInputLanguageBenchmarkService.ts`
- `src/core/adaptive/browserTtsDeBenchmarkSamples.ts` and related DE files remain legacy compatibility/debug helpers; they are not the target runtime architecture.

Validation baseline:

- `npm run test`
- `npm run build`
