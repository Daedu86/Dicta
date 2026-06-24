# Adaptive Runtime Pacing Versions

_Last updated: 2026-06-24_

This note records the runtime pacing evolution for Browser TTS dictation.

## V1 legacy: fixed conservative pacing

V1 used narrower hardcoded pacing windows and language-specific bootstraps.

```text
rate window: ~0.80-1.15
historical pause envelope: ~350-3200ms depending on mode/profile
EN warmup: language-specific startup behavior
state pauses: recovery/support/balanced/flow carried fixed low baselines
```

V1 was useful for early guardrails, but it was too rigid for users who fall behind, need longer reconstruction time, or behave differently per language.

## V2 historical: adaptive comfort window

V2 keeps the same universal runtime states:

```text
recovery / support / balanced / flow
```

But it opens the executable comfort window and lets each `(inputMode, language)` float based on user history.

```text
rate window: 0.60-1.15
historical pause envelope: 1200-4000ms
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

## V3 current: completion-gated safe pauses

V3 keeps pause pressure as an adaptive signal, but the learner-facing wait is no longer a fixed-duration delay. The runtime first decides whether the current chunk boundary is safe enough to pause. If it is safe and a pause is requested, the next-chunk scheduler waits for a default 700 ms minimum mental rest and then only until one of these happens:

- the learner's typed text covers the current chunk with normalized/tolerant matching;
- the default 4000 ms anti-blocking fallback expires.

Unsafe or incomplete boundaries do not become wait points. The runtime continues toward a safer clause or sentence boundary instead of making unnatural mid-phrase silence part of the training experience. The default minimum rest and max fallback are local browser preferences editable from Adaptive Pace Layer Flow Step 5 / Playback loop.

Current execution contract:

```text
pause intent: continuous adaptive pressure and V3 prosody buckets
safe pause: natural semantic/syntactic boundary
completion gate: typed chunk coverage with tolerant matching
minimum mental rest: default 700ms for safe pauses, editable in Flow Step 5
fallback: default 4000ms maximum wait before advancing, editable in Flow Step 5
telemetry: requestedPauseMs is the controller target; actualPauseMs is the resolved gate wait; pauseGateResolutionReason is completed, timeout, or no-gate
interpretation: completed records the real resolved wait but does not count as adaptive pause shortfall pressure
```

## Product rule

Language profiles are bootstraps, not final truth.

```text
language profile = safe starting point
user language history = what tunes the experience
controller = applies the learned comfort profile live
runtime pipeline = makes the decision executable
next-chunk scheduler = applies completion-gated safe pauses using Step 5 local settings
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
| Completion-gated scheduling | `src/app/browserTtsNextChunkScheduler.ts`, `src/app/browserTtsChunkCompletionGate.ts` |

## Follow-up

V3 is the current baseline. Future work should improve how benchmark data, completion-gated pause outcomes, and reports explain the learned comfort envelope without presenting safe pauses as guaranteed waits.
