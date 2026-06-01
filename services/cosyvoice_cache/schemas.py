from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class CachePhrase(BaseModel):
    id: str = Field(min_length=1, max_length=120)
    language: str = Field(pattern="^(en|es|de|fr)$")
    text: str
    audioUrl: Optional[str] = None
    durationMs: Optional[int] = None
    wordCount: Optional[int] = None
    charCount: Optional[int] = None
    difficulty: Optional[float] = None
    engine: Optional[str] = None


class CacheManifest(BaseModel):
    engine: Literal["qwen-cloud"] = Field(default="qwen-cloud")
    language: str = Field(pattern="^(en|es|de|fr)$")
    phrases: list[CachePhrase]


class GenerateCacheRequest(BaseModel):
    manifest: CacheManifest
    overwrite: bool = False


class GenerateCacheResponse(BaseModel):
    ok: bool
    generatedCount: int
    skippedCount: int
    language: str
    outputDir: str
    manifestPath: str
    errors: list[str] = Field(default_factory=list)
    notes: dict[str, Any] = Field(default_factory=dict)
