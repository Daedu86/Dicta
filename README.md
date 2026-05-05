# Dicta (Local MVP)

Real-time, adaptive dictation trainer. Dicta runs locally (Vite + React) and adapts pace, chunking, and recovery behavior based on how you type, what language you are practicing, and what the current input mode can actually execute.

This repo contains:

- A browser app for running dictation sessions and exporting telemetry.
- A local ingestion pipeline to create word-level aligned transcripts from audio (WhisperX).
- A centralized "brain" that continuously chooses pacing actions (the **Adaptive Pace Layer**).

## Stack

- React + TypeScript + Vite
- Rule-based sync controller + adaptive pacing layer (heuristics/telemetry driven)
- Local Python ingestion CLI (WhisperX + schema validation)

## Quick Start

```bash
npm install
npm run dev
```

## Typical MVP Flow

1. Pick an input mode (audio playback, browser TTS, Kokoro, Qwen Cloud).
2. Provide content:
   - Audio mode: load an audio file plus a transcript JSON, or generate one via the ingestion pipeline.
   - TTS modes: provide text (Dicta will chunk it into semantic phrases).
3. Start a session and type what you hear.
4. Export session telemetry/feedback as JSON (for iteration and model tuning).

## What's New Since `v0.1.0-baseline` (May 3, 2026)

This repo moved from "adaptive on paper" to "adaptive in execution", especially for Browser TTS.

