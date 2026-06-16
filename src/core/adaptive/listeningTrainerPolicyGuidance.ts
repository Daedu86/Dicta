import type { DictationScriptDifficulty } from './dictationScriptValidation';
import type {
  AdaptiveWeakArea,
  ListeningTrainingIntent,
  ListeningTrainingMode,
  ListeningTrainingPrescription,
  PhraseSize,
} from './types';
import type { FeedbackPressure, ListeningPrecisionPressure } from './listeningTrainerPolicySignals';

export function buildContentGuidance(
  weakAreas: Set<AdaptiveWeakArea>,
  mode: ListeningTrainingMode,
  precisionPressure: ListeningPrecisionPressure,
): string[] {
  const guidance = [
    'Train listening comprehension with natural, meaningful content rather than typing speed drills.',
    'Use self-contained semantic phrases that can be practiced independently when possible.',
  ];
  if (weakAreas.has('low_accuracy') || weakAreas.has('accuracy_instability')) {
    guidance.push('Use familiar contexts and clear lexical contrasts so the learner can recover comprehension without guessing.');
  }
  if (weakAreas.has('lag') || weakAreas.has('lag_instability')) {
    guidance.push('Prefer phrases with clear starts and predictable clause rhythm to reduce accumulated listening lag.');
  }
  if (weakAreas.has('unsafe_boundaries') || weakAreas.has('unsafe_boundary_pressure') || weakAreas.has('low_semantic_completeness')) {
    guidance.push('Favor complete clauses and sentence-level semantic boundaries; avoid fragments that rely on hidden context.');
  }
  if (weakAreas.has('support_dependency') || weakAreas.has('replay')) {
    guidance.push('Keep phrases replay-safe and avoid pronoun-heavy continuations that depend on previous phrases.');
  }
  if (weakAreas.has('flow_instability')) {
    guidance.push('Keep topic transitions smooth and avoid abrupt jumps in grammar or vocabulary load.');
  }
  if (precisionPressure.reasons.some((reason) => reason.includes('content word'))) {
    guidance.push('Prioritize clear content-word anchors before adding denser vocabulary.');
  }
  if (precisionPressure.reasons.some((reason) => reason.includes('detail') || reason.includes('function-word') || reason.includes('word order'))) {
    guidance.push('Use short contrastive phrases that make details, function words, and word order audible.');
  }
  if (precisionPressure.reasons.some((reason) => reason.includes('completion window'))) {
    guidance.push('Keep phrase length and syntax inside a window the learner can complete before playback ends.');
  }
  if (mode === 'challenge') {
    guidance.push('Use richer vocabulary and syntax only inside clear, semantically complete phrases.');
  }
  return guidance.slice(0, 7);
}

export function buildPacingGuidance({
  mode,
  targetRateRange,
  targetPauseMs,
  targetPhraseSize,
  phraseDifficultyRange,
  boundaryPolicy,
  precisionPressure,
}: {
  mode: ListeningTrainingMode;
  targetRateRange: [number, number];
  targetPauseMs: number;
  targetPhraseSize: PhraseSize;
  phraseDifficultyRange: [number, number];
  boundaryPolicy: ListeningTrainingPrescription['boundaryPolicy'];
  precisionPressure: ListeningPrecisionPressure;
}): string[] {
  const guidance = [
    `Use the benchmark-derived rate range ${targetRateRange[0].toFixed(2)}x-${targetRateRange[1].toFixed(2)}x as script metadata; Dicta runtime controls actual playback.`,
    `Use about ${targetPauseMs}ms pause metadata and ${targetPhraseSize} phrases unless semantic completeness requires a safer split.`,
    `Keep phrase difficulty values within ${phraseDifficultyRange[0].toFixed(2)}-${phraseDifficultyRange[1].toFixed(2)} for ${mode} mode.`,
    boundaryPolicy === 'strict_semantic'
      ? 'Use strict semantic boundaries with no unsafe mid-grammar cuts.'
      : 'Use normal semantic boundaries and keep phrases replayable when possible.',
  ];
  if (precisionPressure.isAnyPressure) {
    guidance.push(`Precision pressure is active; avoid increasing speed until ${precisionPressure.reasons.join(', ')} improves.`);
  }
  return guidance;
}

export function buildRationale({
  profileKey,
  userIntent,
  mode,
  targetDifficulty,
  difficulty,
  confidence,
  averageAccuracy,
  hasAccuracySignal,
  averageLagSec,
  flowStabilityScore,
  weakAreas,
  feedbackPressure,
  precisionPressure,
  challengeSafe,
  recoveryRecommended,
}: {
  profileKey: string;
  userIntent: ListeningTrainingIntent;
  mode: ListeningTrainingMode;
  targetDifficulty?: DictationScriptDifficulty;
  difficulty: DictationScriptDifficulty;
  confidence: number;
  averageAccuracy: number;
  hasAccuracySignal: boolean;
  averageLagSec: number;
  flowStabilityScore: number;
  weakAreas: Set<AdaptiveWeakArea>;
  feedbackPressure: FeedbackPressure;
  precisionPressure: ListeningPrecisionPressure;
  challengeSafe: boolean;
  recoveryRecommended: boolean;
}): string[] {
  const rationale = [
    `Prescription is scoped only to ${profileKey}; no other input/language benchmark is consulted.`,
    `Benchmark recommendation is the pacing base; policy adjusts only when listening flow or boundary safety requires it.`,
    `Target accuracy stays in the listening training zone instead of chasing near-perfect typing accuracy.`,
    `Profile signals: confidence ${confidence.toFixed(2)}, accuracy ${hasAccuracySignal ? averageAccuracy.toFixed(2) : 'n/a'}, lag ${averageLagSec.toFixed(2)}s, flow ${flowStabilityScore.toFixed(2)}.`,
  ];
  if (precisionPressure.isAnyPressure) {
    rationale.push(`Listening precision pressure: score ${precisionPressure.score.toFixed(2)}; ${precisionPressure.reasons.join(', ')}.`);
  }
  if (weakAreas.size > 0) {
    rationale.push(`Weak areas considered: ${Array.from(weakAreas).join(', ')}.`);
  }
  if (targetDifficulty && targetDifficulty !== difficulty) {
    rationale.push(`Requested ${targetDifficulty} difficulty was adjusted to ${difficulty} because the trainer policy treats button choice as intent, not an absolute command.`);
  }
  if (userIntent === 'challenge' && !challengeSafe) {
    rationale.push('Challenge intent was gated because benchmark confidence, lag, flow, accuracy, boundary safety, listening precision, or feedback was not stable enough.');
  }
  if (recoveryRecommended && mode === 'recover') {
    rationale.push('Recovery mode was selected to rebuild listening flow before increasing difficulty.');
  }
  if (feedbackPressure.isAnyPressure) {
    rationale.push(`Latest feedback added pressure: ${feedbackPressure.reasons.join(', ')}.`);
  }
  return rationale;
}
