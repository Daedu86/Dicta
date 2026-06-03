export const OPENROUTER_FREE_ROUTER_MODEL = 'openrouter/free';
export const OPENROUTER_ACTIVE_JOB_LIMIT = 3;
export const OPENROUTER_PROMPT_MAX_CHARS = 32_000;
export const OPENROUTER_MODEL_MAX_CHARS = 160;
export const OPENROUTER_MIN_MAX_TOKENS = 128;
export const OPENROUTER_CHAT_MAX_MAX_TOKENS = 1_800;
export const OPENROUTER_JOB_MAX_MAX_TOKENS = 4_800;
export const OPENROUTER_CHAT_DEFAULT_MAX_TOKENS = 600;
export const OPENROUTER_SLOT_LABEL_MAX_CHARS = 80;
export const OPENROUTER_TARGET_DIFFICULTY_MAX_CHARS = 40;

const VALID_LANGUAGES = new Set(['en', 'es', 'de', 'fr', 'pt']);
const VALID_INPUT_MODES = new Set(['audio', 'browser-tts', 'kokoro', 'qwen-cloud']);
const VALID_DURATIONS = new Set([1, 2, 3, 4]);
const DEFAULT_JOB_MAX_TOKENS_BY_DURATION = new Map([
  [1, 1_800],
  [2, 2_600],
  [3, 3_800],
  [4, 4_800],
]);
const OPENROUTER_MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;

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

export function readOpenRouterChatPayload(body) {
  const payload = normalizeRequestBody(body);
  const model = normalizeOpenRouterModelId(payload.model);
  const prompt = normalizeOpenRouterPrompt(payload.prompt);
  if (!model || !prompt) throw validationError('Missing model or prompt.');

  return {
    model,
    prompt,
    maxTokens: normalizeMaxTokens(payload.maxTokens, OPENROUTER_CHAT_DEFAULT_MAX_TOKENS, OPENROUTER_CHAT_MAX_MAX_TOKENS),
  };
}

export function readOpenRouterJobPayload(body) {
  const payload = normalizeRequestBody(body);
  const model = normalizeOpenRouterModelId(payload.model);
  const prompt = normalizeOpenRouterPrompt(payload.prompt);
  const inputMode = typeof payload.inputMode === 'string' ? payload.inputMode : '';
  const language = typeof payload.language === 'string' ? payload.language : '';
  const durationMinutes = Number(payload.durationMinutes);

  if (!model || !prompt) throw validationError('Missing model or prompt.');
  if (!VALID_INPUT_MODES.has(inputMode)) throw validationError('Invalid inputMode.');
  if (!VALID_LANGUAGES.has(language)) throw validationError('Invalid language.');
  if (!VALID_DURATIONS.has(durationMinutes)) throw validationError('Invalid durationMinutes.');

  const slotLabel = normalizeShortLabel(payload.slotLabel, 'OpenRouter session', OPENROUTER_SLOT_LABEL_MAX_CHARS);
  const targetDifficulty = normalizeShortLabel(payload.targetDifficulty, '', OPENROUTER_TARGET_DIFFICULTY_MAX_CHARS);

  return {
    model,
    prompt,
    maxTokens: normalizeMaxTokens(
      payload.maxTokens,
      DEFAULT_JOB_MAX_TOKENS_BY_DURATION.get(durationMinutes) ?? OPENROUTER_CHAT_DEFAULT_MAX_TOKENS,
      OPENROUTER_JOB_MAX_MAX_TOKENS,
    ),
    inputMode,
    language,
    slotLabel,
    durationMinutes,
    ...(targetDifficulty ? { targetDifficulty } : {}),
  };
}

export function normalizeOpenRouterModelId(value) {
  const model = typeof value === 'string' ? value.trim() : '';
  if (!model) return '';
  if (model.length > OPENROUTER_MODEL_MAX_CHARS || !OPENROUTER_MODEL_PATTERN.test(model)) {
    throw validationError('Invalid OpenRouter model id.');
  }
  if (model !== OPENROUTER_FREE_ROUTER_MODEL && !model.endsWith(':free')) {
    throw validationError('OpenRouter model must be openrouter/free or a :free model variant.');
  }
  return model;
}

function normalizeOpenRouterPrompt(value) {
  const prompt = typeof value === 'string' ? value.trim() : '';
  if (!prompt) return '';
  if (prompt.length > OPENROUTER_PROMPT_MAX_CHARS) {
    throw validationError(`Prompt is too large. Limit is ${OPENROUTER_PROMPT_MAX_CHARS} characters.`);
  }
  return prompt;
}

function normalizeMaxTokens(value, fallback, maxTokens) {
  const hasValue = value !== undefined && value !== null && value !== '';
  const numeric = hasValue ? Number(value) : fallback;
  const bounded = Number.isFinite(numeric) ? numeric : fallback;
  return Math.max(OPENROUTER_MIN_MAX_TOKENS, Math.min(maxTokens, Math.round(bounded)));
}

function normalizeShortLabel(value, fallback, maxChars) {
  const label = typeof value === 'string' ? value.trim() : '';
  if (!label) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(label)) throw validationError('Invalid OpenRouter request label.');
  return label.slice(0, maxChars);
}

function validationError(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}
