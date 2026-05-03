# Dicta Input #4: CosyVoice2 Cache Generator (Local Sidecar)

This service generates phrase-level WAV files for Dicta **Input #4** and writes them into:

`public/tts-cache/cosyvoice/{language}/{hash}.wav`

Dicta then plays those cached WAVs in the browser (no paid APIs).

## Run

1. Create a venv:

```powershell
cd services/cosyvoice_cache
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Add CosyVoice2 inference code

Edit `cosyvoice_engine.py` and implement `synthesize_to_wav(text, language, out_path)`.

This repo does not vendor CosyVoice checkpoints or pin the exact CosyVoice2 install because it depends on your collaborator's setup.

3. Start the server:

```powershell
uvicorn app:app --host 127.0.0.1 --port 8791
```

Or let Dicta start it via the UI button (dev server only).

## API

- `GET /health`
- `POST /api/cache/generate` with a manifest payload:
  - `engine`, `language`, `phrases[]` (`id`, `text`, `language`)

