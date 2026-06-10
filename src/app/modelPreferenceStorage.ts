export const OLLAMA_RECOMMENDED_DEFAULT_MODEL = 'gemma3:27b-cloud';

const OPENROUTER_DEFAULT_MODEL_STORAGE_KEY = 'dicta.openrouterDefaultModel.v1';
const OLLAMA_DEFAULT_MODEL_STORAGE_KEY = 'dicta.ollamaDefaultModel.v1';

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function parseStoredString(value: string | null): string {
  if (!value) {
    return '';
  }

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'string' ? parsed : value;
  } catch {
    return value;
  }
}

export function loadOpenRouterDefaultModel(): string {
  if (!canUseLocalStorage()) {
    return '';
  }

  return parseStoredString(window.localStorage.getItem(OPENROUTER_DEFAULT_MODEL_STORAGE_KEY));
}

export function persistOpenRouterDefaultModel(model: string): void {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(OPENROUTER_DEFAULT_MODEL_STORAGE_KEY, JSON.stringify(model));
}

export function loadOllamaDefaultModel(): string {
  if (!canUseLocalStorage()) {
    return OLLAMA_RECOMMENDED_DEFAULT_MODEL;
  }

  return parseStoredString(window.localStorage.getItem(OLLAMA_DEFAULT_MODEL_STORAGE_KEY)).trim() || OLLAMA_RECOMMENDED_DEFAULT_MODEL;
}

export function persistOllamaDefaultModel(model: string): void {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(OLLAMA_DEFAULT_MODEL_STORAGE_KEY, JSON.stringify(model));
}
