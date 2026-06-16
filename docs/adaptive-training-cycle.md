# Adaptive Training Cycle

_Last updated: 2026-06-16_

This document is the starting point for iterating on Dicta's adaptive listening system. It connects the existing architecture docs into one operational cycle: generation, prescription, planning, controller decisions, Browser TTS execution, benchmark memory, feedback, and insight reporting.

Related docs:

- [Dicta Architecture](./architecture.md) — repo-wide ownership, runtime boundaries, and the short adaptive brain loop.
- [Adaptive Listening Brain](./adaptive-listening-brain.md) — runtime controller, Browser TTS pacing, scoped controller state, language profiles, reason codes, and long-term brain hardening notes.
- [Listening-First Architecture](./listening-first-architecture.md) — product language, listening precision metrics, policy guardrails, and Precision/Stabilize/Challenge semantics.

## One-line model

Dicta is not just an LLM generator. It is a closed adaptive listening loop:

```text
Benchmark + Feedback
  -> ListeningTrainerPolicy / Training Prescription
  -> LLM Session Generation
  -> Pre-TTS Planner / Chunk Planner
  -> AdaptiveDictationController
  -> Runtime Decision Pipeline
  -> Browser TTS
  -> Telemetry
  -> Benchmark + Feedback
  -> Adaptive Insight Report
```

## Component responsibilities

| Component | Owns | Must not own |
| --- | --- | --- |
| Benchmark | Long-term memory per `(inputMode, language)` | Current-session mutable pacing state |
| Feedback | Post-session diagnosis and next-session pressure | Direct Browser TTS execution |
| ListeningTrainerPolicy / Training Prescription | Converts benchmark + feedback + user intent into the pedagogical recipe | Network calls, localStorage, cross-language averaging, runtime playback |
| LLM generation | Structured training material that follows the prescription | Live pacing, recovery, chunking, Browser TTS speed, pause decisions |
| Pre-TTS planner / Chunk planner | Converts macro text into safe playable chunks | Global recovery/challenge decisions |
| AdaptiveDictationController | Live adaptive brain: rate, pause, phrase size, boundary strictness, pacing mode, reason codes | Generating new content or persisting benchmark data |
| Runtime Decision Pipeline | Makes the controller decision executable for Browser TTS, mobile, and language-specific fallback rules | Hiding changes without traceability |
| Browser TTS | SpeechSynthesis execution and voice/environment behavior | Pedagogical policy |
| Telemetry | Observable runtime facts for the current session | Long-term recommendations by itself |
| Adaptive Insight Report | Explains and exports the full cycle for debugging and iteration | Acting as the direct LLM prompt |

## Full cycle

### 1. Benchmark and feedback provide memory

The benchmark is the durable profile for one `(inputMode, language)` pair. For Browser TTS this means language-specific profiles such as:

```text
browser-tts:en
browser-tts:es
browser-tts:de
browser-tts:fr
browser-tts:pt
```

Feedback is the diagnosis of a completed or recent session. Together they answer:

- What has this learner historically handled in this language/input mode?
- What happened in the latest session?
- Is the latest feedback current, stale, missing, or environment-shifted?
- Are weak areas learner-side, system-side, environment-side, or mixed?

Iteration target: improve benchmark and feedback so they expose confidence, recency, sample quality, environment changes, weak areas, and next-session pressure without mixing languages or input modes.

### 2. ListeningTrainerPolicy produces the recipe

`ListeningTrainerPolicy` converts benchmark context, latest feedback, and user intent into a `ListeningTrainingPrescription`.

User intent is not an absolute command. `Challenge` can be downgraded to stabilization or recovery when precision pressure is high. `Precision` can request recovery behavior. `Stabilize` can protect flow without forcing hard content.

The prescription should answer:

- requested mode vs resolved mode
- requested difficulty vs resolved difficulty
- target rate range
- target pause
- target phrase size
- semantic boundary policy
- weak areas to address
- content guidance for the LLM
- safety downgrade reasons, if any

Iteration target: make the prescription more explicit and auditable, especially when the system changes the user's requested mode for safety.

### 3. LLM generation creates macro session content

The LLM generates structured training material only. It receives the compact adaptive prompt and the prescription context, then returns a `DictationScript`-compatible session.

The LLM should create:

- session text
- macro phrases
- difficulty-compatible content
- language-appropriate vocabulary and syntax
- content that can be chunked safely later

The LLM should not decide live playback speed, pauses, recovery, replay, or Browser TTS execution. Those belong to the runtime adaptive layer.

Iteration target: add or improve generation compliance auditing:

```text
requested mode -> resolved prescription -> generated session -> compliance score
```

This lets the system distinguish between:

- a good prescription but bad generation
- a good generation but bad chunking
- a good generated session but unsafe runtime pacing
- a correct runtime downgrade caused by learner pressure

