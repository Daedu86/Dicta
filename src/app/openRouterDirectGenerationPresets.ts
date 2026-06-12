import type { ListeningTrainingIntent } from '../core/adaptive/types';
import type { DictationScriptDifficulty } from '../core/adaptive/dictationScriptValidation';
import type { OpenRouterDurationMinutes } from '../core/adaptive/openRouterGenerationPrompt';

export type OpenRouterDirectGenerationPresetKey =
  | 'easy'
  | 'medium'
  | 'hard'
  | 'expressEasy'
  | 'expressMedium'
  | 'expressHard';

export type OpenRouterDirectGenerationPreset = {
  id: 'easy' | 'medium' | 'hard' | 'express-easy' | 'express-medium' | 'express-hard';
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
    displayLabel: 'Easy session',
    durationMinutes: 2,
    userIntent: 'recover',
    targetDifficulty: 'easy',
    difficultyInstruction: 'Recovery intent: keep material accessible and obey the trainer prescription if it narrows the range.',
  },
  medium: {
    id: 'medium',
    slotLabel: 'Intermediate direct session',
    displayLabel: 'Medium session',
    durationMinutes: 2,
    userIntent: 'progress',
    targetDifficulty: 'normal',
    difficultyInstruction: 'Progress intent: use moderate phrase difficulty only when the trainer prescription allows it.',
  },
  hard: {
    id: 'hard',
    slotLabel: 'Advanced direct session',
    displayLabel: 'Hard session',
    durationMinutes: 2,
    userIntent: 'challenge',
    targetDifficulty: 'hard',
    difficultyInstruction: 'Challenge intent: use harder content only if the trainer prescription keeps the session in challenge mode.',
  },
  expressEasy: {
    id: 'express-easy',
    slotLabel: 'Express easy direct session',
    displayLabel: 'Express easy session',
    durationMinutes: 1,
    userIntent: 'recover',
    targetDifficulty: 'easy',
    difficultyInstruction: 'Express recovery intent: keep material accessible and obey the trainer prescription if it narrows the range.',
  },
  expressMedium: {
    id: 'express-medium',
    slotLabel: 'Express intermediate direct session',
    displayLabel: 'Express medium session',
    durationMinutes: 1,
    userIntent: 'progress',
    targetDifficulty: 'normal',
    difficultyInstruction: 'Express progress intent: use moderate phrase difficulty only when the trainer prescription allows it.',
  },
  expressHard: {
    id: 'express-hard',
    slotLabel: 'Express advanced direct session',
    displayLabel: 'Express hard session',
    durationMinutes: 1,
    userIntent: 'challenge',
    targetDifficulty: 'hard',
    difficultyInstruction: 'Express challenge intent: use harder content only if the trainer prescription keeps the session in challenge mode.',
  },
} satisfies Record<OpenRouterDirectGenerationPresetKey, OpenRouterDirectGenerationPreset>;
