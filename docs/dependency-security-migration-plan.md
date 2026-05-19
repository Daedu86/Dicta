# Dependency and Security Migration Plan

This plan tracks pending security and maintenance upgrades that were intentionally deferred from the low-risk lockfile refresh.

## 1) Optional Alignment Stack: `transformers` CVE-2026-1839

### Why this is deferred
- `pip-audit` reports a vulnerability in `transformers` for versions below `5.0.0rc3`.
- The current optional alignment stack is driven by `requirements-alignment.txt` and transitive `whisperx` dependencies.
- Upgrading directly to a release-candidate or a new major in this path can break alignment behavior and model compatibility.

### Risk in this repository
- Affected path is optional and used for local alignment workflows, not the core browser runtime.
- The repository already documents a guardrail: do not load untrusted Hugging Face or PyTorch checkpoints.
- Exploitability is higher if malicious checkpoint files are loaded.

### Safe migration procedure
1. Create an isolated branch for alignment-only dependency testing.
2. Build a clean Python 3.13 virtual environment for alignment.
3. Pin and test compatible package set with `transformers>=5.0.0rc3` (or stable `5.x` when available), plus matching `whisperx`/`torch`.
4. Run alignment smoke checks on trusted fixtures:
   - `python scripts/transcribe_align.py --audio fixtures/dummy.wav --output fixtures/sample-transcript.json --dry-run`
   - one real short alignment run with timestamps enabled.
5. Validate no regressions in:
   - transcript JSON schema
   - timestamp/segment quality
   - runtime stability and memory profile
6. Only after passing checks, update `requirements-alignment.txt` and document the tested matrix in `README.md`.

### Fallback if compatibility fails
- Keep current versions.
- Enforce stricter trust policy on checkpoint sources.
- Re-run migration when upstream stable versions align.

## 2) JavaScript Tooling Majors: `eslint@10`, `@eslint/js@10`, `@types/node@25`

### Why this is deferred
- These are major upgrades with potential lint-rule and type-surface changes.
- Current project is passing lint, tests, and build with `eslint@9` and `@types/node@24`.

### Safe migration procedure
1. Create a separate branch for lint/types major upgrades.
2. Upgrade majors one axis at a time:
   - `eslint` + `@eslint/js`
   - then `@types/node`
3. Run:
   - `npm run lint`
   - `npx tsc -b`
   - `npm run test`
   - `npm run build`
4. If lint rules change, limit fixes to minimal behavior-preserving edits.
5. Avoid touching dictation timing, TTS pacing, lag calculations, and benchmark semantics in this migration.

## 3) Ongoing hygiene

Run these checks in CI or before release:
- `npm ci`
- `npm audit --json`
- `npm run lint`
- `npx tsc -b`
- `npm run test`
- `npm run build`

For Python environments used in sidecars/alignment:
- `python -m pip_audit -r requirements.txt`
- `python -m pip_audit -r requirements-alignment.txt`
- `python -m pip_audit -r services/kokoro_tts/requirements.txt`
- `python -m pip_audit -r services/cosyvoice_cache/requirements.txt`