### 4. Pre-TTS planner turns macro phrases into playable chunks

Generated phrases are macro training material. Browser TTS does not have to speak them exactly as generated. The pre-TTS planner/chunk planner converts macro text into playable chunks.

The planner owns:

- chunk text
- word count
- boundary type
- semantic completeness
- phrase difficulty
- whether it is safe to pause after the chunk
- language-specific unsafe boundary rules
- recovery-safe chunking behavior

The important distinction is:

```text
Macro phrase = generated training material
Playable chunk = the actual piece Browser TTS will speak now
```

Iteration target: treat the planner as a first-class component and expose planner traces:

- why the chunk was cut there
- whether the boundary was sentence, clause, minor, or unsafe
- whether recovery-safe boundary rules applied
- whether German short bias or other language-specific rules applied
- whether the controller forced a replan with a smaller phrase size

### 5. AdaptiveDictationController is the live brain

The controller observes current-session telemetry and emits a pacing decision.

It owns live decisions such as:

- pacing mode: support, recovery, balanced, flow
- playback rate
- pause after phrase
- next phrase size
- boundary strictness
- whether to defer pause until a safe boundary
- reason codes explaining the decision

The controller combines current live signals with historical context, but its volatile state must remain current-session scoped. Long-term memory belongs to benchmark/profile state.

Iteration target: improve controller decision traces:

```text
signals in -> previous state -> decision -> final reason codes
```

This makes it clear why Dicta slowed down, inserted a longer pause, reduced chunk size, or blocked a challenge transition.

### 6. Runtime decision pipeline makes the decision executable

The controller decision is the pedagogical/live adaptive intent. The runtime decision pipeline turns it into something Browser TTS can safely execute.

The pipeline may apply:

- runtime rate floor
- unsafe boundary policy
- mobile fallback
- language-specific recovery policy
- DE recommendation clamp
- Browser TTS environment constraints

The distinction is:

```text
Controller decision = ideal adaptive decision
Runtime execution decision = final safe executable decision
```

Iteration target: make before/after runtime changes visible in diagnostics so the report can explain when Browser TTS executed a modified version of the controller decision.

### 7. Browser TTS executes the final audio experience

Browser TTS is the execution layer. It speaks the final planned chunk with the final runtime rate and pause behavior.

Browser TTS environment metadata matters because SpeechSynthesis varies by browser, operating system, PWA mode, selected voice, local service availability, and language voice coverage.

The insight report should retain Browser TTS metadata in a structured environment section:

- input mode
- language
- selected voice name/lang/voiceURI/localService/default
- available voice count
- matching language voice count
- platform/PWA/mobile/browser fingerprint summary
- environment changed flag
- language-specific runtime diagnostics

Iteration target: keep this metadata summarized and explicit, not buried inside raw debug dumps.

### 8. Telemetry updates benchmark and feedback

Runtime telemetry is the bridge back into memory. It should capture what actually happened, not only what the system intended.

Useful telemetry categories:

- listening precision
- content-word recall
- function-word accuracy
- word order accuracy
- completion-window timing
- lag and catch-up pressure
- correction pressure
- phrase/chunk boundary quality
- unsafe boundary pressure
- final runtime rate and pause
- Browser TTS environment state

Iteration target: separate learner issues, system/planner issues, controller/runtime issues, and environment issues before updating recommendations.

### 9. Adaptive Insight Report explains the loop

The adaptive insight report is a diagnostic/export artifact. It is not the direct LLM prompt.

It should explain:

```text
what the user requested
-> what the policy prescribed
-> what the LLM generated
-> how the planner chunked it
-> how the controller reacted
-> what the runtime actually executed
-> what benchmark/feedback learned
-> what should happen next
```

The report should stay as one button in the UI, but internally it should be layered:

1. executive summary
2. adaptive loop breakdown
3. component diagnostics
4. user progress summary
5. adaptive system summary
6. compact technical debug summary
7. raw technical debug at the end

Iteration target: improve clarity without multiplying buttons or turning the report into an oversized timeline dump.

## Symptom-to-component map

Use this table to decide where to iterate first.

