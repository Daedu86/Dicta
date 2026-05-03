from typing import Literal

from pydantic import BaseModel, Field


TtsEngine = Literal["pykokoro", "kokoro", "fallback", "unknown"]
ProcessedLanguage = Literal["en", "es"]


class TtsChunkRequest(BaseModel):
    text: str = Field(min_length=1, max_length=600)
    voice: str = Field(default="default", min_length=1, max_length=80)
    language: str = Field(default="en", pattern="^(en|de|es)$")
    baseSpeed: float = Field(default=1.0, ge=0.5, le=1.5)


class TtsChunkResponse(BaseModel):
    cacheKey: str
    audioUrl: str
    mimeType: str = "audio/wav"
    durationSec: float
    cached: bool
    engine: TtsEngine
    fallbackUsed: bool = False
    nativeLanguage: bool = True
    processedLanguage: ProcessedLanguage | None = None
    fallback: str | None = None
