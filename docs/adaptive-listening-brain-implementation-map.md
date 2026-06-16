# Adaptive Listening Brain Implementation Map

This is a thin index for the main implementation layers.

- Runtime controller: `src/core/adaptive/AdaptiveDictationController.ts`
- Contracts: `src/core/adaptive/types.ts`
- Reason helpers: `src/core/adaptive/pacingReasonCodes.ts`
- Controller registry: `src/app/adaptiveControllerRegistry.ts`
- Browser TTS runtime: `src/app/useAdaptiveRuntime.ts`
- TTS pacing helpers: `src/app/ttsPacingHelpers.ts`
- Browser TTS planning: `src/app/browserTtsPlaybackPlan.ts`
- Telemetry adapter: `src/inputs/browserTts/browserTtsTelemetryAdapter.ts`
- Browser profiles: `src/inputs/browserTts/browserTtsAdaptiveProfiles.ts`
- Rate policy: `src/inputs/browserTts/browserTtsRatePolicy.ts`
- Benchmark service: `src/core/adaptive/AdaptiveInputLanguageBenchmarkService.ts`
