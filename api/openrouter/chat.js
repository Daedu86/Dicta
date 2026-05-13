function getOpenRouterApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() ?? '';
}

function normalizeRequestBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString('utf8'));
    } catch {
      return {};
    }
  }
  return body;
}

let cachedFreeModels = { expiresAt: 0, ids: [] };

function uniqueNonEmpty(values) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
}

function isFreeModel(model) {
  const prompt = Number(model?.pricing?.prompt ?? NaN);
  const completion = Number(model?.pricing?.completion ?? NaN);
  return Number.isFinite(prompt) && Number.isFinite(completion) && prompt === 0 && completion === 0;
}

function rankFreeModelId(id) {
  const normalized = id.toLowerCase();
  let score = 0;
  if (normalized.includes(':free')) score += 10;
  if (normalized.includes('flash')) score += 5;
  if (normalized.includes('gemini')) score += 4;
  if (normalized.includes('qwen')) score += 4;
  if (normalized.includes('llama')) score += 3;
  if (normalized.includes('mistral')) score += 3;
  if (normalized.includes('gemma')) score += 3;
  if (normalized.includes('8b') || normalized.includes('7b') || normalized.includes('3b')) score += 2;
  if (normalized.includes('70b') || normalized.includes('405b')) score -= 4;
  return score;
}

async function fetchFreeModelIds(apiKey, req) {
  const now = Date.now();
  if (cachedFreeModels.expiresAt > now && cachedFreeModels.ids.length > 0) {
    return cachedFreeModels.ids;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': req.headers.origin ?? 'https://vercel.app',
        'X-Title': 'Dicta',
      },
      signal: controller.signal,
    });
    if (!response.ok) return cachedFreeModels.ids;
    const payload = await response.json();
    const ids = Array.isArray(payload.data)
      ? payload.data
          .filter(isFreeModel)
          .map((model) => String(model.id ?? '').trim())
          .filter(Boolean)
          .sort((a, b) => rankFreeModelId(b) - rankFreeModelId(a) || a.localeCompare(b))
      : [];
    if (ids.length > 0) {
      cachedFreeModels = { expiresAt: now + 10 * 60 * 1000, ids };
    }
    return ids;
  } catch {
    return cachedFreeModels.ids;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function postChatCompletion({ apiKey, req, model, prompt, maxTokens, timeoutMs }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': req.headers.origin ?? 'https://vercel.app',
        'X-Title': 'Dicta',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      }),
      signal: controller.signal,
    });
    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type') ?? 'application/json',
      body,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    res.status(500).send('Missing OPENROUTER_API_KEY. Add it in Vercel project environment variables.');
    return;
  }

  const payload = normalizeRequestBody(req.body);
  const model = typeof payload.model === 'string' ? payload.model.trim() : '';
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  const maxTokensRaw = Number(payload.maxTokens);
  const maxTokens = Number.isFinite(maxTokensRaw) ? Math.max(128, Math.min(1800, Math.round(maxTokensRaw))) : undefined;
  const payloadFallbackModels = Array.isArray(payload.fallbackModels) ? payload.fallbackModels : [];

  if (!model || !prompt) {
    res.status(400).send('Missing model or prompt.');
    return;
  }

  const fetchedFreeModels = await fetchFreeModelIds(apiKey, req);
  const candidateModels = uniqueNonEmpty([
    model,
    ...payloadFallbackModels,
    ...fetchedFreeModels,
  ]).slice(0, 3);

  const startedAt = Date.now();
  const budgetMs = 25_000;
  const attempts = [];

  for (const candidateModel of candidateModels) {
    const remainingMs = budgetMs - (Date.now() - startedAt);
    if (remainingMs < 5_500) break;
    const timeoutMs = Math.min(12_000, remainingMs - 1_000);
    try {
      const response = await postChatCompletion({
        apiKey,
        req,
        model: candidateModel,
        prompt,
        maxTokens,
        timeoutMs,
      });

      if (response.ok) {
        res.status(response.status);
        res.setHeader('Content-Type', response.contentType);
        res.setHeader('X-Dicta-OpenRouter-Model', candidateModel);
        res.setHeader('X-Dicta-OpenRouter-Attempts', String(attempts.length + 1));
        res.send(response.body);
        return;
      }

      attempts.push(`${candidateModel}: HTTP ${response.status} ${response.body.slice(0, 160)}`);
      if (response.status === 401 || response.status === 403) break;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'request failed';
      attempts.push(`${candidateModel}: ${message.toLowerCase().includes('aborted') ? 'timed out' : message}`);
    }
  }

  res
    .status(504)
    .send(
      attempts.length > 0
        ? `OpenRouter did not return a usable completion after ${attempts.length} free-model attempt(s): ${attempts.join(' | ')}`
        : 'OpenRouter did not return a usable completion before the Vercel function budget expired.',
    );
}
