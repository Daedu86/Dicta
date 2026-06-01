# Dicta (Local MVP)

Real-time, adaptive dictation trainer. Dicta runs locally (Vite + React) and adapts pace, chunking, and recovery behavior based on how you type, what language you are practicing, and what the current input mode can actually execute.

## Project Introduction For Agents

Start here before changing code: read `AGENTS.md` for repo rules, this `README.md` for product terminology, and `docs/architecture.md` for the current topology.

Dicta is an invite/admin-managed dictation trainer for practicing listening and typing across **4 inputs x 5 languages**. The current language set is `en`, `es`, `de`, `fr`, and `pt`. The four adaptive input modes are:

- Input #1 / `audio`: original uploaded/recorded audio plus a word-level transcript.
- Input #2 / `browser-tts`: browser `SpeechSynthesis`, adaptive chunking, and browser/OS voice behavior.
- Input #3 / `kokoro`: local Kokoro TTS sidecar. English and Spanish are native in this setup; German, French, and Portuguese are blocked/experimental until native model paths are confirmed.
- Input #4 / `qwen-cloud`: legacy name for the cached cloud-TTS path. The free local implementation now targets CosyVoice2 WAV cache files under `public/tts-cache/cosyvoice/{language}/`, with browser TTS fallback when cached audio is missing.

The Adaptive Pace Layer is the shared brain. Every benchmark, telemetry stream, recommendation, and session feedback package is scoped by `(inputMode, language)`, so `browser-tts/de` and `browser-tts/en` must be treated as separate profiles. The adaptive benchmark rolling window is **30 days** (`rollingWindowDays: 30`), and dashboard/leaderboard "Month" views also mean the last 30 days.

OpenRouter is used only for generating structured dictation scripts. The browser never receives an OpenRouter API key. Requests go through server routes in `api/openrouter/*`, only free OpenRouter model ids are accepted (`openrouter/free` or `*:free`), long requests use durable jobs in Supabase, and admins can allow/deny member OpenRouter access or pin a member to a single assigned free model.

Current access model:

- Local/dev or non-Supabase deployments can be protected with `DICTA_APP_PASSWORD` and `public/login.html`.
- Supabase deployments use invite/admin-created email/password users. There is no public self-signup flow in this repo.
- Admin profiles are unlimited and can manage members from the Admin workspace.
- Member profiles default to a 15-session limit, no OpenRouter access, and only their own synced rows.

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

## Vercel Deployment (Free-Tier Friendly)

Dicta can be deployed to Vercel as a static Vite app with lightweight OpenRouter API routes:

- Input #2 / Browser TTS works in the hosted app and keeps using browser `localStorage`.
- OpenRouter generation works through `/api/openrouter/models`, `/api/openrouter/chat`, and `/api/openrouter/jobs` when `OPENROUTER_API_KEY` is set in Vercel environment variables.
- Kokoro, WhisperX transcription, CosyVoice/Input #4 generation, and local file inventory remain local-only workflows.
- Hosted access is either Supabase Auth (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`) or the legacy `DICTA_APP_PASSWORD` middleware fallback.

Set the secret in Vercel before using OpenRouter in a hosted deployment:

```bash
vercel env add OPENROUTER_API_KEY production
vercel env add OPENROUTER_API_KEY preview
```

For Supabase-backed OpenRouter jobs and admin user management, also set `SUPABASE_SERVICE_ROLE_KEY` server-side only. Then deploy with the Vercel Git integration or CLI. The Vercel build runs `npm run build` and serves `dist/`.

### OpenRouter (Recommended: server-side key)

To use the OpenRouter workspace without exposing your API key to the browser, configure it on the local dev server:

```bash
cp .env.example .env.local
```

Set `OPENROUTER_API_KEY` in `.env.local`, then restart `npm run dev`.

Alternatively, open the **OpenRouter** workspace and use **Save to .env.local** / **Delete from .env.local** (dev-only) to manage the key from the UI.

## Typical Training Flow

1. Pick an input mode (audio playback, browser TTS, Kokoro, Qwen Cloud).
2. Provide content:
   - Audio mode: load an audio file plus a transcript JSON, or generate one via the ingestion pipeline.
   - TTS modes: provide text (Dicta will chunk it into semantic phrases).
   - OpenRouter mode: generate structured scripts for the selected `(inputMode, language)` using the current benchmark context.
3. Start a session and type what you hear.
4. The input adapter publishes live telemetry, the Adaptive Pace Layer decides rate/pause/chunk/recovery actions, and the active input engine applies what it can.
5. Export session telemetry/feedback as JSON (for iteration and model tuning).

## Training Mode: Recent Performance Changes (May 2026)

Focused Training Mode (`/training`) received a mobile/PWA performance pass, validated on Samsung S22 with the installed standalone app runtime.

- Input path reworked for low-latency typing:
  - `LowLatencyTextarea` now uses native textarea updates (uncontrolled input) instead of React state updates per key.
  - Parent state commits are delayed and flushed on key lifecycle boundaries (blur, pause/stop, submit, session change, unmount).
  - Session/input switches force synchronization and flush pending text before replacing visible value.
- Browser TTS runtime metrics publishing reduced:
  - Adaptive sampling still runs at `tickMs` for decision quality.
  - UI state publication (`lag/wpm/accuracy/rate/trend/controller`) is throttled to avoid full-tree rerenders on each tick.
  - Live evaluation uses the latest typed draft so adaptive decisions stay current even with deferred parent commits.
- Session persistence hot path reduced:
  - `dicta.sessions.v1` localStorage writes are debounced (`1500ms`) instead of writing every `sessions` mutation.
  - Immediate persistence is preserved for finalization flows (`Submit / Check`) and page lifecycle exits (`pagehide`, `beforeunload`, hidden visibility).

Measured result from S22 PWA diagnostics (before -> after):

- `keydown -> input`: ~`1ms` -> ~`1-3ms` (stable; hardware path already good)
- `input -> paint`: ~`117ms avg / 173ms p95` -> ~`10ms avg / 17ms p95`
- `LowLatencyTextarea` renders during run: `819` -> `167`
- Long task max duration: `556ms` -> `217ms`

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
  - Sessions list, Leaderboard, and Admin workspace are each filterable by EN/ES/DE/FR/PT, treating them as separate leaderboards and separate session lists.

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

### Inputs (4) x Languages (5)

Dicta's brain is shared across **4 input modes** and scoped by **language** (EN/ES/DE/FR/PT). Practically, that means the benchmarks, recommendations, and session feedback are tracked per:

`(inputMode, language)`

So "Browser TTS in German" is a different adaptive profile than "Browser TTS in English".
French (`fr`) and Portuguese (`pt`) are first-class languages for sessions, Browser TTS, transcription, generated scripts, sync, diagnostics, and adaptive profiles. Portuguese defaults to Brazilian Portuguese (`pt-BR`) for Browser TTS. Kokoro keeps French and Portuguese as non-native/experimental entries, like German, until native model paths are confirmed.

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

Dicta stores the primary browser-side project state in local storage and can optionally sync it to Supabase per profile:

- `dicta.sessions.v1`: sessions, telemetry series, and per-session stats
- `dicta.deletedSessionIds.v1`: local tombstone tracking for deleted sessions
- `dicta.adaptiveBenchmarks.v1`: rolling benchmark profiles per `(inputMode, language)`
- `dicta.adaptiveSessionFeedback.v1`: completed feedback packages per `(inputMode, language)`
- `dicta.perfDiagnostics.v1`: persisted diagnostics toggle for `?perf=1` mode in training
- `dicta.openrouterDefaultModel.v1`: selected default free OpenRouter model id
- `dicta.openrouterGeneratedVariants.v1`: generated script drafts for the two OpenRouter slots
- `dicta.openrouterActiveJobs.v1`: client-side tracking for in-flight durable OpenRouter jobs
- `dicta.kokoroEnabled.v1`: local Kokoro feature toggle
- `dicta.workspaceMode.v1`, `dicta.liveMetricsLanguage.v1`, `dicta.liveMetricsRange.v1`, `dicta.leaderboardLanguage.v1`, `dicta.adminLanguage.v1`: UI/workspace preferences

OpenRouter credentials are intentionally **not** stored in `localStorage`. The dev server proxies OpenRouter requests using `OPENROUTER_API_KEY` from `.env.local`.

Optional Supabase sync keeps the primary stores synced across devices. The original setup in `docs/supabase-sync.sql` is single-profile; the multiuser setup uses Supabase Auth plus `dicta_app_profiles` and RLS from `supabase/migrations/20260519000000_dicta_multiuser_auth.sql`. See `docs/supabase-multiuser-auth.md` before enabling invite/admin-created accounts.

Set these env vars locally and in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_SYNC_PROFILE_ID`

Durable mobile OpenRouter generation also uses Supabase from server routes. Create `dicta_openrouter_jobs` with `docs/supabase-openrouter-jobs.sql` and add this server-only Vercel/local env var:

- `SUPABASE_SERVICE_ROLE_KEY`

OpenRouter access is resolved from the signed-in `dicta_app_profiles` row. Admins always have access. Members require `can_access_openrouter = true`; if `assigned_openrouter_model` is set, the server rejects any other requested model.

Vercel note: `VITE_*` env vars are baked in at build time, so after changing them you must redeploy before your phone sees sync enabled.

To stay inside Supabase's free tier, the browser does one full sync pull at startup and then uses incremental background pulls for rows updated since the last remote timestamp, with a periodic full refresh every hour for clock-skew safety. Durable OpenRouter job rows are pruned opportunistically after 14 days when a new job is created.

CLI helper (Windows): `scripts/setup_supabase_sync.ps1` links a project and applies the SQL after substituting your chosen profile id.

## Local Ingestion Pipeline (WhisperX)

Install core Python dependencies:

```bash
pip install -r requirements.txt
```

Install the optional full local alignment stack (WhisperX + torch):

```bash
pip install -r requirements-alignment.txt
```

Generate transcript from audio (full local alignment):

```bash
python scripts/transcribe_align.py --audio path/to/audio.mp3 --output fixtures/my-transcript.json --model small
```

Dry run (smoke mode, no WhisperX needed):

```bash
npm run ingest:dryrun
```

Security note for local alignment:

- The WhisperX/torch alignment stack is optional and isolated in `requirements-alignment.txt`.
- That optional stack may currently resolve to vulnerable `transformers` versions until upstream ML dependencies are compatible with a stable patched release.
- Do not load untrusted Hugging Face or PyTorch checkpoints, and do not resume runs from unknown checkpoint directories.

## Docs

- `ARCHITECTURE.md`: short pointer for agents/tools looking for a root architecture file.
- `docs/architecture.md`: topology + data flow diagrams (repo-owned source of truth).
- `docs/android-pwa-performance-debugging.md`: S22/PWA diagnostics workflow, `?perf=1` activation, and remote debugging notes.

## Known Gaps After The Recent Training Changes

- Training Mode still rerenders `App`/`TrainingView` frequently during long Browser TTS runs; visible typing is now fast, but tree-level render volume can still be reduced.
- Some long tasks still appear around session persistence and high-volume telemetry updates in longer sessions.
- Perf diagnostics are available in `DEV` or via `?perf=1`, but there is no export button in UI yet; snapshots are currently console-driven (`window.__DICTA_PERF__.snapshot()`).
- Perf docs exist for Android/PWA debugging, but there is no automated benchmark gate in CI for typing-latency regressions.

## Tests

```bash
npm test
```

Test coverage currently includes:

- Unit tests for the sync controller (behind/ahead/repeat/hysteresis).
- Integration simulation test for convergence / no excessive oscillation.
- Ingestion smoke test (`--dry-run`) for output schema path.
