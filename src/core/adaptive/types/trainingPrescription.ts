import type { InputMode } from '../inputModes';
import type { LanguageCode, PhraseSize } from './pacing';

export type ListeningTrainingIntent =
  | 'auto'
  | 'recover'
  | 'stabilize'
  | 'progress'
  | 'challenge';

export type ListeningTrainingMode =
  | 'recover'
  | 'stabilize'
  | 'progress'
  | 'challenge';

export type ListeningTrainingPrescription = {
  goal: 'listening_comprehension';
  profileKey: string;
  inputMode: InputMode;
  language: LanguageCode;
  mode: ListeningTrainingMode;
  userIntent: ListeningTrainingIntent;
  difficulty: 'easy' | 'normal' | 'hard';
  durationMinutes: 1 | 2 | 3 | 4;
  targetAccuracyBand: [number, number];
  targetLagMaxSec: number;
  targetRateRange: [number, number];
  targetPauseMs: number;
  targetPhraseSize: PhraseSize;
  phraseDifficultyRange: [number, number];
  phrasePolicy: 'short_safe_semantic' | 'stable_semantic' | 'moderate_semantic' | 'challenge_semantic';
  boundaryPolicy: 'strict_semantic' | 'normal_semantic';
  contentGuidance: string[];
  pacingGuidance: string[];
  rationale: string[];
};
