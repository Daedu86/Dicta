from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from schemas import TtsChunkRequest


MODEL_VERSION = "kokoro-local-v1"
ROOT_DIR = Path(__file__).resolve().parents[2]
CACHE_DIR = ROOT_DIR / ".cache" / "kokoro-tts"
MANIFEST_PATH = CACHE_DIR / "cache-index.json"


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def cache_key(request: TtsChunkRequest) -> str:
    payload = {
        "text": normalize_text(request.text),
        "voice": request.voice.strip().lower(),
        "language": request.language,
        "baseSpeed": round(request.baseSpeed, 2),
        "modelVersion": MODEL_VERSION,
    }
    encoded = json.dumps(payload, sort_keys=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()[:32]


def ensure_cache_dir() -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR


def audio_path(key: str) -> Path:
    return ensure_cache_dir() / f"{key}.wav"


def public_audio_path(key: str) -> str:
    return f"/audio/{key}.wav"


def read_manifest() -> dict:
    if not MANIFEST_PATH.exists():
        return {}
    try:
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def write_manifest_entry(key: str, metadata: dict) -> None:
    ensure_cache_dir()
    manifest = read_manifest()
    manifest[key] = metadata
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
