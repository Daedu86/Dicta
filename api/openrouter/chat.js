import { assertOpenRouterAccess, resolveRequestProfile, sendApiError } from '../_supabaseProfile.js';
import { readOpenRouterChatPayload } from './_request.js';

function getOpenRouterApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() ?? '';
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
        max_tokens: maxTokens,
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
    const requester = await resolveRequestProfile(req, { allowLegacyEnvProfile: true });
    assertOpenRouterAccess(requester);
  } catch (error) {
    sendApiError(res, error, 'OpenRouter chat request failed.');
    return;
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    res.status(500).send('Missing OPENROUTER_API_KEY. Add it in Vercel project environment variables.');
    return;
  }

  let requestPayload;
  try {
    requestPayload = readOpenRouterChatPayload(req.body);
  } catch (error) {
    sendApiError(res, error, 'OpenRouter chat request failed.');
    return;
  }

  try {
    const response = await postChatCompletion({
      apiKey,
      req,
      model: requestPayload.model,
      prompt: requestPayload.prompt,
      maxTokens: requestPayload.maxTokens,
      timeoutMs: 290_000,
    });

    res.status(response.status);
    res.setHeader('Content-Type', response.contentType);
    res.setHeader('X-Dicta-OpenRouter-Model', requestPayload.model);
    res.send(response.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OpenRouter chat request failed.';
    if (message.toLowerCase().includes('aborted')) {
      res.status(504).send(`Selected OpenRouter model "${requestPayload.model}" timed out after 290 seconds.`);
      return;
    }
    res.status(500).send(message);
  }
}
