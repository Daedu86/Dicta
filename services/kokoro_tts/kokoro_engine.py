from __future__ import annotations

import math
import os
import wave
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np
import soundfile as sf

from schemas import TtsChunkRequest

LANG_TO_GENERATION = {
    "en": "en-us",
    "es": "es",
}

LANG_TO_KPIPELINE = {
    "en": "a",
    "es": "e",
}

LANG_TO_SPACY_MODEL = {
    "en": "en_core_web_sm",
    "de": "de_core_news_sm",
    "es": "es_core_news_sm",
    "fr": "fr_core_news_sm",
}


@dataclass(frozen=True)
class SynthesisResult:
    duration_sec: float
    engine: str
    fallback_used: bool = False
    native_language: bool = True
    processed_language: str | None = None
    fallback: str | None = None


def fallback_enabled() -> bool:
    return os.getenv("KOKORO_ALLOW_FALLBACK", "false").strip().lower() in {"1", "true", "yes", "on"}


def check_runtime() -> dict:
    return {
        "allowFallback": fallback_enabled(),
        "pykokoro": _module_available("pykokoro"),
        "kokoro": _module_available("kokoro"),
        "spacyModels": {language: _module_available(model) for language, model in LANG_TO_SPACY_MODEL.items()},
    }


def synthesize_to_wav(request: TtsChunkRequest, output_path: Path) -> SynthesisResult:
    """Generate phrase audio.

    Fallback tones are disabled by default because they hide real Kokoro setup
    failures. Set KOKORO_ALLOW_FALLBACK=true only when testing the pipeline.
    """
    behavior = resolve_language_behavior(request.language)
    if not behavior["native"]:
        if fallback_enabled():
            return _write_fallback_wav(request, output_path)
        language_name = "French" if request.language == "fr" else "German"
        input_label = "French" if request.language == "fr" else "German"
        raise RuntimeError(
            f"{language_name} is not natively supported by Kokoro. Use browser TTS/Input 2 for {input_label}, or enable an experimental fallback."
        )

    errors: list[str] = []
    try:
        return _synthesize_with_pykokoro(request, output_path)
    except Exception as exc:
        errors.append(f"pykokoro: {exc}")

    try:
        return _synthesize_with_kokoro_package(request, output_path)
    except Exception as exc:
        errors.append(f"kokoro: {exc}")

    if fallback_enabled():
        return _write_fallback_wav(request, output_path)

    raise RuntimeError(
        "Real Kokoro synthesis failed and fallback is disabled. "
        + " | ".join(errors)
    )


def _module_available(name: str) -> bool:
    try:
        __import__(name)
        return True
    except Exception:
        return False


def resolve_language_behavior(language: str) -> dict[str, str | bool | None]:
    if language == "en":
        return {"native": True, "processed_language": "en", "generation_code": "en-us", "pipeline_code": "a", "fallback": None}
    if language == "es":
        return {"native": True, "processed_language": "es", "generation_code": "es", "pipeline_code": "e", "fallback": None}
    if language == "de":
        return {"native": False, "processed_language": None, "generation_code": None, "pipeline_code": None, "fallback": None}
    if language == "fr":
        return {"native": False, "processed_language": None, "generation_code": None, "pipeline_code": None, "fallback": None}
    raise RuntimeError(f"Unsupported Kokoro language: {language}")

@lru_cache(maxsize=64)
def _spanish_g2p():
    from kokorog2p.es import SpanishG2P

    return SpanishG2P(language="es", use_espeak_fallback=False, use_goruut_fallback=False)


def _phonemize_spanish(text: str) -> str:
    tokens = _spanish_g2p()(text)
    parts = [token.phonemes for token in tokens if getattr(token, "phonemes", None)]
    if not parts:
        raise RuntimeError("Spanish G2P produced no phonemes.")
    return " ".join(parts)


@lru_cache(maxsize=16)
def _pykokoro_pipeline(voice: str, language: str):
    from pykokoro import KokoroPipeline, PipelineConfig
    from pykokoro.generation_config import GenerationConfig

    behavior = resolve_language_behavior(language)
    return KokoroPipeline(
        PipelineConfig(
            voice=voice,
            generation=GenerationConfig(
                lang=str(behavior["generation_code"]),
                speed=1.0,
                is_phonemes=language == "es",
            ),
        )
    )


def _synthesize_with_pykokoro(request: TtsChunkRequest, output_path: Path) -> SynthesisResult:
    pipe = _pykokoro_pipeline(_normalize_voice(request.voice), request.language)
    behavior = resolve_language_behavior(request.language)
    input_text = _phonemize_spanish(request.text) if request.language == "es" else request.text
    result = pipe.run(input_text)
    audio = np.asarray(result.audio)
    sample_rate = int(result.sample_rate)
    if abs(request.baseSpeed - 1.0) > 0.01:
        audio = _resample_speed(audio, request.baseSpeed)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(output_path, audio, sample_rate)
    return SynthesisResult(
        duration_sec=float(len(audio) / sample_rate),
        engine="pykokoro",
        native_language=True,
        processed_language=str(behavior["processed_language"]),
    )


@lru_cache(maxsize=8)
def _kokoro_pipeline(language: str):
    from kokoro import KPipeline

    behavior = resolve_language_behavior(language)
    return KPipeline(lang_code=str(behavior["pipeline_code"]))


def _synthesize_with_kokoro_package(request: TtsChunkRequest, output_path: Path) -> SynthesisResult:
    pipeline = _kokoro_pipeline(request.language)
    behavior = resolve_language_behavior(request.language)
    audio_parts = []
    sample_rate = 24_000
    for _, _, audio in pipeline(
        request.text,
        voice=_normalize_voice(request.voice),
        speed=request.baseSpeed,
        split_pattern=r"\n+",
    ):
        audio_parts.append(np.asarray(audio))
    if not audio_parts:
        raise RuntimeError("Kokoro generated no audio.")
    audio = np.concatenate(audio_parts)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(output_path, audio, sample_rate)
    return SynthesisResult(
        duration_sec=float(len(audio) / sample_rate),
        engine="kokoro",
        native_language=True,
        processed_language=str(behavior["processed_language"]),
    )


def _normalize_voice(voice: str) -> str:
    if not voice or voice == "default":
        return "af_sarah"
    return voice


def _resample_speed(audio: np.ndarray, speed: float) -> np.ndarray:
    if speed <= 0:
        return audio
    source = np.arange(len(audio))
    target = np.linspace(0, len(audio) - 1, max(1, int(len(audio) / speed)))
    return np.interp(target, source, audio).astype(audio.dtype)


def _write_fallback_wav(request: TtsChunkRequest, output_path: Path) -> SynthesisResult:
    words = max(1, len(request.text.split()))
    duration_sec = max(0.7, min(8.0, words * 0.42 / max(request.baseSpeed, 0.5)))
    sample_rate = 24_000
    total_samples = int(sample_rate * duration_sec)
    frequency = {"en": 440, "de": 392, "es": 466, "fr": 415}.get(request.language, 440)
    envelope = np.linspace(0.15, 0.05, total_samples)
    samples = np.sin(2 * math.pi * frequency * np.arange(total_samples) / sample_rate) * envelope
    pcm = np.int16(samples * 32767)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(output_path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm.tobytes())

    return SynthesisResult(
        duration_sec=duration_sec,
        engine="fallback",
        fallback_used=True,
        native_language=False,
        processed_language=None,
        fallback="experimentalTone",
    )
