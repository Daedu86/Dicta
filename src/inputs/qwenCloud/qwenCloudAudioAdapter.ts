import type { PacingDecision } from '../../core/adaptive/types';

export interface QwenCloudPhrase {
  id: string;
  language: 'de' | 'en' | 'es' | 'fr' | 'pt' | string;
  text: string;
  audioUrl: string;
  durationMs?: number;
  wordCount: number;
  charCount: number;
  difficulty?: number;
  engine: 'qwen-cloud';
}

export interface QwenCloudManifest {
  engine: 'qwen-cloud';
  language: string;
  phrases: QwenCloudPhrase[];
}

export interface DictationAudioAdapter {
  inputMode: 'audio' | 'browser-tts' | 'kokoro' | 'qwen-cloud';
  loadPhrase(phraseId: string): Promise<void>;
  play(decision: PacingDecision): Promise<void>;
  pause(): void;
  replay(decision: PacingDecision): Promise<void>;
  setOnEnded(callback: () => void): void;
  reset(): void;
  getCurrentPhrase(): QwenCloudPhrase | null;
}

// Input #4 cache base. Historically "qwen", but the free local path now targets CosyVoice2-generated WAVs.
const BASE_PATH = '/tts-cache/cosyvoice';
const LEGACY_BASE_PATH = '/tts-cache/qwen';

function stablePhraseHash(value: string): string {
  let hash = 2166136261;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function parsePhraseId(phraseId: string): { language: string; hash: string } {
  const parts = phraseId.split(':');
  if (parts.length === 2) {
    return { language: parts[0], hash: parts[1] };
  }
  return { language: 'de', hash: phraseId };
}

function resolveAudioUrl(phrase: QwenCloudPhrase, hash: string): string {
  if (phrase.audioUrl) {
    return phrase.audioUrl.startsWith('/') ? phrase.audioUrl : `${BASE_PATH}/${phrase.language}/${phrase.audioUrl}`;
  }
  return `${BASE_PATH}/${phrase.language}/${hash}.wav`;
}

function makeAbsoluteUrl(relative: string): string {
  try {
    return new URL(relative, window.location.href).toString();
  } catch {
    return relative;
  }
}

function buildFallbackUrls(language: string, hash: string): string[] {
  return [`${BASE_PATH}/${language}/${hash}.wav`, `${BASE_PATH}/${language}/${hash}.mp3`];
}

export function buildQwenCloudPhraseId(text: string, language: string): string {
  return `${language}:${stablePhraseHash(`${language}:${text}`)}`;
}

export class QwenCloudAudioAdapter implements DictationAudioAdapter {
  public inputMode = 'qwen-cloud' as const;
  private currentPhrase: QwenCloudPhrase | null = null;
  private manifestCache = new Map<string, QwenCloudManifest | null>();
  private audio = new Audio();
  private onError?: (message: string) => void;

  constructor(onError?: (message: string) => void) {
    this.onError = onError;
    this.audio.addEventListener('error', () => {
      if (this.currentPhrase) {
        this.onError?.(`Missing Qwen audio for phrase ${this.currentPhrase.id}.`);
      }
    });
  }

  public getCurrentPhrase(): QwenCloudPhrase | null {
    return this.currentPhrase;
  }

  public setOnEnded(callback: () => void): void {
    this.audio.onended = callback;
  }

  public reset(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.currentPhrase = null;
    this.audio.src = '';
  }

  public async loadPhrase(phraseId: string): Promise<void> {
    const { language, hash } = parsePhraseId(phraseId);
    const manifest = await this.loadManifest(language);
    const phrase = manifest?.phrases.find((item) => item.id === phraseId || item.id === hash || item.id.endsWith(hash));
    const audioUrl = phrase ? resolveAudioUrl(phrase, hash) : `${BASE_PATH}/${language}/${hash}.wav`;
    const normalizedAudioUrl = makeAbsoluteUrl(audioUrl);
    const loadedPhrase: QwenCloudPhrase = {
      id: phraseId,
      language,
      text: phrase?.text ?? '',
      audioUrl: normalizedAudioUrl,
      durationMs: phrase?.durationMs,
      wordCount: phrase?.wordCount ?? 0,
      charCount: phrase?.charCount ?? 0,
      difficulty: phrase?.difficulty,
      engine: 'qwen-cloud',
    };

    await this.verifyAudioExists(normalizedAudioUrl, language, hash);
    this.currentPhrase = loadedPhrase;
    this.audio.src = normalizedAudioUrl;
    this.audio.load();
  }

  public async play(decision: PacingDecision): Promise<void> {
    if (!this.currentPhrase) {
      throw new Error('No Qwen phrase loaded.');
    }
    this.audio.playbackRate = decision.playbackRate;
    return this.audio.play();
  }

  public pause(): void {
    this.audio.pause();
  }

  public async replay(decision: PacingDecision): Promise<void> {
    if (!this.currentPhrase) {
      throw new Error('No Qwen phrase loaded.');
    }
    this.audio.currentTime = 0;
    this.audio.playbackRate = decision.replayRate;
    return this.audio.play();
  }

  private async loadManifest(language: string): Promise<QwenCloudManifest | null> {
    if (this.manifestCache.has(language)) {
      return this.manifestCache.get(language) ?? null;
    }

    try {
      const url = `${BASE_PATH}/${language}/manifest.json`;
      const response = await fetch(url);
      if (!response.ok) {
        this.manifestCache.set(language, null);
        return null;
      }
      const manifest = (await response.json()) as QwenCloudManifest;
      this.manifestCache.set(language, manifest);
      return manifest;
    } catch {
      this.manifestCache.set(language, null);
      return null;
    }
  }

  private async verifyAudioExists(audioUrl: string, language: string, hash: string): Promise<void> {
    const candidateUrls = audioUrl ? [audioUrl] : buildFallbackUrls(language, hash);

    for (const url of candidateUrls) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          this.audio.src = makeAbsoluteUrl(url);
          return;
        }
      } catch {
        // ignore and continue to fallback candidates
      }
    }

    // Backward compatibility: older caches may still live under /tts-cache/qwen.
    const legacyCandidates = [`${LEGACY_BASE_PATH}/${language}/${hash}.wav`, `${LEGACY_BASE_PATH}/${language}/${hash}.mp3`];
    for (const url of legacyCandidates) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          this.audio.src = makeAbsoluteUrl(url);
          return;
        }
      } catch {
        // ignore and continue
      }
    }

    throw new Error(`Input #4 cache missing for ${language}/${hash}.`);
  }
}