| Symptom | Start here | Why |
| --- | --- | --- |
| Generated content is too easy/hard | `ListeningTrainerPolicy`, OpenRouter generation prompt, generation compliance | The recipe or LLM output is wrong before runtime begins |
| User requested Challenge but got easier behavior | `ListeningTrainerPolicy`, benchmark confidence, feedback pressure | Challenge is intent, not an absolute command |
| Audio cuts feel unnatural | Pre-TTS planner / chunk planner | The playable chunk boundary may be unsafe or semantically incomplete |
| Pauses are too short/long during the session | `AdaptiveDictationController`, runtime decision pipeline | The live brain or final execution policy is changing pause behavior |
| Speed changes feel surprising | Controller decision traces, runtime execution traces | Need to distinguish ideal decision from Browser TTS executable decision |
| German feels overly conservative | Browser TTS DE profile, benchmark confidence, unsafe-boundary pressure | DE has extra recovery and boundary safeguards |
| Spanish/English/other language recommendation feels stale | Benchmark recency, feedback recency, environmentChanged | The memory may be old or based on a changed Browser TTS environment |
| Insight report is hard to read | Report schema, component summaries, compact debug summary | The cycle is not being explained in the right order |
| User is blamed but TTS was unstable | Browser TTS environment metadata, runtime diagnostics | The issue may be voice/browser/platform rather than learner ability |

## Improvement roadmap

### Phase 1: Contracts and traces

Add/strengthen:

- generation compliance
- planner trace
- controller decision trace
- runtime execution trace
- benchmark recency and sample quality
- feedback freshness

Goal: every session can explain what happened without guessing.

### Phase 2: Insight Report v2 maturity

Keep one UI button, but make the report read like the cycle:

```text
requested -> prescribed -> generated -> planned -> controlled -> executed -> learned
```

Goal: debugging starts from the report, not from scattered localStorage dumps.

### Phase 3: Planner v2

Improve semantic chunking by language:

- boundary quality score
- unsafe boundary rate
- max comfortable words per chunk
- recovery-safe boundary policy
- language-specific chunk rules backed by evidence

Goal: improve the auditory experience before tuning rate/pause too aggressively.

### Phase 4: Benchmark v2

Move toward an auditory comfort profile per `(inputMode, language)`:

- best rate range by accuracy band
- best pause by chunk size
- safe boundary threshold
- max comfortable words per chunk
- recovery rate floor
- challenge readiness
- stability confidence
- last reliable sample timestamp

Goal: recommendations should describe what the learner can actually hear and reconstruct.

### Phase 5: Controller tuning

Tune after traces exist:

- entering/exiting support
- entering/exiting recovery
- allowing challenge
- growing from short to medium chunks
- weighting completion-window pressure
- weighting content-word recall vs raw accuracy

Goal: avoid tuning blind. Controller changes should be measurable and explainable.

## Iteration rules

1. Keep all adaptive behavior scoped by `(inputMode, language)`.
2. Do not let Browser TTS German recovery logic leak into English, Spanish, French, or Portuguese.
3. Do not treat WPM as the main product target; it is diagnostic.
4. Do not let the LLM own runtime pacing.
5. Do not let the controller generate content.
6. Do not hide runtime modifications to controller decisions.
7. Do not expand the insight report with raw data when a compact aggregate explains the same thing better.
8. When a behavior changes, update the doc that owns that layer and link back here.

## Code owner map

Primary files to inspect when iterating:

| Area | Files |
| --- | --- |
| Generation presets/buttons | `src/app/openRouterDirectGenerationPresets.ts`, `src/app/useFocusedTrainingGenerationButtons.ts` |
| Direct generation job planning | `src/app/openRouterDirectGenerationJobPlan.ts` |
| Compact adaptive prompt | `src/core/adaptive/openRouterGenerationPrompt.ts` |
| Training prescription | `src/core/adaptive/ListeningTrainerPolicy.ts`, `src/core/adaptive/listeningTrainerPolicyPacing.ts` |
| Controller brain | `src/core/adaptive/AdaptiveDictationController.ts` |
| Browser TTS playback planning | `src/app/browserTtsPlaybackPlan.ts` |
| Runtime decision pipeline | `src/app/browserTtsPlaybackDecisionPipeline.ts` |
| Chunk planner | `src/inputs/browserTts/ttsDynamicChunkPlanner.ts` |
| Browser TTS language profiles | `src/inputs/browserTts/browserTtsAdaptiveProfiles.ts` |
| Benchmark service | `src/core/adaptive/AdaptiveInputLanguageBenchmarkService.ts` |
| Listening precision | `src/core/adaptive/listeningPrecisionMetrics.ts` |
| Adaptive report | `src/core/adaptive/adaptiveUserSystemReport.ts`, `src/core/adaptive/adaptiveUserSystemReportTypes.ts` |
| Report copy action/UI | `src/app/useAdaptiveExportActions.ts`, `src/components/runtime-workspaces/LiveMetricsDock.tsx` |

## Source-of-truth summary

```text
LLM = creates compatible training material.
Prescription = pedagogical source of truth for generation.
Planner = converts macro text into safe playable chunks.
Controller = live adaptive brain.
Runtime pipeline = final executable Browser TTS decision.
Browser TTS = audio execution and environment constraints.
Benchmark = long-term memory per language/input mode.
Feedback = recent completed-session diagnosis.
Insight report = readable/debuggable export of the whole cycle.
```
