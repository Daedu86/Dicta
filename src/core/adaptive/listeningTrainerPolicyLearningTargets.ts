import type {
  ListeningTrainingMode,
  ListeningTrainingPrescription,
} from './types';
import type { LearningPolicy } from './adaptivePolicyLayers';
import type { assessListeningTrainingPolicy } from './listeningTrainerPolicyAssessment';
import {
  phraseDifficultyRangeForDifficulty,
  phrasePolicyForMode,
} from './listeningTrainerPolicyPacing';
import { buildContentGuidance } from './listeningTrainerPolicyGuidance';

export function buildListeningTrainingLearningPolicy(args: {
  mode: ListeningTrainingMode;
  difficulty: ListeningTrainingPrescription['difficulty'];
  weakAreas: ReturnType<typeof assessListeningTrainingPolicy>['weakAreas'];
  precisionPressure: ReturnType<typeof assessListeningTrainingPolicy>['precisionPressure'];
}): LearningPolicy {
  const { mode, difficulty, weakAreas, precisionPressure } = args;
  const phraseDifficultyRange = phraseDifficultyRangeForDifficulty(difficulty);

  return {
    difficulty,
    phraseDifficultyRange,
    phrasePolicy: phrasePolicyForMode(mode),
    contentGuidance: buildContentGuidance(weakAreas, mode, precisionPressure),
  };
}
