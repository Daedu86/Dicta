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
  if (Buffer.isBuffer(body)) {
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

  if (!model || !prompt) {
    res.status(400).send('Missing model or prompt.');
    return;
  }

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
      }),
    });

    const body = await response.text();
    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') ?? 'application/json');
    res.send(body);
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : 'OpenRouter chat request failed.');
  }
}
