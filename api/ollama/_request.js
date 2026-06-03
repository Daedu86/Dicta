export const OLLAMA_RECOMMENDED_MODEL = 'gemma3:27b-cloud';
export const OLLAMA_PROMPT_MAX_CHARS = 32_000;
export const OLLAMA_MODEL_MAX_CHARS = 160;
export const OLLAMA_MIN_MAX_TOKENS = 128;
export const OLLAMA_CHAT_MAX_MAX_TOKENS = 1_800;
export const OLLAMA_CHAT_DEFAULT_MAX_TOKENS = 600;

const OLLAMA_MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;

export function normalizeRequestBody(body) {
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

export function readOllamaChatPayload(body) {
  const payload = normalizeRequestBody(body);
  const model = normalizeOllamaModelId(payload.model);
  const prompt = normalizeOllamaPrompt(payload.prompt);
  if (!model || !prompt) throw validationError('Missing model or prompt.');

  return {
    model,
    prompt,
    maxTokens: normalizeMaxTokens(payload.maxTokens, OLLAMA_CHAT_DEFAULT_MAX_TOKENS, OLLAMA_CHAT_MAX_MAX_TOKENS),
  };
}

export function normalizeOllamaModelId(value) {
  const model = typeof value === 'string' ? value.trim() : '';
  if (!model) return '';
  if (model.length > OLLAMA_MODEL_MAX_CHARS || !OLLAMA_MODEL_PATTERN.test(model)) {
    throw validationError('Invalid Ollama model id.');
  }
  return model;
}

export function normalizeOllamaPrompt(value) {
  const prompt = typeof value === 'string' ? value.trim() : '';
  if (!prompt) return '';
  if (prompt.length > OLLAMA_PROMPT_MAX_CHARS) {
    throw validationError(`Prompt is too large. Limit is ${OLLAMA_PROMPT_MAX_CHARS} characters.`);
  }
  return prompt;
}

export function normalizeMaxTokens(value, fallback, maxTokens) {
  const hasValue = value !== undefined && value !== null && value !== '';
  const numeric = hasValue ? Number(value) : fallback;
  const bounded = Number.isFinite(numeric) ? numeric : fallback;
  return Math.max(OLLAMA_MIN_MAX_TOKENS, Math.min(maxTokens, Math.round(bounded)));
}

export function formatOllamaUpstreamError(status, body, fallback = 'Ollama Cloud request failed.') {
  const detail = extractOllamaErrorText(body);
  if (status === 429) {
    return `Ollama Cloud rate/quota limit likely (429).${detail ? ` ${detail}` : ''}`;
  }
  if (status === 401 || status === 403) {
    return `Ollama Cloud auth/plan/access issue (${status}).${detail ? ` ${detail}` : ''}`;
  }
  return `${fallback} (${status}).${detail ? ` ${detail}` : ''}`;
}

function extractOllamaErrorText(body) {
  const raw = typeof body === 'string' ? body.trim() : '';
  if (!raw) return '';

  try {
    const parsed = JSON.parse(raw);
    const message =
      typeof parsed?.error === 'string'
        ? parsed.error
        : typeof parsed?.error?.message === 'string'
          ? parsed.error.message
          : typeof parsed?.message === 'string'
            ? parsed.message
            : '';
    if (message) return message;
  } catch {
    // Fall through to a short raw text excerpt.
  }

  return raw.slice(0, 500);
}

function validationError(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}
