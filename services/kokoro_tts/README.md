# Dicta Kokoro TTS Local

Local sidecar service for Input #3 - Kokoro TTS Local.

Native Kokoro languages in this project:
- `en`
- `es`

German (`de`) is not treated as native Kokoro support. The app should direct
German users to Input #2 browser TTS unless an experimental fallback is added.

## Run locally

```powershell
cd services/kokoro_tts
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python -m spacy download de_core_news_sm
python -m spacy download es_core_news_sm
uvicorn app:app --host 127.0.0.1 --port 8787
```

Health check:

```powershell
Invoke-RestMethod http://localhost:8787/health
```

## Kokoro model integration

The service tries `pykokoro` first, then the `kokoro` package. Fallback tones
are disabled by default so real Kokoro setup errors are visible.

Language handling:
- `en` uses native English Kokoro processing
- `es` uses native Spanish Kokoro processing
- `de` is rejected as non-native unless an explicit fallback path is enabled in a future change

The default voice maps to `af_sarah`. You can pass another installed Kokoro
voice from the Input #3 sidebar.

To explicitly allow fallback tones for pipeline debugging:

```powershell
$env:KOKORO_ALLOW_FALLBACK="true"
uvicorn app:app --host 127.0.0.1 --port 8787
```

For normal dictation testing, keep fallback disabled:

```powershell
Remove-Item Env:\KOKORO_ALLOW_FALLBACK -ErrorAction SilentlyContinue
```

## Cache

Generated audio is cached under:

```text
.cache/kokoro-tts/
```

The cache key is based on normalized text, voice, language, base speed, and the
local model version.

If you previously generated fallback tones, clear the cache:

```powershell
Remove-Item ..\..\.cache\kokoro-tts\*.wav
Remove-Item ..\..\.cache\kokoro-tts\cache-index.json
```
