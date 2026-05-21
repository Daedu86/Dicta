import { assertOpenRouterAccess, resolveRequestProfile, sendApiError } from '../_supabaseProfile.js';

function getOpenRouterApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() ?? '';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    const requester = await resolveRequestProfile(req, { allowLegacyEnvProfile: true });
    assertOpenRouterAccess(requester);
  } catch (error) {
    sendApiError(res, error, 'OpenRouter model request failed.');
    return;
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
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

    const body = await response.text();
    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') ?? 'application/json');
    res.send(body);
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : 'OpenRouter model request failed.');
  }
}
