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

  if (!model || !prompt) {
    res.status(400).send('Missing model or prompt.');
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25_000);
    let response;
    try {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
    } finally {
      clearTimeout(timeoutId);
    }

    const body = await response.text();
    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') ?? 'application/json');
    res.send(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OpenRouter chat request failed.';
    if (message.toLowerCase().includes('aborted')) {
      res.status(504).send('OpenRouter timed out. Try a faster free model or a shorter session length.');
      return;
    }
    res.status(500).send(message);
  }
}
