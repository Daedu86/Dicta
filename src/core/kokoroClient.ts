import type { KokoroLanguage, KokoroProcessedLanguage } from './kokoroSupport';

export type KokoroChunkRequest = {
  text: string;
  voice: string;
  language: KokoroLanguage;
  baseSpeed: number;
};

export type KokoroChunkResponse = {
  cacheKey: string;
  audioUrl: string;
  mimeType: string;
  durationSec: number;
  cached?: boolean;
  engine: 'pykokoro' | 'kokoro' | 'fallback' | 'unknown';
  fallbackUsed: boolean;
  nativeLanguage: boolean;
  processedLanguage: KokoroProcessedLanguage | null;
  fallback?: string;
};

const KOKORO_BASE_URL = 'http://localhost:8787';

export async function generateKokoroChunk(request: KokoroChunkRequest): Promise<KokoroChunkResponse> {
  const response = await fetch(`${KOKORO_BASE_URL}/api/tts/chunk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Kokoro TTS service failed.');
  }

  const payload = (await response.json()) as KokoroChunkResponse;
  return {
    ...payload,
    audioUrl: payload.audioUrl.startsWith('http') ? payload.audioUrl : `${KOKORO_BASE_URL}${payload.audioUrl}`,
  };
}

export async function checkKokoroHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${KOKORO_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function startKokoroSidecar(): Promise<void> {
  const response = await fetch('/api/kokoro/start', {
    method: 'POST',
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Could not start Kokoro sidecar.');
  }
}
