import { createSupabaseServiceClient, assertOpenRouterAccess, resolveRequestProfile, sendApiError } from '../_supabaseProfile.js';
import { auditSecurityEvent } from './_security.js';

const MODELS_ROUTE = '/api/openrouter/models';
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const CURRENT_FREE_MODEL_FALLBACKS = [
  { id: 'openrouter/free', name: 'Free Models Router', context_length: 200000 },
  { id: 'openrouter/owl-alpha', name: 'Owl Alpha', context_length: 1048756 },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'NVIDIA: Nemotron 3 Super (free)', context_length: 1000000 },
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free', name: 'NVIDIA: Nemotron 3 Nano 30B A3B (free)', context_length: 256000 },
  { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', name: 'NVIDIA: Nemotron 3 Nano Omni (free)', context_length: 256000 },
  { id: 'poolside/laguna-xs.2:free', name: 'Poolside: Laguna XS.2 (free)', context_length: 262144 },
  { id: 'liquid/lfm-2.5-1.2b-instruct:free', name: 'LiquidAI: LFM2.5-1.2B-Instruct (free)', context_length: 32768 },
  { id: 'openai/gpt-oss-20b', name: 'OpenAI: gpt-oss-20b', context_length: 131072 },
  { id: 'z-ai/glm-4.5-air', name: 'Z.ai: GLM 4.5 Air', context_length: 1048576 },
  { id: 'qwen/qwen3-coder', name: 'Qwen: Qwen3 Coder 480B A35B', context_length: 32768 },
  { id: 'tencent/hunyuan-a13b-instruct', name: 'Tencent: Hunyuan A13B Instruct', context_length: 131072 },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Meta: Llama 3.3 70B Instruct', context_length: 131072 },
  { id: 'meta-llama/llama-3.2-3b-instruct', name: 'Meta: Llama 3.2 3B Instruct', context_length: 131072 },
];

function getOpenRouterApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() ?? '';
}

function createSecurityClient(requester) {
  return requester?.legacy ? null : createSupabaseServiceClient();
}

function normalizeModelId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readPrice(value) {
  const price = Number(value);
  return Number.isFinite(price) ? price : null;
}

function isZeroPriceModel(model) {
  const prompt = readPrice(model?.pricing?.prompt);
  const completion = readPrice(model?.pricing?.completion);
  return prompt === 0 && completion === 0;
}

function isTextOutputModel(model) {
  const outputModalities = model?.architecture?.output_modalities;
  if (Array.isArray(outputModalities)) return outputModalities.includes('text');
  const modality = typeof model?.architecture?.modality === 'string' ? model.architecture.modality : '';
  return modality.endsWith('->text') || modality.includes('->text+');
}

function normalizeFreeModel(model) {
  const id = normalizeModelId(model?.id);
  if (!id) return null;
  return {
    id,
    name: typeof model?.name === 'string' ? model.name : undefined,
    context_length: Number.isFinite(Number(model?.context_length)) ? Number(model.context_length) : undefined,
    pricing: { prompt: '0', completion: '0' },
  };
}

function buildFallbackModelPayload() {
  return {
    data: CURRENT_FREE_MODEL_FALLBACKS.map((model) => ({
      ...model,
      pricing: { prompt: '0', completion: '0' },
    })),
    source: 'fallback',
    freeModelCount: CURRENT_FREE_MODEL_FALLBACKS.length,
  };
}

function buildFreeModelPayload(rawPayload) {
  const data = Array.isArray(rawPayload?.data) ? rawPayload.data : [];
  const byId = new Map();

  for (const model of data) {
    if (!isZeroPriceModel(model) || !isTextOutputModel(model)) continue;
    const normalized = normalizeFreeModel(model);
    if (normalized) byId.set(normalized.id, normalized);
  }

  for (const fallback of CURRENT_FREE_MODEL_FALLBACKS) {
    if (!byId.has(fallback.id)) {
      byId.set(fallback.id, {
        ...fallback,
        pricing: { prompt: '0', completion: '0' },
      });
    }
  }

  const sorted = [...byId.values()].sort((a, b) => {
    if (a.id === 'openrouter/free') return -1;
    if (b.id === 'openrouter/free') return 1;
    return a.id.localeCompare(b.id);
  });

  return {
    data: sorted,
    source: 'openrouter',
    freeModelCount: sorted.length,
  };
}

async function auditModelsEvent(supabase, eventType, requester, details = {}) {
  await auditSecurityEvent(supabase, {
    eventType,
    profileId: requester?.profileId,
    role: requester?.legacy ? 'legacy' : requester?.role,
    legacy: requester?.legacy,
    severity: details.severity ?? 'warn',
    statusCode: details.statusCode,
    route: MODELS_ROUTE,
    reason: details.reason,
    metadata: details.metadata,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed');
    return;
  }

  let requester;
  let securityClient = null;
  try {
    requester = await resolveRequestProfile(req, { allowLegacyEnvProfile: true });
    securityClient = createSecurityClient(requester);
    assertOpenRouterAccess(requester);
  } catch (error) {
    await auditModelsEvent(securityClient, 'openrouter_models_access_rejected', requester, {
      statusCode: error?.statusCode,
      reason: error instanceof Error ? error.message : 'OpenRouter models access rejected.',
    });
    sendApiError(res, error, 'OpenRouter model request failed.');
    return;
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    await auditModelsEvent(securityClient, 'openrouter_models_missing_key', requester, {
      severity: 'error',
      statusCode: 500,
      reason: 'Missing OPENROUTER_API_KEY.',
    });
    res.status(500).send('Missing OPENROUTER_API_KEY. Add it in Vercel project environment variables.');
    return;
  }

  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      headers: {
        Authorization: ['Bearer', apiKey].join(' '),
        'HTTP-Referer': req.headers.origin ?? 'https://vercel.app',
        'X-Title': 'Dicta',
      },
    });

    if (!response.ok) {
      await auditModelsEvent(securityClient, 'openrouter_models_provider_error', requester, {
        statusCode: response.status,
        reason: 'OpenRouter models provider returned an error.',
      });
      res.status(200).json(buildFallbackModelPayload());
      return;
    }

    const body = await response.json();
    res.status(200).json(buildFreeModelPayload(body));
  } catch (error) {
    await auditModelsEvent(securityClient, 'openrouter_models_failed', requester, {
      severity: 'error',
      statusCode: 200,
      reason: error instanceof Error ? error.message : 'OpenRouter model request failed; using fallback free model list.',
    });
    res.status(200).json(buildFallbackModelPayload());
  }
}
