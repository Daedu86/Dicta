import type { Dispatch, SetStateAction } from 'react';
import type { InputMode } from '../../core/adaptive/types';
import type { OpenRouterGeneratePromptSource } from '../../core/adaptive/openRouterGenerationPrompt';
import type { OpenRouterGenerationSlotId, OpenRouterGenerationSlots, OpenRouterGenerationSlotState, OpenRouterWorkspaceProps, BenchmarkLanguageButton } from './types';

export type SetGenerateBusySlots = Dispatch<SetStateAction<Record<OpenRouterGenerationSlotId, boolean>>>;

export type UseOpenRouterWorkspaceSlotGenerationArgs = Pick<
  OpenRouterWorkspaceProps,
  'authHeaders' | 'activeJobs' | 'onTrackJob' | 'onCreateGenerationErrorSession'
> & {
  defaultModel: string;
  generationSlots: OpenRouterGenerationSlots;
  generateBusySlots: Record<OpenRouterGenerationSlotId, boolean>;
  setGenerateBusySlots: SetGenerateBusySlots;
  updateGenerationSlot: (slotId: OpenRouterGenerationSlotId, patch: Partial<OpenRouterGenerationSlotState>) => void;
  generateInputMode: InputMode;
  generateLanguage: BenchmarkLanguageButton;
  generatePromptSource: OpenRouterGeneratePromptSource;
  generateDurationMinutes: 2 | 3 | 4;
  generatePayloadPrompt: string;
};

export type OpenRouterWorkspacePromptSize = {
  promptMode: OpenRouterGeneratePromptSource;
  characterCount: number;
  approximateTokenCount: number;
};

export type BuildWorkspaceActiveOpenRouterJobArgs = {
  jobId: string;
  slotId: OpenRouterGenerationSlotId;
  slotLabel: string;
  slotModel: string;
  generationStartedAt: string;
  promptSize: OpenRouterWorkspacePromptSize;
  generateInputMode: InputMode;
  generateLanguage: BenchmarkLanguageButton;
  generateDurationMinutes: 2 | 3 | 4;
};
