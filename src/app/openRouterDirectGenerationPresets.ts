import type { ListeningTrainingIntent } from '../core/adaptive/types';
import type { DictationScriptDifficulty } from '../core/adaptive/dictationScriptValidation';
import type { OpenRouterDurationMinutes } from '../core/adaptive/openRouterGenerationPrompt';

export type OpenRouterDirectGenerationPresetKey = 'adaptive' | 'topic';

export type OpenRouterDirectGenerationPreset = {
  id: OpenRouterDirectGenerationPresetKey;
  slotLabel: string;
  displayLabel: string;
  durationMinutes: OpenRouterDurationMinutes;
  userIntent: ListeningTrainingIntent;
  targetDifficulty: DictationScriptDifficulty;
  difficultyInstruction: string;
};

export const OPEN_ROUTER_DIRECT_GENERATION_DEFAULT_DURATION: OpenRouterDurationMinutes = 3;
export const OPEN_ROUTER_DIRECT_GENERATION_DURATION_OPTIONS: OpenRouterDurationMinutes[] = [2, 3, 4, 5, 6];

const ADAPTIVE_DIRECT_GENERATION_PRESET: OpenRouterDirectGenerationPreset = {
  id: 'adaptive',
  slotLabel: 'Adaptive direct session',
  displayLabel: 'Adaptive session',
  durationMinutes: OPEN_ROUTER_DIRECT_GENERATION_DEFAULT_DURATION,
  userIntent: 'challenge',
  targetDifficulty: 'hard',
  difficultyInstruction: 'Adaptive session: request the highest safe training level, but let the trainer prescription downgrade to recover, stabilize, or progress when the benchmark and latest feedback show pressure.',
};

export const OPEN_ROUTER_DIRECT_GENERATION_PRESETS = {
  adaptive: ADAPTIVE_DIRECT_GENERATION_PRESET,
  topic: {
    ...ADAPTIVE_DIRECT_GENERATION_PRESET,
    id: 'topic',
    slotLabel: 'Topic direct session',
    displayLabel: 'Topic session',
  },
} satisfies Record<OpenRouterDirectGenerationPresetKey, OpenRouterDirectGenerationPreset>;
