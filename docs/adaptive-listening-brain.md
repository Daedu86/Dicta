# Adaptive Listening Brain

_Last updated: 2026-06-13_

This document is the canonical KB entry for Dicta's adaptive listening brain: the runtime layer that observes live dictation/listening telemetry and adapts Browser TTS pacing, phrase sizing, pause behavior, replay pressure, and language-scoped feedback.

The adaptive brain should be treated as one integrated block, not as isolated features. Its job is to keep the session in a productive listening zone: slow enough to recover from overload, stable enough to avoid noise, and explicit enough to explain why pacing changed.

## Current milestone: Browser TTS adaptive brain hardening

This milestone hardened the Browser TTS adaptive path without changing the product surface. The work focused on better telemetry, cleaner state boundaries, explicit language coverage, and safer decision reasons.

## Implemented improvements

### 1. Listening precision is now part of Browser TTS runtime telemetry

Browser TTS chunk planning now computes and forwards listening precision metrics into live telemetry. The adaptive controller can react to signals such as content-word recall and typed-vs-target listening fidelity instead of relying only on raw lag or generic accuracy.

This makes the adaptive brain more listening-first: the controller can detect that the user is missing important spoken content even when the typing surface still looks superficially acceptable.

### 2. Browser TTS chunk correction pressure is now inferred

Browser TTS now derives chunk-level correction pressure from evaluation output:

- fuzzy matches
- missed target words
- extra typed words
- chunk-local typed/target alignment

backspaceRate remains 0 in this path because Browser TTS planning does not yet receive raw key-level edit events. The current correction pressure is therefore inferred from final chunk evaluation, not from live keystroke history.

### 3. Adaptive controller state is scoped by input mode and language

The runtime no longer treats the adaptive controller as a single global mutable brain. Controller state is now scoped by inputMode + normalized language.

Examples:

- browser-tts:en
- browser-tts:de
- browser-tts:es
- browser-tts:fr
- browser-tts:pt

This prevents state contamination such as German struggle/recovery frames leaking into English, Spanish, French, or Portuguese sessions.

### 4. Scoped controller state resets on session start

Even within the same language, live controller state is reset when a new adaptive session begins. Historical performance still comes from benchmarks/history, but volatile runtime state such as support/recovery/balanced frames does not leak across sessions.

Separation rule:

- historical profile = long-term memory
- controller frame state = current-session working memory

### 5. Browser TTS language profiles are explicit for all supported languages

Browser TTS now has explicit adaptive profiles for all supported languages:

- en
- es
- de
- fr
- pt

French and Portuguese currently remain base-equivalent profiles. That is deliberate: the system now exposes the full language profile map without inventing unsupported tuning values.

### 6. Adaptive pacing decisions now expose structured reason codes

Adaptive decisions still preserve the legacy reason string for compatibility, but now also expose structured reasonCodes.

Preferred contract:

    decision.reasonCodes.includes('support-needed')

Legacy string checks are being phased out:

    decision.reason.includes('support-needed')

A transitional helper, hasPacingReason(...), supports both structured reasonCodes and legacy/mock decisions that only have reason.

### 7. Benchmark reason suffixes are normalized by exact token

Benchmark/recommendation suffixes such as de-target-rate-clamp are now appended and detected through exact legacy-token helpers instead of broad substring checks.

This keeps custom benchmark suffixes separate from core PacingReasonCode values while making matching safer.

### 8. Recovery pacing mode separates catch-up from generic support

The adaptive controller now has an explicit `recovery` pacing mode in addition to `support`, `balanced`, and `flow`.

`recovery` is reserved for catch-up pressure: the listener is clearly falling behind the spoken audio, but listening precision is still stable enough that the best intervention is a larger catch-up window rather than treating the chunk as a generic error state.

Recovery mode behavior:

- uses short phrases
- uses a longer ideal pause window
- maps to slow Browser TTS pacing, like support
- keeps support-like boundary strictness
- can emit replay pressure only when phrase replay is actually supported
- blocks immediate jump-back-to-flow after recovery
- exposes structured reason codes:
  - `mode-recovery`
  - `recovery-needed`
  - `extended-catch-up-window`
  - `flow-blocked-after-recovery`
  - `stable-recovery-confirmed`

Important separation rule:

