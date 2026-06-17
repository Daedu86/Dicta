# Listening Cycle V3 Plan

_Last updated: 2026-06-17_

V3 keeps Dicta listening-first: the goal is not faster typing. The system should help the listener hear, segment, retain, reconstruct, and type what was heard.

## Product rule

```text
LLM generates training material.
Planner/chunker makes it listenable.
Runtime controls Browser TTS timing.
Telemetry explains listener state.
Reports close the loop for the next session.
```

Do not move runtime pacing into the LLM. Do not let the controller generate content.

## Phase 0 — baseline and migration guardrails

Scope:

- Keep V1/V2 docs as history.
- Treat V3 as the active improvement lane.
- Keep changes scoped to Browser TTS unless explicitly stated.
- Preserve `(inputMode, language)` isolation.

Deliverables:

- V3 plan document.
- Short docs index links.
- Legacy notes only moved/marked when a current replacement exists.

Validation:

- Docs-only changes do not require local test execution.

## Phase 1 — prosody-aware chunk contract

Goal: make chunks sound more human and easier to reconstruct.

Add planner/chunk metadata:

- `boundaryStrength`: `weak | clause | sentence | paragraph | unsafe`
- `pauseClass`: `micro | boundary | recovery`
- `semanticCompleteness`
- `syntacticRisk`
- `functionWordRisk`
- `replayStrategy`: `none | repeat-short | repeat-from-nucleus | repeat-with-preroll`
- `estimatedBreathGroupWords`

Rules:

- Prefer semantic/prosodic boundaries over fixed word counts.
- Keep short chunks for overload, not for all sessions.
- Avoid cutting after orphaned function words, determiners, prepositions, auxiliaries, or clitics.

Validation:

- Unit tests for comma, clause, sentence, unsafe, and long-fragment boundaries.
- Regression tests for English, Spanish, German, French, and Portuguese samples.

## Phase 2 — hierarchical pause model

Goal: stop treating every silence as the same control.

Introduce three pause layers:

- `microPauseMs`: punctuation and intra-sentence breath.
- `boundaryPauseMs`: safe chunk/sentence boundary.
- `recoveryPauseMs`: listener catch-up and repair.

Runtime rule:

```text
naturalness comes mostly from boundary placement + pause shape;
slow rate is support, not the first response to every struggle.
```

Validation:

- Tests for pause class mapping.
- Tests that support/recovery can extend pauses without permanently lowering flow pacing.

## Phase 3 — Browser TTS voice calibration

Goal: rate should mean realized pace, not only nominal `SpeechSynthesisUtterance.rate`.

Add per environment/voice calibration:

- voice id/name/lang/localService/default
- browser/platform/PWA fingerprint already available through `ttsEnvironment`
- nominal rate
- measured utterance duration
- estimated realized WPM
- stable comfort band per voice

Rules:

- Keep 0.60-1.15 as safe default window.
- Do not expose 1.5x as normal dictation unless calibration and history show stable precision.
- Prefer pause modulation before aggressive rate increases.

Validation:

- Pure tests for calibration math.
- Browser-only field diagnostics behind an explicit debug path.

## Phase 4 — listener model v3

Goal: adapt to the listener, not the keyboard.

Model separate signals:

- hearing/segmentation: omissions, substitutions, content-word recall
- reconstruction: word order, function words, late completion
- typing mechanics: WPM, correction pressure, backspace/edit rate
- environment: voice/browser/platform changes

Rules:

- Low WPM alone does not mean failure.
- High accuracy + high lag should prefer recovery/catch-up.
- Low content-word recall should prefer support/shorter chunks.
- Repeated function-word errors should change chunking/replay, not only speed.

Validation:

- Controller tests for support vs recovery vs balanced vs flow.
- Tests that typing speed cannot dominate listening precision.

## Phase 5 — surgical replay and recovery flow

Goal: repeat only what helps the listener reconstruct.

Replay strategies:

- `repeat-short`: replay the smallest safe phrase.
- `repeat-from-nucleus`: replay from the semantic nucleus.
- `repeat-with-preroll`: replay 1-3 context words before the error zone.

Browser TTS limitation:

- Browser TTS does not reliably support mid-utterance control, so replay should be planned as pre-chunked text, not live audio seeking.

Validation:

- Replay planning tests.
- Telemetry tests for replay reason and recovery transition.

## Phase 6 — telemetry and insight report v3

Goal: reports explain why Dicta adapted.

Add/report:

- current chunk boundary class
- pause class used
- replay strategy used
- realized voice pace when available
- reason-code chips
- listener-state summary: `hearing`, `reconstructing`, `catching-up`, `flowing`

Report language:

- Explain pacing as coaching.
- Do not frame slow typing as failure.
- Separate listener progress from TTS/browser environment changes.

Validation:

- Snapshot/unit tests for report sections.
- Guardrails that legacy labels do not leak into user-facing V3 copy.

## Phase 7 — docs cleanup

Goal: keep docs short and current.

Rules:

- `docs/README.md` points to current V3 docs.
- Old milestone docs stay as archive/history when still useful.
- Do not delete legacy docs until active docs cover the same contract.
- Keep README concise; deep implementation detail belongs under `docs/`.

## Implementation order

1. Add V3 docs and index link.
2. Add chunk metadata types and tests.
3. Wire metadata through planner without behavior change.
4. Add hierarchical pause resolver and tests.
5. Wire pause resolver into Browser TTS playback plan.
6. Add voice calibration math and telemetry fields.
7. Add listener model v3 decisions.
8. Add surgical replay planning.
9. Upgrade insight report.
10. Prune/move legacy docs only after replacements exist.

## Test commands

```bash
npm test
npm run build
```

For mobile/Browser TTS runtime changes:

```bash
npm run test:e2e:mobile
```
