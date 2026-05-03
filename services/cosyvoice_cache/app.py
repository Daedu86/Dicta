from __future__ import annotations

import json
import logging
from pathlib import Path

import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from cosyvoice_engine import check_runtime, synthesize_to_wav
from schemas import GenerateCacheRequest, GenerateCacheResponse

logger = logging.getLogger("dicta.cosyvoice")
app = FastAPI(title="Dicta CosyVoice2 Cache Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def repo_root() -> Path:
    # services/cosyvoice_cache/app.py -> repo root is two parents up from services/
    return Path(__file__).resolve().parents[2]


def cache_root() -> Path:
    return repo_root() / "public" / "tts-cache" / "cosyvoice"


@app.get("/health")
def health() -> dict:
    runtime = check_runtime()
    return {"ok": True, "configured": bool(runtime.get("configured", False)), "service": "cosyvoice-cache", "runtime": runtime}


@app.post("/api/cache/generate", response_model=GenerateCacheResponse)
def generate_cache(request: GenerateCacheRequest) -> GenerateCacheResponse:
    manifest = request.manifest.model_dump()
    language = str(manifest.get("language") or "unknown")
    phrases = list(manifest.get("phrases") or [])
    if not phrases:
        raise HTTPException(status_code=400, detail="Manifest has no phrases.")

    out_dir = cache_root() / language
    out_dir.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    generated = 0
    skipped = 0

    for phrase in phrases:
        phrase_id = str(phrase.get("id") or "")
        text = str(phrase.get("text") or "")
        if not phrase_id or not text.strip():
            skipped += 1
            continue
        digest = phrase_id.split(":", 1)[1] if ":" in phrase_id else phrase_id
        wav_path = out_dir / f"{digest}.wav"
        if wav_path.exists() and not request.overwrite:
            skipped += 1
            continue

        try:
            result = synthesize_to_wav(text=text, language=language, out_path=wav_path)
            # sanity: confirm it is readable wav
            _data, sr = sf.read(str(wav_path))
            phrase["audioUrl"] = f"/tts-cache/cosyvoice/{language}/{digest}.wav"
            phrase["durationMs"] = int(result.duration_ms)
            phrase["engine"] = result.engine
            generated += 1
            logger.info("Generated cache wav=%s sr=%s", wav_path.name, sr)
        except Exception as exc:
            logger.exception("CosyVoice cache generation failed phrase=%s", phrase_id)
            errors.append(f"{phrase_id}: {exc}")

    manifest_path = out_dir / "manifest.json"
    manifest_out = {"engine": manifest.get("engine", "qwen-cloud"), "language": language, "phrases": phrases}
    manifest_path.write_text(json.dumps(manifest_out, indent=2, ensure_ascii=False), encoding="utf-8")

    ok = generated > 0 and len(errors) == 0
    return GenerateCacheResponse(
        ok=ok,
        generatedCount=generated,
        skippedCount=skipped,
        language=language,
        outputDir=str(out_dir),
        manifestPath=str(manifest_path),
        errors=errors,
        notes={"cacheRoot": str(cache_root()), "repoRoot": str(repo_root())},
    )
