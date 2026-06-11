export type LocalDevHttpErrorFactory = (message: string, statusCode: number) => Error & { statusCode: number };

export type LocalDevApiValidationConfig = {
  httpError: LocalDevHttpErrorFactory;
  maxOpenRouterKeyBytes: number;
  maxOllamaKeyBytes: number;
  openRouterFreeRouterModel: string;
  openRouterPromptMaxChars: number;
  ollamaPromptMaxChars: number;
  openRouterModelMaxChars: number;
  ollamaModelMaxChars: number;
};

export function createLocalDevApiValidation(config: LocalDevApiValidationConfig) {
  const {
    httpError,
    maxOpenRouterKeyBytes,
    maxOllamaKeyBytes,
    openRouterFreeRouterModel,
    openRouterPromptMaxChars,
    ollamaPromptMaxChars,
    openRouterModelMaxChars,
    ollamaModelMaxChars,
  } = config;

  const validateOpenRouterApiKey = (apiKey: string): string => {
    const cleaned = apiKey.trim();
    if (!cleaned) throw httpError('Missing apiKey.', 400);
    if (/[\r\n]/.test(cleaned)) throw httpError('OpenRouter API key cannot contain line breaks.', 400);
    if (cleaned.length > maxOpenRouterKeyBytes) throw httpError('OpenRouter API key is too large.', 400);
    return cleaned;
  };

  const validateOllamaApiKey = (apiKey: string): string => {
    const cleaned = apiKey.trim();
    if (!cleaned) throw httpError('Missing apiKey.', 400);
    if (/[\r\n]/.test(cleaned)) throw httpError('Ollama API key cannot contain line breaks.', 400);
    if (cleaned.length > maxOllamaKeyBytes) throw httpError('Ollama API key is too large.', 400);
    return cleaned;
  };

  const normalizeOpenRouterModel = (value: unknown): string => {
    const model = typeof value === 'string' ? value.trim() : '';
    if (!model) return '';
    if (model.length > openRouterModelMaxChars || !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(model)) {
      throw httpError('Invalid OpenRouter model id.', 400);
    }
    if (model !== openRouterFreeRouterModel && !model.endsWith(':free')) {
      throw httpError('OpenRouter model must be openrouter/free or a :free model variant.', 400);
    }
    return model;
  };

  const normalizeOllamaModel = (value: unknown): string => {
    const model = typeof value === 'string' ? value.trim() : '';
    if (!model) return '';
    if (model.length > ollamaModelMaxChars || !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(model)) {
      throw httpError('Invalid Ollama model id.', 400);
    }
    return model;
  };

  const normalizeOpenRouterPrompt = (value: unknown): string => {
    const prompt = typeof value === 'string' ? value.trim() : '';
    if (!prompt) return '';
    if (prompt.length > openRouterPromptMaxChars) {
      throw httpError(`Prompt is too large. Limit is ${openRouterPromptMaxChars} characters.`, 400);
    }
    return prompt;
  };

  const normalizeOllamaPrompt = (value: unknown): string => {
    const prompt = typeof value === 'string' ? value.trim() : '';
    if (!prompt) return '';
    if (prompt.length > ollamaPromptMaxChars) {
      throw httpError(`Prompt is too large. Limit is ${ollamaPromptMaxChars} characters.`, 400);
    }
    return prompt;
  };

  const normalizeOpenRouterMaxTokens = (value: unknown, fallback: number): number => {
    const hasValue = value !== undefined && value !== null && value !== '';
    const numeric = hasValue ? Number(value) : fallback;
    const bounded = Number.isFinite(numeric) ? numeric : fallback;
    return Math.max(128, Math.min(1800, Math.round(bounded)));
  };

  const normalizeOllamaMaxTokens = (value: unknown, fallback: number): number => {
    const hasValue = value !== undefined && value !== null && value !== '';
    const numeric = hasValue ? Number(value) : fallback;
    const bounded = Number.isFinite(numeric) ? numeric : fallback;
    return Math.max(128, Math.min(1800, Math.round(bounded)));
  };

  return {
    validateOpenRouterApiKey,
    validateOllamaApiKey,
    normalizeOpenRouterModel,
    normalizeOllamaModel,
    normalizeOpenRouterPrompt,
    normalizeOllamaPrompt,
    normalizeOpenRouterMaxTokens,
    normalizeOllamaMaxTokens,
  };
}
