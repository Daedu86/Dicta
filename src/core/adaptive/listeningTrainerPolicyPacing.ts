import type { DictationScriptDifficulty } from './dictationScriptValidation';
import type {
  ListeningTrainingMode,
  ListeningTrainingPrescription,
  PhraseSize,
} from './types';
import type { ListeningPrecisionPressure } from './listeningTrainerPolicySignals';
import { clamp, finitePositiveOr, round2 } from './listeningTrainerPolicySignals';

export function resolveTrainingMode({
  userIntent,
  recoveryRecommended,
  stableEnough,
  challengeSafe,
  severeRecovery,
}: {
  userIntent: ListeningTrainingPrescription['userIntent'];
  recoveryRecommended: boolean;
  stableEnough: boolean;
  challengeSafe: boolean;
  severeRecovery: boolean;
}): ListeningTrainingMode {
  switch (userIntent) {
    case 'recover':
      return 'recover';
    case 'stabilize':
      return recoveryRecommended && severeRecovery ? 'recover' : 'stabilize';
    case 'progress':
      if (recoveryRecommended) return severeRecovery ? 'recover' : 'stabilize';
      return stableEnough ? 'progress' : 'stabilize';
    case 'challenge':
      if (challengeSafe) return 'challenge';
      if (recoveryRecommended) return severeRecovery ? 'recover' : 'stabilize';
      return stableEnough ? 'progress' : 'stabilize';
    case 'auto':
      if (recoveryRecommended) return 'recover';
      return stableEnough ? 'progress' : 'stabilize';
  }
}

export function resolveDifficulty({
  mode,
  targetDifficulty,
}: {
  mode: ListeningTrainingMode;
  targetDifficulty?: DictationScriptDifficulty;
  challengeSafe: boolean;
  recoveryRecommended: boolean;
}): DictationScriptDifficulty {
  if (mode === 'recover') return 'easy';
  if (mode === 'challenge') return 'hard';
  if (targetDifficulty === 'easy') return 'easy';
  if (mode === 'progress') return 'normal';
  if (mode === 'stabilize') return targetDifficulty === 'hard' ? 'normal' : (targetDifficulty ?? 'normal');
  return 'normal';
}

export function sanitizeRateRange(range: [number, number] | undefined, fallbackRate: number): [number, number] {
  const fallback = finitePositiveOr(fallbackRate, 1);
  const low = finitePositiveOr(range?.[0], Math.max(0.65, fallback - 0.05));
  const high = finitePositiveOr(range?.[1], Math.min(1.2, fallback + 0.05));
  const sortedLow = Math.min(low, high);
  const sortedHigh = Math.max(low, high);
  return [round2(clamp(sortedLow, 0.65, 1.25)), round2(clamp(sortedHigh, 0.65, 1.25))];
}

export function adjustRateRangeForMode(base: [number, number], mode: ListeningTrainingMode): [number, number] {
  const [low, high] = base;
  if (mode === 'recover') {
    const targetHigh = Math.min(high, 0.95);
    return [round2(clamp(Math.min(low, targetHigh) - 0.05, 0.65, 1.25)), round2(clamp(targetHigh, 0.65, 1.25))];
  }
  if (mode === 'stabilize') {
    return [round2(clamp(low, 0.65, 1.25)), round2(clamp(Math.min(high, 1.05), 0.65, 1.25))];
  }
  if (mode === 'challenge') {
    return [round2(clamp(low, 0.65, 1.25)), round2(clamp(Math.min(Math.max(high, low + 0.05), 1.15), 0.65, 1.25))];
  }
  return base;
}

export function adjustRateRangeForPrecision(base: [number, number], precisionPressure: ListeningPrecisionPressure): [number, number] {
  const [low, high] = base;
  if (precisionPressure.isRecoveryPressure) {
    const cappedHigh = Math.min(high, 0.95);
    return [round2(clamp(Math.min(low, cappedHigh), 0.65, 1.25)), round2(clamp(cappedHigh, 0.65, 1.25))];
  }
  if (precisionPressure.isStabilizationPressure) {
    return [round2(clamp(low, 0.65, 1.25)), round2(clamp(Math.min(high, 1), 0.65, 1.25))];
  }
  if (precisionPressure.isAnyPressure) {
    return [round2(clamp(low, 0.65, 1.25)), round2(clamp(Math.min(high, 1.05), 0.65, 1.25))];
  }
  return base;
}

export function adjustPauseForMode(basePauseMs: number, mode: ListeningTrainingMode): number {
  if (mode === 'recover') return Math.round(clamp(Math.max(basePauseMs + 200, 900), 400, 2000));
  if (mode === 'stabilize') return Math.round(clamp(Math.max(basePauseMs, 700), 400, 1800));
  if (mode === 'challenge') return Math.round(clamp(basePauseMs - 100, 350, 1400));
  return Math.round(clamp(basePauseMs, 400, 1600));
}

export function adjustPauseForPrecision(basePauseMs: number, precisionPressure: ListeningPrecisionPressure): number {
  if (precisionPressure.isRecoveryPressure) return Math.round(clamp(Math.max(basePauseMs + 200, 1000), 400, 2200));
  if (precisionPressure.isStabilizationPressure) return Math.round(clamp(Math.max(basePauseMs + 100, 800), 400, 1900));
  if (precisionPressure.isAnyPressure) return Math.round(clamp(Math.max(basePauseMs, 700), 400, 1800));
  return basePauseMs;
}

export function adjustPhraseSizeForMode(
  basePhraseSize: PhraseSize,
  mode: ListeningTrainingMode,
  hasBoundarySupportInstability: boolean,
): PhraseSize {
  if (mode === 'recover' || hasBoundarySupportInstability) return 'short';
  if (mode === 'stabilize' && basePhraseSize === 'long') return 'medium';
  if (mode === 'challenge' && basePhraseSize === 'short') return 'medium';
  return basePhraseSize;
}

export function adjustPhraseSizeForPrecision(basePhraseSize: PhraseSize, precisionPressure: ListeningPrecisionPressure): PhraseSize {
  if (precisionPressure.isRecoveryPressure) return 'short';
  if (precisionPressure.isStabilizationPressure && basePhraseSize === 'long') return 'medium';
  return basePhraseSize;
}

export function targetAccuracyBandForMode(mode: ListeningTrainingMode): [number, number] {
  if (mode === 'recover') return [0.78, 0.85];
  if (mode === 'challenge') return [0.82, 0.88];
  return [0.8, 0.88];
}

export function targetLagMaxSecForMode(mode: ListeningTrainingMode): number {
  if (mode === 'recover') return 2.5;
  if (mode === 'stabilize') return 2;
  if (mode === 'challenge') return 1.5;
  return 1.8;
}

export function phraseDifficultyRangeForDifficulty(difficulty: DictationScriptDifficulty): [number, number] {
  if (difficulty === 'easy') return [0.25, 0.45];
  if (difficulty === 'hard') return [0.65, 0.82];
  return [0.45, 0.65];
}

export function phrasePolicyForMode(mode: ListeningTrainingMode): ListeningTrainingPrescription['phrasePolicy'] {
  if (mode === 'recover') return 'short_safe_semantic';
  if (mode === 'stabilize') return 'stable_semantic';
  if (mode === 'challenge') return 'challenge_semantic';
  return 'moderate_semantic';
}

export function defaultDurationForMode(mode: ListeningTrainingMode): 1 | 2 | 3 | 4 {
  if (mode === 'recover') return 1;
  if (mode === 'challenge') return 3;
  return 2;
}
