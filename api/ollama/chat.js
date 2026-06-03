import { resolveRequestProfile, sendApiError } from '../_supabaseProfile.js';
import { formatOllamaUpstreamError, readOllamaChatPayload } from './_request.js';

const OLLAMA_CHAT_URL = 'https://ollama.com/api/chat';

function getOllamaApiKey() {
  return process.env.OLLAMA_API_KEY?.trim() ?? '';
}

async function postOllamaChat({ apiKey, model, prompt, maxTokens, timeoutMs }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(OLLAMA_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        options: {
          num_predict: maxTokens,
        },
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

  try {
    await resolveRequestProfile(req, { allowLegacyEnvProfile: true });
  } catch (error) {
    sendApiError(res, error, 'Ollama chat request failed.');
    return;
  }

  const apiKey = getOllamaApiKey();
  if (!apiKey) {
    res.status(500).send('Missing OLLAMA_API_KEY. Add it in Vercel project environment variables.');
    return;
  }

  let requestPayload;
  try {
    requestPayload = readOllamaChatPayload(req.body);
  } catch (error) {
    sendApiError(res, error, 'Ollama chat request failed.');
    return;
  }

  try {
    const response = await postOllamaChat({
      apiKey,
      model: requestPayload.model,
      prompt: requestPayload.prompt,
      maxTokens: requestPayload.maxTokens,
      timeoutMs: 120_000,
    });

    res.status(response.status);
    res.setHeader('X-Dicta-Ollama-Model', requestPayload.model);
    if (!response.ok) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(formatOllamaUpstreamError(response.status, response.body));
      return;
    }

    res.setHeader('Content-Type', response.contentType);
    res.send(response.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ollama chat request failed.';
    if (message.toLowerCase().includes('aborted')) {
      res.status(504).send(`Selected Ollama model "${requestPayload.model}" timed out after 120 seconds.`);
      return;
    }
    res.status(500).send(message);
  }
}
