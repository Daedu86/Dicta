import { resolveRequestProfile, sendApiError } from '../_supabaseProfile.js';
import { OLLAMA_RECOMMENDED_MODEL, formatOllamaUpstreamError } from './_request.js';

const OLLAMA_TAGS_URL = 'https://ollama.com/api/tags';

function getOllamaApiKey() {
  return process.env.OLLAMA_API_KEY?.trim() ?? '';
}

function normalizeOllamaModelEntry(model) {
  const id = typeof model?.model === 'string' && model.model.trim()
    ? model.model.trim()
    : typeof model?.name === 'string'
      ? model.name.trim()
      : '';
  if (!id) return null;
  return {
    id,
    name: typeof model?.name === 'string' ? model.name : id,
    modified_at: typeof model?.modified_at === 'string' ? model.modified_at : undefined,
    size: Number.isFinite(Number(model?.size)) ? Number(model.size) : undefined,
    details: model?.details && typeof model.details === 'object' ? model.details : undefined,
  };
}

export function buildOllamaModelPayload(rawPayload) {
  const rawModels = Array.isArray(rawPayload?.models) ? rawPayload.models : [];
  const byId = new Map();
  for (const model of rawModels) {
    const normalized = normalizeOllamaModelEntry(model);
    if (normalized) byId.set(normalized.id, normalized);
  }
  if (!byId.has(OLLAMA_RECOMMENDED_MODEL)) {
    byId.set(OLLAMA_RECOMMENDED_MODEL, {
      id: OLLAMA_RECOMMENDED_MODEL,
      name: OLLAMA_RECOMMENDED_MODEL,
    });
  }
  const data = [...byId.values()].sort((a, b) => {
    if (a.id === OLLAMA_RECOMMENDED_MODEL) return -1;
    if (b.id === OLLAMA_RECOMMENDED_MODEL) return 1;
    return a.id.localeCompare(b.id);
  });
  return {
    data,
    source: 'ollama',
    recommendedModel: OLLAMA_RECOMMENDED_MODEL,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    await resolveRequestProfile(req, { allowLegacyEnvProfile: true });
  } catch (error) {
    sendApiError(res, error, 'Ollama model request failed.');
    return;
  }

  const apiKey = getOllamaApiKey();
  if (!apiKey) {
    res.status(500).send('Missing OLLAMA_API_KEY. Add it in Vercel project environment variables.');
    return;
  }

  try {
    const response = await fetch(OLLAMA_TAGS_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });
    const body = await response.text();
    if (!response.ok) {
      res.status(response.status).send(formatOllamaUpstreamError(response.status, body, 'Ollama Cloud model request failed'));
      return;
    }

    const payload = body ? JSON.parse(body) : {};
    res.status(200).json(buildOllamaModelPayload(payload));
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : 'Ollama Cloud model request failed.');
  }
}
