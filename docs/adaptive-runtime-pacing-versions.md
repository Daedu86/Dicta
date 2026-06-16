# Adaptive Runtime Pacing Versions

_Last updated: 2026-06-16_

This note records the runtime pacing evolution for Browser TTS dictation.

## V1 legacy: fixed conservative pacing

V1 used narrower hardcoded pacing windows and language-specific bootstraps.

```text
rate window: ~0.80-1.15
pause window: ~350-3200ms depending on mode/profile
EN warmup: language-specific startup behavior
state pauses: recovery/support/balanced/flow carried fixed low baselines
```

V1 was useful for early guardrails, but it was too rigid for users who fall behind, need longer reconstruction time, or behave differently per language.

## V2 current: adaptive comfort window

V2 keeps the same universal runtime states:

```text
recovery / support / balanced / flow
```

But it opens the executable comfort window and lets each `(inputMode, language)` float based on user history.

```text
rate window: 0.60-1.15
pause window: 1200-4000ms
EN warmup: removed
state pauses: widened and resolved through adaptive comfort when available
```

New adaptive layer:

```text
AdaptivePlaybackComfortProfile
```

It learns/derives:

- preferred rate range
- preferred pause range
- preferred phrase size
- state pause targets
- pressure vs stability confidence

## Product rule

Language profiles are bootstraps, not final truth.

```text
language profile = safe starting point
user language history = what tunes the experience
controller = applies the learned comfort profile live
runtime pipeline = makes the decision executable
```

## Affected code

| Area | Files |
| --- | --- |
| Comfort profile | `src/core/adaptive/adaptivePlaybackComfortProfile.ts` |
| Controller integration | `src/core/adaptive/AdaptiveDictationController.ts` |
| Pacing constants | `src/core/adaptive/adaptiveDictationControllerMath.ts` |
| Historical profile source | `src/core/history/HistoricalPerformanceService.ts` |
| Runtime defaults | `src/app/adaptiveRuntimeSessionUtils.ts` |
| Benchmark defaults/recommendations | `src/core/adaptive/inputLanguageBenchmarkDefaults.ts`, `src/core/adaptive/inputLanguageBenchmarkRecommendation.ts` |
| Browser TTS profiles | `src/inputs/browserTts/browserTtsAdaptiveProfiles.ts` |

## Follow-up

V2 is the new baseline. Future work should improve how benchmark data feeds the comfort profile directly and how reports explain the learned comfort window.
