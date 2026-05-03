from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional


@dataclass
class SynthesisResult:
    duration_ms: int
    engine: str


_ENGINE: Optional["CosyVoiceEngine"] = None


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _default_cosyvoice_repo() -> Path:
    # Optional local clone location (you can change this if your collaborator uses a different layout)
    return _repo_root() / "third_party" / "CosyVoice"


def _maybe_add_cosyvoice_to_syspath(repo_path: Path) -> None:
    if not repo_path.exists():
        return
    # Common upstream layout: CosyVoice repo + third_party/Matcha-TTS
    matcha = repo_path / "third_party" / "Matcha-TTS"
    sys.path.insert(0, str(repo_path))
    if matcha.exists():
        sys.path.insert(0, str(matcha))


def _load_torch_modules() -> tuple[Any, Any]:
    try:
        import torch  # type: ignore
        import torchaudio  # type: ignore
    except Exception as exc:
        raise RuntimeError(
            "Missing torch/torchaudio. Install them in services/cosyvoice_cache/.venv and ensure CUDA/CPU build works."
        ) from exc
    return torch, torchaudio


def _load_cosyvoice2() -> tuple[Any, Any]:
    """
    Tries to import CosyVoice2 from a local clone (preferred) or an installed python package.
    """

    repo_env = os.environ.get("COSYVOICE_REPO", "").strip()
    repo_path = Path(repo_env) if repo_env else _default_cosyvoice_repo()
    _maybe_add_cosyvoice_to_syspath(repo_path)

    try:
        from cosyvoice.cli.cosyvoice import CosyVoice2  # type: ignore
        from cosyvoice.utils.file_utils import load_wav  # type: ignore
    except Exception as exc:
        raise RuntimeError(
            "CosyVoice2 import failed. Ensure third_party/CosyVoice exists (or set COSYVOICE_REPO), then install "
            "Windows-safe deps via the UI 'Bootstrap CosyVoice2' button. Root error: " + repr(exc)
        ) from exc

    return CosyVoice2, load_wav


class CosyVoiceEngine:
    def __init__(self) -> None:
        CosyVoice2, load_wav = _load_cosyvoice2()
        self._load_wav = load_wav

        # Configurable via environment variables so you can match your collaborator's setup without changing code.
        self.model_dir = os.environ.get("COSYVOICE_MODEL_DIR", "pretrained_models/CosyVoice2-0.5B")
        self.mode = os.environ.get("COSYVOICE_MODE", "zero_shot")  # sft | zero_shot | cross_lingual | instruct2
        self.prompt_wav_path = os.environ.get("COSYVOICE_PROMPT_WAV", "").strip() or None
        self.prompt_text = os.environ.get("COSYVOICE_PROMPT_TEXT", "").strip() or ""
        self.speaker_id = os.environ.get("COSYVOICE_SPEAKER_ID", "").strip() or None
        self.instruction = os.environ.get("COSYVOICE_INSTRUCTION", "").strip() or None

        # Avoid surprising snapshot_download() behavior when the user intends a local path.
        # If COSYVOICE_MODEL_DIR looks like a filesystem path but does not exist, fail fast with a clear message.
        looks_like_path = (
            os.path.sep in self.model_dir
            or (os.path.altsep and os.path.altsep in self.model_dir)
            or self.model_dir.startswith(".")
            or self.model_dir.startswith("pretrained_models")
            or ":" in self.model_dir  # windows drive letter
        )
        if looks_like_path and not os.path.exists(self.model_dir):
            raise RuntimeError(
                f"COSYVOICE_MODEL_DIR points to a local path that does not exist: {self.model_dir}. "
                "Either download the CosyVoice2 checkpoint into that folder, or set COSYVOICE_MODEL_DIR to a valid "
                "ModelScope model id (for example: iic/CosyVoice2-0.5B)."
            )

        # Windows + 4GB VRAM stability defaults.
        self.model = CosyVoice2(
            self.model_dir,
            load_jit=False,
            load_trt=False,
            fp16=False,
        )

    @property
    def sample_rate(self) -> int:
        return int(getattr(self.model, "sample_rate", 24000))

    def synthesize_to_wav(self, *, text: str, language: str, out_path: Path) -> SynthesisResult:
        torch, torchaudio = _load_torch_modules()

        out_path.parent.mkdir(parents=True, exist_ok=True)

        mode = self.mode
        if mode == "sft":
            if not self.speaker_id:
                raise ValueError("COSYVOICE_SPEAKER_ID is required for sft mode.")
            generator = self.model.inference_sft(text, self.speaker_id, stream=False)
        elif mode == "zero_shot":
            if not self.prompt_wav_path:
                raise ValueError("COSYVOICE_PROMPT_WAV is required for zero_shot mode.")
            prompt_speech_16k = self._load_wav(self.prompt_wav_path, 16000)
            generator = self.model.inference_zero_shot(text, self.prompt_text, prompt_speech_16k, stream=False)
        elif mode == "cross_lingual":
            if not self.prompt_wav_path:
                raise ValueError("COSYVOICE_PROMPT_WAV is required for cross_lingual mode.")
            prompt_speech_16k = self._load_wav(self.prompt_wav_path, 16000)
            generator = self.model.inference_cross_lingual(text, prompt_speech_16k, stream=False)
        elif mode == "instruct2":
            if not self.prompt_wav_path:
                raise ValueError("COSYVOICE_PROMPT_WAV is required for instruct2 mode.")
            prompt_speech_16k = self._load_wav(self.prompt_wav_path, 16000)
            generator = self.model.inference_instruct2(
                text,
                self.instruction or "Speak naturally and clearly.",
                prompt_speech_16k,
                stream=False,
            )
        else:
            raise ValueError(f"Unsupported CosyVoice mode: {mode}")

        chunks = []
        for result in generator:
            tts_speech = result.get("tts_speech")
            if tts_speech is not None:
                chunks.append(tts_speech)

        if not chunks:
            raise RuntimeError("CosyVoice2 produced no audio.")

        audio = torch.cat(chunks, dim=1)
        torchaudio.save(str(out_path), audio.cpu(), self.sample_rate)

        duration_ms = int(1000 * (audio.shape[1] / float(self.sample_rate)))
        return SynthesisResult(duration_ms=duration_ms, engine="cosyvoice2")


def synthesize_to_wav(*, text: str, language: str, out_path: Path) -> SynthesisResult:
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = CosyVoiceEngine()
    return _ENGINE.synthesize_to_wav(text=text, language=language, out_path=out_path)


def check_runtime() -> dict:
    """
    Safe runtime probe: checks whether CosyVoice2 + torch can be imported.
    Does not load the model checkpoints (that happens lazily on first synthesis).
    """

    info: dict[str, Any] = {"engine": "cosyvoice2", "configured": False}
    try:
        _load_torch_modules()
        info["torch"] = True
    except Exception as exc:
        info["torch"] = False
        info["torchError"] = str(exc)

    try:
        _load_cosyvoice2()
        info["cosyvoice"] = True
    except Exception as exc:
        info["cosyvoice"] = False
        info["cosyvoiceError"] = str(exc)

    info["configured"] = bool(info.get("torch") and info.get("cosyvoice"))
    info["modelDir"] = os.environ.get("COSYVOICE_MODEL_DIR", "pretrained_models/CosyVoice2-0.5B")
    info["mode"] = os.environ.get("COSYVOICE_MODE", "zero_shot")
    info["hasPromptWav"] = bool(os.environ.get("COSYVOICE_PROMPT_WAV", "").strip())
    info["modelDirExists"] = bool(os.path.exists(info["modelDir"]))
    return info
