import type { ControllerConfig } from '../types/dictation';

export const DEFAULT_CONFIG: ControllerConfig = {
  minRate: 0.8,
  maxRate: 1.08,
  tickMs: 120,
  hysteresisMs: 600,
  lagSoftSec: 0.8,
  lagHardSec: 2.8,
  aheadSoftSec: -1.4,
  repeatWords: 4,
  maxRepeatPerMinute: 6,
  repeatCooldownSec: 10,
};

export type Difficulty = 'easy' | 'normal' | 'hard';

export function formatDifficultyLabel(difficulty: Difficulty): string {
  if (difficulty === 'easy') return 'Easy';
  if (difficulty === 'hard') return 'High';
  return 'Medium';
}

export function configForDifficulty(difficulty: Difficulty): ControllerConfig {
  if (difficulty === 'easy') {
    return {
      ...DEFAULT_CONFIG,
      lagSoftSec: 1.6,
      lagHardSec: 3.2,
      aheadSoftSec: -1.0,
    };
  }

  if (difficulty === 'hard') {
    return {
      ...DEFAULT_CONFIG,
      lagSoftSec: 0.9,
      lagHardSec: 2.2,
      aheadSoftSec: -0.6,
    };
  }

  return DEFAULT_CONFIG;
}
