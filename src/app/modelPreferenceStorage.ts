import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../core/storage/safeLocalStorage';

const OPENROUTER_DEFAULT_MODEL_STORAGE_KEY = 'dicta.openrouterDefaultModel.v1';

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

  return parseStoredString(safeGetLocalStorageItem(OPENROUTER_DEFAULT_MODEL_STORAGE_KEY));
}

export function persistOpenRouterDefaultModel(model: string): void {
  if (!canUseLocalStorage()) {
    return;
  }

  safeSetLocalStorageItem(OPENROUTER_DEFAULT_MODEL_STORAGE_KEY, JSON.stringify(model));
}