- Browser TTS (Input #2) is now truly adaptive:
  - Word-cursor driven playback that recomputes pacing decisions before every chunk.
  - Dynamic sub-chunk planner so `nextPhraseSize` actually changes what gets spoken.
  - No automatic phrase replay for Browser TTS (replay intent is converted into recovery: shorter chunks, slower rate, longer pauses).
  - Simple anti-oscillation: fast degrade when struggling, gradual ramp-up when recovering.
- Adaptive Pace Layer workspace is now a real control room:
  - Modern charts (sweet spot gauge, target zone, mini trends).
  - Benchmarks and session feedback exports are grouped and deeply sectioned (7.x) with minimize/expand toggles.
  - The "Adaptive Pace Layer" button from training/TTS now deep-links to Section 7.2.4 (Session Feedback) for the current input/language.
- Language-scoped views:
  - Sessions list, Leaderboard, and Admin workspace are each filterable by EN/ES/DE, treating them as separate leaderboards and separate session lists.

## Transcript Format (Audio Mode)

Dicta expects word-level timestamps:

```json
{
  "words": [
    { "word": "hello", "start": 0.1, "end": 0.5 }
  ]
}
```

## The Brain: Adaptive Pace Layer ("Adaptative Pace Layer")

The Adaptive Pace Layer is the centralized control loop that keeps Dicta feeling "alive". It takes live signals from the user session (accuracy, lag, WPM, corrections), combines them with historical profile/benchmarks, considers the current language and semantic boundaries, and outputs concrete pacing actions the active input can execute.

At a high level, on each phrase/tick it does:

1. Normalize live session telemetry into a `LiveTelemetryFrame` (per input mode).
2. Load or update the rolling benchmark for `(inputMode, language)` and the user’s historical profile.
3. Decide pacing actions (playback rate, pause/replay behavior, next phrase size, boundary strictness).
4. Apply those actions in the active input engine (audio/TTS) and record what actually happened.
5. Persist timeline/metrics so the system can improve over time and so you can debug behavior later.

### What It Can Control

- Playback rate (smoothed, bounded).
- Whether to pause now vs defer until a safe semantic boundary.
- Whether to replay the current phrase (when supported and semantically safe).
- Next phrase size (short/medium/long) based on overload, difficulty, and semantic completeness.
- Boundary strictness (sentence/clause/phrase) to avoid unsafe cuts in different languages.

### Inputs (4) x Languages (3)

Dicta's brain is shared across **4 input modes** and scoped by **language** (EN/ES/DE). Practically, that means the benchmarks, recommendations, and session feedback are tracked per:

`(inputMode, language)`

So "Browser TTS in German" is a different adaptive profile than "Browser TTS in English".

### Why Language Matters

Dicta does not only "speed up / slow down". For TTS-like modes it also plans **semantic phrases** with language-aware heuristics (punctuation, discourse markers, unsafe cut pairs). That gives the brain real boundaries to respect when deciding when to pause or replay, and it prevents training on broken fragments.

## Code Map (Where To Modify The Brain)

If you are improving the Adaptive Pace Layer, start here:

- `src/core/adaptive/types.ts`
  - Shared types: `LiveTelemetryFrame`, `HistoricalPerformanceProfile`, `AdaptivePacingInput`, `PacingDecision`,
    timeline points, benchmark metrics, feedback payloads.
- `src/core/adaptive/AdaptiveDictationController.ts`
  - The decision policy: chooses `support | balanced | flow` and outputs `PacingDecision` (rate, pause, replay, next phrase size, boundary strictness).
- `src/core/adaptive/SemanticPhrasePlanner.ts`
  - Language-aware semantic chunking and phrase scoring (boundary types, semantic completeness, difficulty).
- `src/core/adaptive/AdaptiveInputLanguageBenchmarkService.ts`
  - Rolling, per-(input, language) benchmark updater (timeline, weak areas, recommendation, fidelity/recovery scores).
- `src/core/adaptive/sessionFeedback.ts`
  - Post-session feedback synthesis (improvement deltas, playback issues, diagnostics) and JSON export payload shaping.
- `src/core/adaptive/dictationScriptPrompt.ts` and `src/core/adaptive/dictationScriptValidation.ts`
  - Dictation script generation/formatting helpers and validation for structured content sources.
- `src/core/adaptive/benchmarkJson.ts`
  - Import/export helpers for benchmark artifacts.

The brain is fed by input-specific adapters:

- `src/inputs/*/*TelemetryAdapter.ts`
  - Converts raw engine/session signals into `LiveTelemetryFrame` and `AdaptivePacingInput`.

Browser TTS adaptive chunking lives here:

- `src/inputs/browserTts/ttsDynamicChunkPlanner.ts`
  - Sub-splits macro semantic phrases into dynamic spoken chunks based on the latest controller decision.
- `src/inputs/browserTts/browserTtsTelemetryAdapter.ts`
  - Declares Browser TTS capabilities (notably: `supportsPhraseReplay: false`) and normalizes live signals.

And it is grounded by history and session storage:

- `src/core/history/HistoricalPerformanceService.ts`
  - Aggregates prior sessions into a `HistoricalPerformanceProfile`.
- `src/App.tsx`
  - Wires the loop together: calls phrase planning, decision, application, and benchmark updates; persists state to `localStorage`.

## Local Storage Keys (MVP Persistence)

Dicta stores everything in browser local storage for the MVP:

- `dicta.sessions.v1`: sessions, telemetry series, and per-session stats
- `dicta.adaptiveBenchmarks.v1`: rolling benchmark profiles per `(inputMode, language)`
- `dicta.adaptiveSessionFeedback.v1`: completed feedback packages per `(inputMode, language)`

## Local Ingestion Pipeline (WhisperX)

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Generate transcript from audio (full local alignment):

```bash
python scripts/transcribe_align.py --audio path/to/audio.mp3 --output fixtures/my-transcript.json --model small
```

Dry run (smoke mode, no WhisperX needed):

```bash
npm run ingest:dryrun
```

## Docs

- `docs/architecture.md`: topology + data flow diagrams (repo-owned source of truth).

## Tests

```bash
npm test
```

Test coverage currently includes:

- Unit tests for the sync controller (behind/ahead/repeat/hysteresis).
- Integration simulation test for convergence / no excessive oscillation.
- Ingestion smoke test (`--dry-run`) for output schema path.
