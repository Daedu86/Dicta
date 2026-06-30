# Adaptive Runtime Pacing Versions

_Last updated: 2026-06-30_

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

## V3 current: learner-paced safe chunks

V3 keeps pause pressure as an adaptive signal, but the learner-facing wait is no longer a fixed-duration delay or a hidden cumulative textarea. The runtime first decides whether the current chunk boundary is safe enough to expose as a learner-facing practice chunk. Unsafe internal TTS slices continue inside the current visible chunk until the next safe semantic boundary. If a safe boundary is reached, the next-chunk scheduler waits until the learner submits or skips the visible chunk, then honors the default 700 ms minimum mental rest before the next chunk starts. One learner action advances chunk practice:

- the learner submits or skips the current visible chunk.

Correct typing and timeout alone do not advance Browser TTS chunk practice. The final visible chunk uses `Finish session` and never auto-submits. The default minimum rest is a local browser preference editable from Adaptive Pace Layer Flow Step 5 / Playback loop. The 4000 ms anti-blocking fallback remains available for internal non-practice completion gates, not learner-facing chunk practice.

Current execution contract:

```text
pause intent: continuous adaptive pressure and V3 prosody buckets
safe pause: natural semantic/syntactic boundary
completion gate: manual Submit / Check or Skip chunk
minimum mental rest: default 700ms for safe pauses, editable in Flow Step 5
fallback: no timeout fallback for learner-facing practice chunks; default 4000ms remains for internal non-practice gates
telemetry: requestedPauseMs is the controller target; actualPauseMs is the resolved gate wait; pauseGateResolutionReason is completed, submitted, timeout, or no-gate
practice chunks: optional completed-session JSON records source/typed word ranges and submitted/skipped/legacy-timeout resolution
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
| Practice chunk state | `src/app/browserTtsPracticeChunks.ts`, `src/app/useBrowserTtsPracticeChunkRuntime.ts` |

## Follow-up

V3 is the current baseline. Future work should improve how benchmark data, completion-gated pause outcomes, and reports explain the learned comfort envelope without presenting safe pauses as guaranteed waits.
