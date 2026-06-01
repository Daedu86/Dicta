import { createSupabaseServiceClient, assertOpenRouterAccess, assertOpenRouterModelAllowed, resolveRequestProfile, sendApiError } from '../_supabaseProfile.js';
import { readOpenRouterChatPayload } from './_request.js';
import { enforceOpenRouterRateLimit, getOpenRouterLimit, OPENROUTER_RATE_LIMIT_SCOPES } from './_security.js';

function getOpenRouterApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() ?? '';
}

function createSecurityClient(requester) {
  return requester?.legacy ? null : createSupabaseServiceClient();
}

function auditChatEvent(eventType, requester, details = {}) {
  console.warn('[dicta-security-event]', JSON.stringify({
    eventType,
    route: '/api/openrouter/chat',
    profileId: requester?.profileId ?? null,
    role: requester?.legacy ? 'legacy' : requester?.role ?? null,
    severity: details.severity ?? 'warn',
    statusCode: details.statusCode ?? null,
    model: details.model ?? null,
    reason: details.reason ?? '',
    createdAt: new Date().toISOString(),
  }));
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

  let requester;
  let securityClient = null;
  try {
    requester = await resolveRequestProfile(req, { allowLegacyEnvProfile: true });
    securityClient = createSecurityClient(requester);
    assertOpenRouterAccess(requester);
  } catch (error) {
    auditChatEvent('openrouter_chat_access_rejected', requester, { statusCode: error?.statusCode, reason: error instanceof Error ? error.message : 'access rejected' });
    sendApiError(res, error, 'OpenRouter chat request failed.');
    return;
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    auditChatEvent('openrouter_chat_missing_key', requester, { statusCode: 500, severity: 'error' });
    res.status(500).send('Missing OPENROUTER_API_KEY. Add it in Vercel project environment variables.');
    return;
  }

  let requestPayload;
  try {
    requestPayload = readOpenRouterChatPayload(req.body);
    assertOpenRouterModelAllowed(requester, requestPayload.model);
    await enforceOpenRouterRateLimit({
      supabase: securityClient,
      requester,
      res,
      scope: OPENROUTER_RATE_LIMIT_SCOPES.chat,
      limit: getOpenRouterLimit('chat', requester),
      allowInMemoryFallback: requester.legacy === true,
    });
  } catch (error) {
    auditChatEvent(error?.statusCode === 429 ? 'openrouter_chat_rate_limited' : 'openrouter_chat_rejected', requester, {
      statusCode: error?.statusCode,
      model: requestPayload?.model,
      reason: error instanceof Error ? error.message : 'request rejected',
    });
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

    if (!response.ok) {
      auditChatEvent('openrouter_chat_provider_error', requester, { statusCode: response.status, model: requestPayload.model });
    }

    res.status(response.status);
    res.setHeader('Content-Type', response.contentType);
    res.setHeader('X-Dicta-OpenRouter-Model', requestPayload.model);
    res.send(response.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OpenRouter chat request failed.';
    const statusCode = message.toLowerCase().includes('aborted') ? 504 : 500;
    auditChatEvent(statusCode === 504 ? 'openrouter_chat_timeout' : 'openrouter_chat_failed', requester, {
      statusCode,
      severity: 'error',
      model: requestPayload.model,
      reason: message,
    });
    if (statusCode === 504) {
      res.status(504).send(`Selected OpenRouter model "${requestPayload.model}" timed out after 290 seconds.`);
      return;
    }
    res.status(500).send(message);
  }
}
