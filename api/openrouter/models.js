import { createSupabaseServiceClient, assertOpenRouterAccess, resolveRequestProfile, sendApiError } from '../_supabaseProfile.js';
import { auditSecurityEvent } from './_security.js';

const MODELS_ROUTE = '/api/openrouter/models';

function getOpenRouterApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() ?? '';
}

function createSecurityClient(requester) {
  return requester?.legacy ? null : createSupabaseServiceClient();
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
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': req.headers.origin ?? 'https://vercel.app',
        'X-Title': 'Dicta',
      },
    });

    if (!response.ok) {
      await auditModelsEvent(securityClient, 'openrouter_models_provider_error', requester, {
        statusCode: response.status,
        reason: 'OpenRouter models provider returned an error.',
      });
    }

    const body = await response.text();
    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') ?? 'application/json');
    res.send(body);
  } catch (error) {
    await auditModelsEvent(securityClient, 'openrouter_models_failed', requester, {
      severity: 'error',
      statusCode: 500,
      reason: error instanceof Error ? error.message : 'OpenRouter model request failed.',
    });
    res.status(500).send(error instanceof Error ? error.message : 'OpenRouter model request failed.');
  }
}
