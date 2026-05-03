export interface KokoroAudioCacheKeyOptions {
  text: string;
  voice: string;
  language: string;
  modelVersion?: string;
}

export interface CachedAudioEntry {
  buffer: AudioBuffer;
  createdAt: number;
}

export class KokoroAudioCache {
  private cache = new Map<string, CachedAudioEntry>();

  getKey(options: KokoroAudioCacheKeyOptions): string {
    return [options.language, options.voice, options.modelVersion || 'default', options.text].join('::');
  }

  get(key: string): AudioBuffer | null {
    return this.cache.get(key)?.buffer ?? null;
  }

  add(key: string, buffer: AudioBuffer): void {
    this.cache.set(key, { buffer, createdAt: Date.now() });
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
