import type {
  OpenRouterGenerationSlotId,
  OpenRouterGenerationSlots,
  OpenRouterGenerationSlotState,
  PersistedOpenRouterGeneration,
} from './types';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../../core/storage/safeLocalStorage';

export const OPENROUTER_GENERATED_SCRIPT_KEY = 'dicta.openrouterGeneratedScript.v1';
export const OPENROUTER_GENERATED_VARIANTS_KEY = 'dicta.openrouterGeneratedVariants.v1';
export const OPENROUTER_GENERATION_SLOT_IDS: OpenRouterGenerationSlotId[] = ['prompt1', 'prompt2'];

export function createEmptyOpenRouterGenerationSlot(defaultModel = ''): OpenRouterGenerationSlotState {
  return {
    notes: '',
    model: defaultModel,
    text: '',
    json: '',
    inputMode: null,
    language: null,
    usage: null,
    elapsedMs: null,
    generatedAt: null,
    error: '',
  };
}

export function createEmptyOpenRouterGenerationSlots(defaultModel = ''): OpenRouterGenerationSlots {
  return {
    prompt1: createEmptyOpenRouterGenerationSlot(defaultModel),
    prompt2: createEmptyOpenRouterGenerationSlot(defaultModel),
  };
}

export function loadPersistedOpenRouterGenerationVariants(defaultModel = ''): OpenRouterGenerationSlots | null {
  try {
    const raw = safeGetLocalStorageItem(OPENROUTER_GENERATED_VARIANTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OpenRouterGenerationSlots>;
    return {
      prompt1: { ...createEmptyOpenRouterGenerationSlot(defaultModel), ...(parsed.prompt1 ?? {}) },
      prompt2: { ...createEmptyOpenRouterGenerationSlot(defaultModel), ...(parsed.prompt2 ?? {}) },
    };
  } catch {
    return null;
  }
}

export function persistOpenRouterGenerationVariants(slots: OpenRouterGenerationSlots): void {
  safeSetLocalStorageItem(OPENROUTER_GENERATED_VARIANTS_KEY, JSON.stringify(slots));
}

export function loadPersistedOpenRouterGeneration(): PersistedOpenRouterGeneration | null {
  try {
    const raw = safeGetLocalStorageItem(OPENROUTER_GENERATED_SCRIPT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedOpenRouterGeneration;
  } catch {
    return null;
  }
}

export function persistOpenRouterGeneration(payload: PersistedOpenRouterGeneration): void {
  safeSetLocalStorageItem(OPENROUTER_GENERATED_SCRIPT_KEY, JSON.stringify(payload));
}
