import { extractOpenRouterJobSessionJson, tryParseOpenRouterJobJson } from './_jobJson.js';

const OPENROUTER_JOB_MAX_ATTEMPTS = 3;
const OPENROUTER_JOB_RETRY_BASE_DELAY_MS = 750;
const OPENROUTER_RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const OPENROUTER_RETRYABLE_ERROR_MARKERS = [
  'no healthy upstream',
  'temporarily unavailable',
  'upstream',
  'overloaded',
  'timeout',
  'timed out',
  'rate limit',
];

function getRequiredEnv(name) {
  const value = process.env[name]?.trim() ?? '';
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readOpenRouterErrorDetails(body) {
  const parsed = tryParseOpenRouterJobJson(body);
  const error = parsed?.error && typeof parsed.error === 'object' ? parsed.error : null;
  const metadata = error?.metadata && typeof error.metadata === 'object' ? error.metadata : null;
  const message = typeof error?.message === 'string' ? error.message.trim() : '';
  const raw = typeof metadata?.raw === 'string' ? metadata.raw.trim() : '';
  const providerName = typeof metadata?.provider_name === 'string' ? metadata.provider_name.trim() : '';
  return { message, raw, providerName };
}

function buildOpenRouterJobModelCandidates(primaryModel) {
  const model = typeof primaryModel === 'string' ? primaryModel.trim() : '';
  return model ? [model] : [];
}

export function resolveOpenRouterJobModelCandidates(model) {
  return buildOpenRouterJobModelCandidates(model);
}

export function isRetryableOpenRouterJobResponse(response) {
  if (!response || response.ok) return false;
  if (OPENROUTER_RETRYABLE_STATUS_CODES.has(Number(response.status))) return true;
  const body = typeof response.body === 'string' ? response.body.toLowerCase() : '';
  return OPENROUTER_RETRYABLE_ERROR_MARKERS.some((marker) => body.includes(marker));
}

export function formatOpenRouterJobProviderError(response, attempts = []) {
  const status = Number(response?.status);
  const statusLabel = Number.isFinite(status) ? String(status) : 'unknown status';
  const { message, raw, providerName } = readOpenRouterErrorDetails(response?.body ?? '');
  const summary = raw || message || response?.scriptError || `OpenRouter request failed (${statusLabel}).`;
  const provider = providerName ? ` from ${providerName}` : '';
  const retryCount = Math.max(0, attempts.length - 1);
  const retryText = retryCount > 0 ? ` Retried ${retryCount} time${retryCount === 1 ? '' : 's'}.` : '';
  const modelCount = new Set(attempts.map((attempt) => attempt.model).filter(Boolean)).size;
  const modelText = modelCount > 1 ? ` Tried ${modelCount} models.` : '';
  const punctuatedSummary = /[.!?]$/.test(summary) ? summary : `${summary}.`;
  return `OpenRouter provider error (${statusLabel}${provider}): ${punctuatedSummary}${retryText}${modelText}`;
}

export function readOpenRouterApiKey() {
  return getRequiredEnv('OPENROUTER_API_KEY');
}

async function postChatCompletion({ apiKey, req, model, prompt, maxTokens, timeoutMs }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: ['Bearer', apiKey].join(' '),
        'Content-Type': 'application/json',
        'HTTP-Referer': req.headers.origin ?? 'https://vercel.app',
        'X-Title': 'Dicta',
      },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
      signal: controller.signal,
    });
    const body = await response.text();
    return { ok: response.ok, status: response.status, contentType: response.headers.get('content-type') ?? 'application/json', body };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function postChatCompletionWithRetries({ apiKey, req, model, prompt, maxTokens, timeoutMs }) {
  const attempts = [];
  let lastResponse = null;
  for (let attempt = 1; attempt <= OPENROUTER_JOB_MAX_ATTEMPTS; attempt += 1) {
    const response = await postChatCompletion({ apiKey, req, model, prompt, maxTokens, timeoutMs });
    const retryable = isRetryableOpenRouterJobResponse(response);
    const { providerName } = readOpenRouterErrorDetails(response.body);
    attempts.push({ attempt, model, status: response.status, ok: response.ok, retryable: !response.ok && retryable, ...(providerName ? { providerName } : {}) });
    lastResponse = response;
    if (response.ok || !retryable || attempt === OPENROUTER_JOB_MAX_ATTEMPTS) break;
    await delay(OPENROUTER_JOB_RETRY_BASE_DELAY_MS * attempt);
  }
  return { ...lastResponse, model, attempts };
}

export async function postChatCompletionWithSelectedModelRetries({ apiKey, req, model, prompt, maxTokens, timeoutMs }) {
  const allAttempts = [];
  let lastResponse = null;
  let receivedSuccessfulResponse = false;
  for (const candidateModel of buildOpenRouterJobModelCandidates(model)) {
    const response = await postChatCompletionWithRetries({ apiKey, req, model: candidateModel, prompt, maxTokens, timeoutMs });
    allAttempts.push(...response.attempts);
    lastResponse = { ...response, attempts: allAttempts };

    if (!response.ok) {
      if (!isRetryableOpenRouterJobResponse(response)) break;
      continue;
    }

    receivedSuccessfulResponse = true;
    const payload = tryParseOpenRouterJobJson(response.body);
    const text = typeof payload?.choices?.[0]?.message?.content === 'string' ? payload.choices[0].message.content : '';
    const scriptText = extractOpenRouterJobSessionJson(text);
    const latestAttempt = allAttempts[allAttempts.length - 1];
    if (latestAttempt) latestAttempt.jsonValid = Boolean(scriptText);
    if (scriptText) return { ...response, attempts: allAttempts, model: candidateModel, payload, scriptText };
  }

  if (lastResponse && !receivedSuccessfulResponse) {
    return lastResponse;
  }

  return {
    ...(lastResponse ?? {}),
    ok: false,
    status: 422,
    attempts: allAttempts,
    scriptError: `OpenRouter returned text without valid session JSON for selected model "${model}".`,
  };
}
