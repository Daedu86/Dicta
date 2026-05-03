export type CosyVoiceCacheHealth = {
  ok: boolean;
  configured?: boolean;
  service?: string;
  runtime?: Record<string, unknown>;
};

export type CosyVoiceCacheManifestPhrase = {
  id: string;
  language: string;
  text: string;
  audioUrl?: string;
  durationMs?: number | null;
  wordCount?: number | null;
  charCount?: number | null;
  difficulty?: number | null;
  engine?: string | null;
};

export type CosyVoiceCacheManifest = {
  engine: 'qwen-cloud';
  language: string;
  phrases: CosyVoiceCacheManifestPhrase[];
};

export type GenerateCosyVoiceCacheRequest = {
  manifest: CosyVoiceCacheManifest;
  overwrite?: boolean;
};

export type GenerateCosyVoiceCacheResponse = {
  ok: boolean;
  generatedCount: number;
  skippedCount: number;
  language: string;
  outputDir: string;
  manifestPath: string;
  errors: string[];
  notes?: Record<string, unknown>;
};

const COSYVOICE_BASE_URL = 'http://localhost:8791';

export async function checkCosyVoiceCacheHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${COSYVOICE_BASE_URL}/health`);
    if (!response.ok) return false;
    const payload = (await response.json()) as CosyVoiceCacheHealth;
    return Boolean(payload.ok);
  } catch {
    return false;
  }
}

export async function fetchCosyVoiceCacheHealth(): Promise<CosyVoiceCacheHealth | null> {
  try {
    const response = await fetch(`${COSYVOICE_BASE_URL}/health`);
    if (!response.ok) return null;
    return (await response.json()) as CosyVoiceCacheHealth;
  } catch {
    return null;
  }
}

export async function startCosyVoiceCacheSidecar(): Promise<void> {
  const response = await fetch('/api/cosyvoice/start', { method: 'POST' });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Could not start CosyVoice cache sidecar.');
  }
}

export async function bootstrapCosyVoiceCacheSidecar(): Promise<void> {
  const response = await fetch('/api/cosyvoice/bootstrap', { method: 'POST' });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Could not bootstrap CosyVoice cache sidecar.');
  }
}

export async function generateCosyVoiceCache(
  request: GenerateCosyVoiceCacheRequest,
): Promise<GenerateCosyVoiceCacheResponse> {
  const response = await fetch(`${COSYVOICE_BASE_URL}/api/cache/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'CosyVoice cache generation failed.');
  }

  return (await response.json()) as GenerateCosyVoiceCacheResponse;
}