- `support` remains the mode for low accuracy, high correction pressure, phrase overload, unsafe boundaries, and replay/error pressure.
- `recovery` is for lag/catch-up pressure with stable enough precision.
- `progressGap` can extend adaptive pause behavior, but it should not force `support` or `recovery` by itself without real lag pressure.

This prevents semantic-controller defaults or typed/spoken progress noise from downgrading otherwise healthy `balanced`/`flow` decisions.

## Current code map

The adaptive brain currently spans these main areas:

- src/core/adaptive/AdaptiveDictationController.ts
  Core pacing controller: mode, playbackRate, pauseMs, replay pressure, phrase size, reason/reasonCodes.

- src/core/adaptive/types.ts
  Adaptive contracts: PacingDecision, PacingReasonCode, live telemetry, language/input types.

- src/core/adaptive/pacingReasonCodes.ts
  Reason-code helpers: hasPacingReason, hasLegacyReasonToken, appendLegacyReasonToken.

- src/app/adaptiveControllerRegistry.ts
  Scoped controller registry: inputMode + language -> AdaptiveDictationController.

- src/app/useAdaptiveRuntime.ts
  Runtime lifecycle: controller registry, session feedback begin/end, history profile integration.

- src/app/ttsPacingHelpers.ts
  Adaptive-to-TTS mode mapping: recovery and support map to slow pacing, flow maps to flow, and balanced remains balanced.

- src/app/browserTtsPlaybackPlan.ts
  Browser TTS planning: chunk selection, listening precision, correction pressure, runtime decision integration.

- src/inputs/browserTts/browserTtsTelemetryAdapter.ts
  Browser TTS telemetry adapter: forwards listeningPrecision and correction/cadence signals into live frames.

- src/inputs/browserTts/browserTtsAdaptiveProfiles.ts
  Browser TTS adaptive profiles: explicit profile map for en/es/de/fr/pt.

- src/inputs/browserTts/browserTtsRatePolicy.ts
  Browser/mobile rate policies: floors, ceilings, Android fallback, support-pressure checks.

- src/core/adaptive/AdaptiveInputLanguageBenchmarkService.ts
  Historical benchmark/recommendation layer: long-term language/input performance, DE recommendation clamping, timeline diagnostics.

## Current validation baseline

The milestone was validated with focused tests and full project validation:

- npm run test
- npm run build

Final known baseline after the adaptive brain hardening and recovery pacing work:

- 76 test files passed
- 440 tests passed
- production build passed

## Current known boundaries and future improvements

### 1. Real backspaceRate from key/edit telemetry

Browser TTS correction pressure is currently inferred from chunk evaluation. A future runtime can capture raw edit/backspace events and feed a real backspaceRate into the live telemetry frame.

### 2. Evidence-based French and Portuguese tuning

French and Portuguese profiles are explicit but base-equivalent. Do not tune them by guesswork. They should be adjusted only after enough sessions show stable language-specific lag, accuracy, correction, and listening-precision patterns.

### 3. Reason-code migration for dynamic legacy tokens

Some reason strings remain dynamic by design, especially Android fallback/recovery tokens and trainer precision strings. These should be migrated only if they become stable domain codes.

### 4. ListeningTrainerPolicy reason model

ListeningTrainerPolicy still uses natural-language precision-pressure reasons. It is separate from PacingDecision.reasonCodes and should not be forced into the same enum until the trainer policy has its own stable reason-code contract.

### 5. Adaptive recovery tuning by semantic boundary

The current controller considers semantic completeness and replay boundaries, but future work can make recovery behavior more boundary-aware for clause, sentence, paragraph, and unsafe-boundary transitions.

### 6. UI/debug surfacing for structured reason codes

The runtime now has structured reason codes, but UI/debug surfaces can still be improved to show reason-code chips, pacing explanations, and before/after decision traces.

### 7. Longitudinal calibration by user/language/input

The benchmark layer can keep growing toward user-specific comfort curves per language and input mode, using stable historical profiles while keeping current-session state isolated.

## Operational rule

When changing this area, keep the adaptive brain as one coherent system:

    live telemetry -> scoped controller -> Browser TTS policies -> benchmark/history feedback -> debug/reporting

Avoid isolated tweaks that improve one metric while bypassing the listening-first model.
