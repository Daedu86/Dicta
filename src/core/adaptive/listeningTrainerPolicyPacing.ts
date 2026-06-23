import type { DictationScriptDifficulty } from './dictationScriptValidation';
import type {
  ListeningTrainingMode,
  ListeningTrainingPrescription,
  PhraseSize,
} from './types';
import {
  PRODUCT_MAX_PLAYBACK_RATE,
  PRODUCT_MIN_PLAYBACK_RATE,
} from './adaptiveDictationControllerMath';
import type { ListeningPrecisionPressure } from './listeningTrainerPolicySignals';
import { clamp, finitePositiveOr, round2 } from './listeningTrainerPolicySignals';

const MIN_TRAINING_PAUSE_MS = 500;
const MAX_TRAINING_PAUSE_MS = 4000;

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
  const low = finitePositiveOr(range?.[0], Math.max(PRODUCT_MIN_PLAYBACK_RATE, fallback - 0.05));
  const high = finitePositiveOr(range?.[1], Math.min(PRODUCT_MAX_PLAYBACK_RATE, fallback + 0.05));
  const sortedLow = Math.min(low, high);
  const sortedHigh = Math.max(low, high);
  return [
    round2(clamp(sortedLow, PRODUCT_MIN_PLAYBACK_RATE, PRODUCT_MAX_PLAYBACK_RATE)),
    round2(clamp(sortedHigh, PRODUCT_MIN_PLAYBACK_RATE, PRODUCT_MAX_PLAYBACK_RATE)),
  ];
}

export function adjustRateRangeForMode(base: [number, number], mode: ListeningTrainingMode): [number, number] {
  const [low, high] = base;
  if (mode === 'recover') {
    const targetHigh = Math.min(high, 1.1);
    return [
      round2(clamp(Math.min(low, targetHigh), PRODUCT_MIN_PLAYBACK_RATE, PRODUCT_MAX_PLAYBACK_RATE)),
      round2(clamp(targetHigh, PRODUCT_MIN_PLAYBACK_RATE, PRODUCT_MAX_PLAYBACK_RATE)),
    ];
  }
  if (mode === 'stabilize') {
    return [
      round2(clamp(low, PRODUCT_MIN_PLAYBACK_RATE, PRODUCT_MAX_PLAYBACK_RATE)),
      round2(clamp(Math.min(high, 1.25), PRODUCT_MIN_PLAYBACK_RATE, PRODUCT_MAX_PLAYBACK_RATE)),
    ];
  }
  if (mode === 'challenge') {
    return [
      round2(clamp(low, PRODUCT_MIN_PLAYBACK_RATE, PRODUCT_MAX_PLAYBACK_RATE)),
      round2(clamp(Math.min(Math.max(high, low + 0.05), 1.6), PRODUCT_MIN_PLAYBACK_RATE, PRODUCT_MAX_PLAYBACK_RATE)),
    ];
  }
  return base;
}

export function adjustRateRangeForPrecision(base: [number, number], precisionPressure: ListeningPrecisionPressure): [number, number] {
  const [low, high] = base;
  if (precisionPressure.isRecoveryPressure) {
    const cappedHigh = Math.min(high, 1.05);
    return [
      round2(clamp(Math.min(low, cappedHigh), PRODUCT_MIN_PLAYBACK_RATE, PRODUCT_MAX_PLAYBACK_RATE)),
      round2(clamp(cappedHigh, PRODUCT_MIN_PLAYBACK_RATE, PRODUCT_MAX_PLAYBACK_RATE)),
    ];
  }
  if (precisionPressure.isStabilizationPressure) {
    return [
      round2(clamp(low, PRODUCT_MIN_PLAYBACK_RATE, PRODUCT_MAX_PLAYBACK_RATE)),
      round2(clamp(Math.min(high, 1.15), PRODUCT_MIN_PLAYBACK_RATE, PRODUCT_MAX_PLAYBACK_RATE)),
    ];
  }
  if (precisionPressure.isAnyPressure) {
    return [
      round2(clamp(low, PRODUCT_MIN_PLAYBACK_RATE, PRODUCT_MAX_PLAYBACK_RATE)),
      round2(clamp(Math.min(high, 1.25), PRODUCT_MIN_PLAYBACK_RATE, PRODUCT_MAX_PLAYBACK_RATE)),
    ];
  }
  return base;
}

export function adjustPauseForMode(basePauseMs: number, mode: ListeningTrainingMode): number {
  if (mode === 'recover') return Math.round(clamp(Math.max(basePauseMs + 400, 1200), MIN_TRAINING_PAUSE_MS, MAX_TRAINING_PAUSE_MS));
  if (mode === 'stabilize') return Math.round(clamp(Math.max(basePauseMs, 900), MIN_TRAINING_PAUSE_MS, MAX_TRAINING_PAUSE_MS));
  if (mode === 'challenge') return Math.round(clamp(basePauseMs - 100, MIN_TRAINING_PAUSE_MS, 3000));
  return Math.round(clamp(basePauseMs, MIN_TRAINING_PAUSE_MS, MAX_TRAINING_PAUSE_MS));
}

export function adjustPauseForPrecision(basePauseMs: number, precisionPressure: ListeningPrecisionPressure): number {
  if (precisionPressure.isRecoveryPressure) return Math.round(clamp(Math.max(basePauseMs + 300, 1200), MIN_TRAINING_PAUSE_MS, MAX_TRAINING_PAUSE_MS));
  if (precisionPressure.isStabilizationPressure) return Math.round(clamp(Math.max(basePauseMs + 150, 900), MIN_TRAINING_PAUSE_MS, MAX_TRAINING_PAUSE_MS));
  if (precisionPressure.isAnyPressure) return Math.round(clamp(Math.max(basePauseMs, 800), MIN_TRAINING_PAUSE_MS, MAX_TRAINING_PAUSE_MS));
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

export function defaultDurationForMode(mode: ListeningTrainingMode): 1 | 2 | 3 | 4 | 5 {
  if (mode === 'recover') return 1;
  if (mode === 'challenge') return 3;
  return 2;
}
