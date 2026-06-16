import type { PhraseSize } from './types';

export type RuntimePolicy = {
  targetRateRange: [number, number];
  targetPauseMs: number;
  targetPhraseSize: PhraseSize;
  boundaryPolicy: 'strict_semantic' | 'normal_semantic';
};

export type LearningPolicy = {
  difficulty: 'easy' | 'normal' | 'hard';
  phraseDifficultyRange: [number, number];
  phrasePolicy: 'short_safe_semantic' | 'stable_semantic' | 'moderate_semantic' | 'challenge_semantic';
  contentGuidance: string[];
};

export type AdaptivePolicyLayers = {
  runtimePolicy: RuntimePolicy;
  learningPolicy: LearningPolicy;
};
