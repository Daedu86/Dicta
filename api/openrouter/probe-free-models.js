const PROBE_TOKEN = 'tmp-probe-20260603-7b7f6a1c8d9e4b2a';
const MODELS = [
  'openai/gpt-oss-120b:free',
  'google/gemma-3n-e2b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'qwen/qwen3-4b:free',
  'openrouter/free',
];

function sanitizeProviderError(body) {
  try {
    const parsed = JSON.parse(body);
    const error = parsed?.error ?? {};
    return {
      message: typeof error.message === 'string' ? error.message : '',
      code: error.code ?? null,
      provider: typeof error.metadata?.provider_name === 'string' ? error.metadata.provider_name : '',
      raw: typeof error.metadata?.raw === 'string' ? error.metadata.raw : '',
    };
  } catch {
    return { message: body.slice(0, 300), code: null, provider: '', raw: '' };
  }
}

async function probeModel(model, req) {
  const startedAt = Date.now();
  const apiKey = process.env.OPENROUTER_API_KEY?.trim() ?? '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: ['Bearer', apiKey].join(' '),
        'Content-Type': 'application/json',
        'HTTP-Referer': req.headers.origin ?? 'https://vercel.app',
        'X-Title': 'Dicta probe',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Return exactly: ok' }],
        max_tokens: 8,
      }),
      signal: controller.signal,
    });
    const body = await response.text();
    const elapsedMs = Date.now() - startedAt;
    if (!response.ok) {
      return {
        model,
        ok: false,
        status: response.status,
        elapsedMs,
        error: sanitizeProviderError(body),
      };
    }
    let text = '';
    try {
      const payload = JSON.parse(body);
      text = typeof payload?.choices?.[0]?.message?.content === 'string' ? payload.choices[0].message.content : '';
    } catch {
      text = body.slice(0, 80);
    }
    return { model, ok: true, status: response.status, elapsedMs, text: text.slice(0, 80) };
  } catch (error) {
    return {
      model,
      ok: false,
      status: null,
      elapsedMs: Date.now() - startedAt,
      error: { message: error instanceof Error ? error.message : 'Probe failed.', code: null, provider: '', raw: '' },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed');
    return;
  }
  if (req.query?.token !== PROBE_TOKEN) {
    res.status(404).send('Not found');
    return;
  }
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    res.status(500).json({ error: 'Missing OPENROUTER_API_KEY' });
    return;
  }

  const startedAt = new Date().toISOString();
  const results = [];
  for (const model of MODELS) {
    results.push(await probeModel(model, req));
  }
  res.status(200).json({ startedAt, results });
}
