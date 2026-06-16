# Adaptive Listening Brain Runtime

_Last updated: 2026-06-16_

Runtime facts:

- Browser TTS listening precision is part of runtime telemetry.
- Chunk correction pressure is inferred from evaluation output, not raw keystrokes.
- Controller state is scoped by `(inputMode, language)`.
- Controller state resets on session start.
- Supported Browser TTS profiles are explicit for `en`, `es`, `de`, `fr`, and `pt`.
- Structured `reasonCodes` are preferred over legacy string matching.
- `recovery` is separate from `support` and is reserved for lag/catch-up pressure with stable precision.

Code map:

- `src/core/adaptive/AdaptiveDictationController.ts`
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

Validation baseline:

- `npm run test`
- `npm run build`
