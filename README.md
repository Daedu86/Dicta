# Dicta MVP (Local)

Real-time adaptive dictation trainer.

## Stack
- React + TypeScript + Vite
- Rule-based synchronization controller
- Local Python ingestion CLI (WhisperX + JSON schema validation)

## Quick Start
```bash
npm install
npm run dev
```

## Web MVP Flow
1. Load an audio file.
2. Load transcript JSON in this shape:
```json
{
  "words": [
    { "word": "hello", "start": 0.1, "end": 0.5 }
  ]
}
```
3. Start session and type what you hear.
4. Export session telemetry JSON.

## Local Ingestion Pipeline
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

## Tests
```bash
npm test
```

Included tests:
- Unit tests for sync controller (behind/ahead/repeat/hysteresis)
- Integration simulation test for convergence/no excessive oscillation
- Ingestion smoke test (`--dry-run`) for output schema path
