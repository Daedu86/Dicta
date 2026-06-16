import { useRef, useState } from 'react';
import {
  createEmptyOpenRouterGenerationSlot,
  createEmptyOpenRouterGenerationSlots,
  loadPersistedOpenRouterGenerationVariants,
  persistOpenRouterGenerationVariants,
} from './openRouterViewHelpers';
import type {
  OpenRouterGenerationSlotId,
  OpenRouterGenerationSlots,
  OpenRouterGenerationSlotState,
} from './types';

export function useOpenRouterGenerationSlots(defaultModel: string) {
  const persistedGenerationSlotsRef = useRef<OpenRouterGenerationSlots | null>(
    loadPersistedOpenRouterGenerationVariants(defaultModel),
  );

  const [generationSlots, setGenerationSlots] = useState<OpenRouterGenerationSlots>(
    () => persistedGenerationSlotsRef.current ?? createEmptyOpenRouterGenerationSlots(defaultModel),
  );

  const [generateBusySlots, setGenerateBusySlots] = useState<Record<OpenRouterGenerationSlotId, boolean>>({
    prompt1: false,
    prompt2: false,
  });

  function updateGenerationSlots(updater: (current: OpenRouterGenerationSlots) => OpenRouterGenerationSlots): void {
    setGenerationSlots((current) => {
      const next = updater(current);
      persistOpenRouterGenerationVariants(next);
      return next;
    });
  }

  function updateGenerationSlot(slotId: OpenRouterGenerationSlotId, patch: Partial<OpenRouterGenerationSlotState>): void {
    updateGenerationSlots((current) => ({
      ...current,
      [slotId]: {
        ...current[slotId],
        ...patch,
      },
    }));
  }

  function clearGeneratedScriptDraft(slotId: OpenRouterGenerationSlotId): void {
    updateGenerationSlots((current) => ({
      ...current,
      [slotId]: createEmptyOpenRouterGenerationSlot(defaultModel),
    }));
  }

  return {
    generationSlots,
    generateBusySlots,
    setGenerateBusySlots,
    updateGenerationSlot,
    clearGeneratedScriptDraft,
  };
}
