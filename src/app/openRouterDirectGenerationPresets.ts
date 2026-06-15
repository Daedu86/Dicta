import type { ListeningTrainingIntent } from '../core/adaptive/types';
import type { DictationScriptDifficulty } from '../core/adaptive/dictationScriptValidation';
import type { OpenRouterDurationMinutes } from '../core/adaptive/openRouterGenerationPrompt';

export type OpenRouterDirectGenerationPresetKey =
  | 'easy'
  | 'medium'
  | 'hard';

export type OpenRouterDirectGenerationPreset = {
  id: 'easy' | 'medium' | 'hard';
  slotLabel: string;
  displayLabel: string;
  durationMinutes: OpenRouterDurationMinutes;
  userIntent: ListeningTrainingIntent;
  targetDifficulty: DictationScriptDifficulty;
  difficultyInstruction: string;
};

export const OPEN_ROUTER_DIRECT_GENERATION_PRESETS = {
  easy: {
    id: 'easy',
    slotLabel: 'Easy direct session',
    displayLabel: 'Precision session',
    durationMinutes: 2,
    userIntent: 'recover',
    targetDifficulty: 'easy',
    difficultyInstruction: 'Recovery intent: keep material accessible and obey the trainer prescription if it narrows the range.',
  },
  medium: {
    id: 'medium',
    slotLabel: 'Intermediate direct session',
    displayLabel: 'Stabilize session',
    durationMinutes: 2,
    userIntent: 'progress',
    targetDifficulty: 'normal',
    difficultyInstruction: 'Progress intent: use moderate phrase difficulty only when the trainer prescription allows it.',
  },
  hard: {
    id: 'hard',
    slotLabel: 'Advanced direct session',
    displayLabel: 'Challenge session',
    durationMinutes: 2,
    userIntent: 'challenge',
    targetDifficulty: 'hard',
    difficultyInstruction: 'Challenge intent: use harder content only if the trainer prescription keeps the session in challenge mode.',
  },
} satisfies Record<OpenRouterDirectGenerationPresetKey, OpenRouterDirectGenerationPreset>;
