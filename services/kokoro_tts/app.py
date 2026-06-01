from __future__ import annotations

import logging
import re

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from cache import audio_path, cache_key, public_audio_path, read_manifest, write_manifest_entry
from kokoro_engine import check_runtime, fallback_enabled, synthesize_to_wav
from schemas import TtsChunkRequest, TtsChunkResponse

logger = logging.getLogger("dicta.kokoro")
app = FastAPI(title="Dicta Kokoro TTS Local")
CACHE_KEY_RE = re.compile(r"^[a-f0-9]{32}$")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    runtime = check_runtime()
    return {
        "ok": runtime["pykokoro"] or runtime["kokoro"],
        "service": "kokoro-tts-local",
        "nativeLanguages": ["en", "es"],
        "experimentalLanguages": ["de"],
        "runtime": runtime,
    }


@app.post("/api/tts/chunk", response_model=TtsChunkResponse)
def generate_chunk(request: TtsChunkRequest) -> TtsChunkResponse:
    key = cache_key(request)
    path = audio_path(key)
    manifest = read_manifest()
    cached = path.exists()
    manifest_entry = manifest.get(key, {})
    cached_engine = manifest_entry.get("engine", "unknown")
    cached_fallback = cached_engine == "fallback"
    cache_is_safe = cached and cached_engine != "unknown" and (not cached_fallback or fallback_enabled())

    if cached and not cache_is_safe:
        logger.info("Invalidating stale Kokoro cache key=%s engine=%s", key, cached_engine)
        path.unlink(missing_ok=True)
        cached = False

    if cache_is_safe:
        duration = float(manifest_entry.get("durationSec", 0.0))
        engine = str(cached_engine)
        fallback_used = cached_fallback
        logger.info("Kokoro cache hit key=%s engine=%s fallback=%s", key, engine, fallback_used)
    else:
        try:
            result = synthesize_to_wav(request, path)
        except Exception as exc:
            logger.exception("Kokoro synthesis failed")
            message = str(exc)
            status_code = 400 if "not natively supported by Kokoro" in message else 500
            raise HTTPException(status_code=status_code, detail=message) from exc
        duration = result.duration_sec
        engine = result.engine
        fallback_used = result.fallback_used
        native_language = result.native_language
        processed_language = result.processed_language
        fallback = result.fallback
        logger.info("Kokoro generated key=%s engine=%s fallback=%s", key, engine, fallback_used)
        write_manifest_entry(
            key,
            {
                "text": request.text,
                "voice": request.voice,
                "language": request.language,
                "baseSpeed": request.baseSpeed,
                "durationSec": duration,
                "engine": engine,
                "fallbackUsed": fallback_used,
                "nativeLanguage": native_language,
                "processedLanguage": processed_language,
                "fallback": fallback,
            },
        )
    if cache_is_safe:
        native_language = bool(manifest_entry.get("nativeLanguage", True))
        processed_language = manifest_entry.get("processedLanguage")
        fallback = manifest_entry.get("fallback")

    return TtsChunkResponse(
        cacheKey=key,
        audioUrl=f"http://localhost:8787{public_audio_path(key)}",
        durationSec=duration,
        cached=cached,
        engine=engine,  # type: ignore[arg-type]
        fallbackUsed=fallback_used,
        nativeLanguage=native_language,
        processedLanguage=processed_language,  # type: ignore[arg-type]
        fallback=fallback,
    )


@app.get("/audio/{filename}")
def get_audio(filename: str) -> FileResponse:
    key = filename.removesuffix(".wav")
    if filename != f"{key}.wav" or not CACHE_KEY_RE.fullmatch(key):
        raise HTTPException(status_code=404, detail="Audio not found.")
    path = audio_path(key)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Audio not found.")
    return FileResponse(path, media_type="audio/wav", filename=filename)
