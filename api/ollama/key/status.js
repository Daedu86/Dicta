import { resolveRequestProfile, sendApiError } from '../../_supabaseProfile.js';

function getOllamaApiKey() {
  return process.env.OLLAMA_API_KEY?.trim() ?? '';
}

function maskApiKeySuffix(value) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const suffixLength = 4;
  const suffix = trimmed.length > suffixLength ? trimmed.slice(-suffixLength) : trimmed;
  return `...${suffix}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    await resolveRequestProfile(req, { allowLegacyEnvProfile: true });
  } catch (error) {
    sendApiError(res, error, 'Ollama key status failed.');
    return;
  }

  const apiKey = getOllamaApiKey();
  res.status(200).json({ configured: Boolean(apiKey), suffix: maskApiKeySuffix(apiKey) });
}
