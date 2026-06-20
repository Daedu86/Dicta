import type { ListeningTrainingIntent } from '../core/adaptive/types';
import type { DictationScriptDifficulty } from '../core/adaptive/dictationScriptValidation';
import type { OpenRouterDurationMinutes } from '../core/adaptive/openRouterGenerationPrompt';

export type OpenRouterDirectGenerationPresetKey = 'adaptive';

export type OpenRouterDirectGenerationPreset = {
  id: 'adaptive';
  slotLabel: string;
  displayLabel: string;
  durationMinutes: OpenRouterDurationMinutes;
  userIntent: ListeningTrainingIntent;
  targetDifficulty: DictationScriptDifficulty;
  difficultyInstruction: string;
};

export const OPEN_ROUTER_DIRECT_GENERATION_PRESETS = {
  adaptive: {
    id: 'adaptive',
    slotLabel: 'Adaptive direct session',
    displayLabel: 'Adaptive session',
    durationMinutes: 2,
    userIntent: 'auto',
    targetDifficulty: 'normal',
    difficultyInstruction: 'Adaptive intent: let the trainer prescription resolve recover, stabilize, progress, or challenge from the current benchmark and latest feedback.',
  },
} satisfies Record<OpenRouterDirectGenerationPresetKey, OpenRouterDirectGenerationPreset>;
