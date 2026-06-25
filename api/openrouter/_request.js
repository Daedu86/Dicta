export const OPENROUTER_FREE_ROUTER_MODEL = 'openrouter/free';
export const OPENROUTER_ACTIVE_JOB_LIMIT = 3;
export const OPENROUTER_PROMPT_MAX_CHARS = 32_000;
export const OPENROUTER_MODEL_MAX_CHARS = 160;
export const OPENROUTER_MIN_MAX_TOKENS = 128;
export const OPENROUTER_CHAT_MAX_MAX_TOKENS = 1_800;
export const OPENROUTER_JOB_MAX_MAX_TOKENS = 7_200;
export const OPENROUTER_CHAT_DEFAULT_MAX_TOKENS = 600;
export const OPENROUTER_SLOT_LABEL_MAX_CHARS = 80;
export const OPENROUTER_TARGET_DIFFICULTY_MAX_CHARS = 40;

const VALID_LANGUAGES = new Set(['en', 'es', 'de', 'fr', 'pt']);
const VALID_INPUT_MODES = new Set(['browser-tts']);
const VALID_DURATIONS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const VALID_GENERATION_FORMATS = new Set(['dictation-script-v1', 'compact-chunks-v1']);
const VALID_PHRASE_SIZES = new Set(['short', 'medium', 'long']);
const VALID_DIFFICULTIES = new Set(['easy', 'normal', 'hard']);
const DEFAULT_JOB_MAX_TOKENS_BY_DURATION = new Map([
  [1, 1_800],
  [2, 1_800],
  [3, 2_400],
  [4, 3_000],
  [5, 3_600],
  [6, 4_200],
  [7, 4_800],
  [8, 5_400],
  [9, 6_000],
  [10, 6_600],
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
  const inputMode = typeof payload.inputMode === 'string' ? payload.inputMode.trim() : '';
  const language = typeof payload.language === 'string' ? payload.language : '';
  const durationMinutes = Number(payload.durationMinutes);

  if (!model || !prompt) throw validationError('Missing model or prompt.');
  if (!VALID_INPUT_MODES.has(inputMode)) throw validationError('Invalid inputMode.');
  if (!VALID_LANGUAGES.has(language)) throw validationError('Invalid language.');
  if (!VALID_DURATIONS.has(durationMinutes)) throw validationError('Invalid durationMinutes.');

  const slotLabel = normalizeShortLabel(payload.slotLabel, 'OpenRouter session', OPENROUTER_SLOT_LABEL_MAX_CHARS);
  const targetDifficulty = normalizeShortLabel(payload.targetDifficulty, '', OPENROUTER_TARGET_DIFFICULTY_MAX_CHARS);
  const generationFormat = normalizeGenerationFormat(payload.generationFormat);
  const scriptBuildPolicy = generationFormat === 'compact-chunks-v1'
    ? normalizeScriptBuildPolicy(payload.scriptBuildPolicy, {
        inputMode,
        language,
        durationMinutes,
        difficulty: VALID_DIFFICULTIES.has(targetDifficulty) ? targetDifficulty : 'normal',
      })
    : null;

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
    generationFormat,
    ...(targetDifficulty ? { targetDifficulty } : {}),
    ...(scriptBuildPolicy ? { scriptBuildPolicy } : {}),
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

function normalizeGenerationFormat(value) {
  const format = typeof value === 'string' ? value.trim() : '';
  if (!format) return 'dictation-script-v1';
  if (!VALID_GENERATION_FORMATS.has(format)) throw validationError('Invalid generationFormat.');
  return format;
}

function normalizeScriptBuildPolicy(value, fallback) {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const inputMode = typeof record.inputMode === 'string' && VALID_INPUT_MODES.has(record.inputMode.trim())
    ? record.inputMode.trim()
    : fallback.inputMode;
  const language = typeof record.language === 'string' && VALID_LANGUAGES.has(record.language.trim())
    ? record.language.trim()
    : fallback.language;
  const difficulty = typeof record.difficulty === 'string' && VALID_DIFFICULTIES.has(record.difficulty.trim())
    ? record.difficulty.trim()
    : fallback.difficulty;
  const durationMinutes = VALID_DURATIONS.has(Number(record.durationMinutes))
    ? Number(record.durationMinutes)
    : fallback.durationMinutes;
  return {
    inputMode,
    language,
    difficulty,
    durationMinutes,
    recommendedRateRange: normalizeNumberPair(record.recommendedRateRange, [0.9, 1], 0.1, 2),
    recommendedPhraseSize: typeof record.recommendedPhraseSize === 'string' && VALID_PHRASE_SIZES.has(record.recommendedPhraseSize.trim())
      ? record.recommendedPhraseSize.trim()
      : 'medium',
    recommendedPauseMs: normalizeNonNegativeNumber(record.recommendedPauseMs, 600),
    phraseDifficultyRange: normalizeNumberPair(record.phraseDifficultyRange, [0.45, 0.65], 0, 1),
  };
}

function normalizeNumberPair(value, fallback, min, max) {
  if (!Array.isArray(value) || value.length < 2) return fallback;
  const first = Number(value[0]);
  const second = Number(value[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return fallback;
  const low = Math.max(min, Math.min(max, first));
  const high = Math.max(min, Math.min(max, second));
  return low <= high ? [round2(low), round2(high)] : [round2(high), round2(low)];
}

function normalizeNonNegativeNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : fallback;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function validationError(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}
