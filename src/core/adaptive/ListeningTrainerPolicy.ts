import type { DictationScriptDifficulty } from './dictationScriptValidation';
import type {
  AdaptiveSessionFeedback,
  AdaptiveWeakArea,
  InputLanguageBenchmarkMetrics,
  ListeningPrecisionMetrics,
  ListeningTrainingIntent,
  ListeningTrainingMode,
  ListeningTrainingPrescription,
  PhraseSize,
} from './types';

const RECOVERY_WEAK_AREAS = new Set<AdaptiveWeakArea>([
  'lag',
  'lag_instability',
  'low_accuracy',
  'accuracy_instability',
  'flow_instability',
  'support_dependency',
  'unsafe_boundary_pressure',
]);

const CHALLENGE_BLOCKING_WEAK_AREAS = new Set<AdaptiveWeakArea>([
  'low_accuracy',
  'accuracy_instability',
  'lag',
  'lag_instability',
  'flow_instability',
  'support_dependency',
  'unsafe_boundaries',
  'unsafe_boundary_pressure',
  'low_semantic_completeness',
  'replay',
]);

const BOUNDARY_SUPPORT_WEAK_AREAS = new Set<AdaptiveWeakArea>([
  'unsafe_boundaries',
  'unsafe_boundary_pressure',
  'low_semantic_completeness',
  'support_dependency',
  'replay',
]);

export function buildListeningTrainingPrescription(args: {
  profile: InputLanguageBenchmarkMetrics;
  latestFeedback?: AdaptiveSessionFeedback | null;
  userIntent?: ListeningTrainingIntent;
  durationMinutes?: 1 | 2 | 3 | 4;
  targetDifficulty?: DictationScriptDifficulty;
}): ListeningTrainingPrescription {
  const { profile, latestFeedback = null, targetDifficulty } = args;
  const userIntent = args.userIntent ?? 'auto';
  const profileKey = `${profile.inputMode}/${profile.language}`;
  const confidence = clamp01(profile.recommendation?.confidence ?? 0);
  const sampleCount = finiteOr(profile.sampleCount, 0);
  const averageAccuracy = finiteOr(profile.averageAccuracy, 0);
  const hasAccuracySignal = sampleCount > 0 && averageAccuracy > 0;
  const averageLagSec = Math.abs(finiteOr(profile.stableAverageLagSec || profile.averageLagSec, profile.averageLagSec));
  const p75LagSec = Math.abs(finiteOr(profile.p75LagSec, 0));
  const p90AbsLagSec = Math.abs(finiteOr(profile.p90AbsLagSec, averageLagSec));
  const flowStabilityScore = clamp01(profile.flowStabilityScore);
  const learningEffectivenessScore = clamp01(profile.learningEffectivenessScore);
  const weakAreas = new Set(profile.weakAreas);
  const hasRecoveryWeakArea = hasAny(weakAreas, RECOVERY_WEAK_AREAS);
  const hasChallengeBlocker = hasAny(weakAreas, CHALLENGE_BLOCKING_WEAK_AREAS);
  const hasBoundarySupportInstability = hasAny(weakAreas, BOUNDARY_SUPPORT_WEAK_AREAS);
  const feedbackPressure = assessFeedbackPressure(latestFeedback);
  const precisionPressure = assessListeningPrecisionPressure(profile, latestFeedback);

  const lowConfidence = confidence < 0.45 || sampleCount < 8;
  const lowAccuracy = hasAccuracySignal && averageAccuracy < 0.8;
  const veryLowAccuracy = hasAccuracySignal && averageAccuracy < 0.76;
  const highLag = averageLagSec > 2.4 || p75LagSec > 2.6 || p90AbsLagSec > 3.2;
  const poorFlow = flowStabilityScore < 0.55;
  const strongBoundaryInstability = hasBoundarySupportInstability && (confidence < 0.65 || flowStabilityScore < 0.7);

  const recoveryRecommended =
    lowConfidence ||
    lowAccuracy ||
    highLag ||
    poorFlow ||
    strongBoundaryInstability ||
    feedbackPressure.isRecoveryPressure ||
    precisionPressure.isRecoveryPressure ||
    (hasRecoveryWeakArea && confidence < 0.55);

  const stableEnough =
    confidence >= 0.55 &&
    sampleCount >= 8 &&
    (!hasAccuracySignal || averageAccuracy >= 0.8) &&
    averageLagSec <= 2.2 &&
    p90AbsLagSec <= 3 &&
    flowStabilityScore >= 0.6 &&
    !strongBoundaryInstability &&
    !feedbackPressure.isRecoveryPressure &&
    !precisionPressure.isRecoveryPressure &&
    !precisionPressure.isStabilizationPressure;

  const challengeSafe =
    confidence >= 0.68 &&
    sampleCount >= 20 &&
    (!hasAccuracySignal || averageAccuracy >= 0.84) &&
    averageLagSec <= 1.6 &&
    p90AbsLagSec <= 2.3 &&
    flowStabilityScore >= 0.72 &&
    learningEffectivenessScore >= 0.35 &&
    !hasChallengeBlocker &&
    !feedbackPressure.isAnyPressure &&
    !precisionPressure.isAnyPressure;

  const mode = resolveTrainingMode({
    userIntent,
    recoveryRecommended,
    stableEnough,
    challengeSafe,
    severeRecovery: veryLowAccuracy || highLag || poorFlow || feedbackPressure.isRecoveryPressure || precisionPressure.isRecoveryPressure,
  });
  const difficulty = resolveDifficulty({ mode, targetDifficulty, challengeSafe, recoveryRecommended });
  const baseRateRange = sanitizeRateRange(profile.recommendation?.targetRateRange, profile.preferredPlaybackRate);
  const basePauseMs = finitePositiveOr(profile.recommendation?.targetPauseMs, profile.preferredPauseAfterPhraseMs || 700);
  const basePhraseSize = profile.recommendation?.targetPhraseSize ?? profile.preferredPhraseSize ?? 'medium';
  const targetRateRange = adjustRateRangeForPrecision(adjustRateRangeForMode(baseRateRange, mode), precisionPressure);
  const targetPauseMs = adjustPauseForPrecision(adjustPauseForMode(basePauseMs, mode), precisionPressure);
  const targetPhraseSize = adjustPhraseSizeForPrecision(
    adjustPhraseSizeForMode(basePhraseSize, mode, hasBoundarySupportInstability),
    precisionPressure,
  );
  const phraseDifficultyRange = phraseDifficultyRangeForDifficulty(difficulty);
  const boundaryPolicy = mode === 'recover' || hasBoundarySupportInstability || precisionPressure.requiresStrictBoundary
    ? 'strict_semantic'
    : 'normal_semantic';

  return {
    goal: 'listening_comprehension',
    profileKey,
    inputMode: profile.inputMode,
    language: profile.language,
    mode,
    userIntent,
    difficulty,
    durationMinutes: args.durationMinutes ?? defaultDurationForMode(mode),
    targetAccuracyBand: targetAccuracyBandForMode(mode),
    targetLagMaxSec: targetLagMaxSecForMode(mode),
    targetRateRange,
    targetPauseMs,
    targetPhraseSize,
    phraseDifficultyRange,
    phrasePolicy: phrasePolicyForMode(mode),
    boundaryPolicy,
    contentGuidance: buildContentGuidance(weakAreas, mode, precisionPressure),
    pacingGuidance: buildPacingGuidance({
      mode,
      targetRateRange,
      targetPauseMs,
      targetPhraseSize,
      phraseDifficultyRange,
      boundaryPolicy,
      precisionPressure,
    }),
    rationale: buildRationale({
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
    }),
  };
}

function resolveTrainingMode({
  userIntent,
  recoveryRecommended,
  stableEnough,
  challengeSafe,
  severeRecovery,
}: {
  userIntent: ListeningTrainingIntent;
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

function resolveDifficulty({
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

function sanitizeRateRange(range: [number, number] | undefined, fallbackRate: number): [number, number] {
  const fallback = finitePositiveOr(fallbackRate, 1);
  const low = finitePositiveOr(range?.[0], Math.max(0.65, fallback - 0.05));
  const high = finitePositiveOr(range?.[1], Math.min(1.2, fallback + 0.05));
  const sortedLow = Math.min(low, high);
  const sortedHigh = Math.max(low, high);
  return [round2(clamp(sortedLow, 0.65, 1.25)), round2(clamp(sortedHigh, 0.65, 1.25))];
}

function adjustRateRangeForMode(base: [number, number], mode: ListeningTrainingMode): [number, number] {
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

function adjustRateRangeForPrecision(base: [number, number], precisionPressure: ListeningPrecisionPressure): [number, number] {
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

function adjustPauseForMode(basePauseMs: number, mode: ListeningTrainingMode): number {
  if (mode === 'recover') return Math.round(clamp(Math.max(basePauseMs + 200, 900), 400, 2000));
  if (mode === 'stabilize') return Math.round(clamp(Math.max(basePauseMs, 700), 400, 1800));
  if (mode === 'challenge') return Math.round(clamp(basePauseMs - 100, 350, 1400));
  return Math.round(clamp(basePauseMs, 400, 1600));
}

function adjustPauseForPrecision(basePauseMs: number, precisionPressure: ListeningPrecisionPressure): number {
  if (precisionPressure.isRecoveryPressure) return Math.round(clamp(Math.max(basePauseMs + 200, 1000), 400, 2200));
  if (precisionPressure.isStabilizationPressure) return Math.round(clamp(Math.max(basePauseMs + 100, 800), 400, 1900));
  if (precisionPressure.isAnyPressure) return Math.round(clamp(Math.max(basePauseMs, 700), 400, 1800));
  return basePauseMs;
}

function adjustPhraseSizeForMode(
  basePhraseSize: PhraseSize,
  mode: ListeningTrainingMode,
  hasBoundarySupportInstability: boolean,
): PhraseSize {
  if (mode === 'recover' || hasBoundarySupportInstability) return 'short';
  if (mode === 'stabilize' && basePhraseSize === 'long') return 'medium';
  if (mode === 'challenge' && basePhraseSize === 'short') return 'medium';
  return basePhraseSize;
}

function adjustPhraseSizeForPrecision(basePhraseSize: PhraseSize, precisionPressure: ListeningPrecisionPressure): PhraseSize {
  if (precisionPressure.isRecoveryPressure) return 'short';
  if (precisionPressure.isStabilizationPressure && basePhraseSize === 'long') return 'medium';
  return basePhraseSize;
}

function targetAccuracyBandForMode(mode: ListeningTrainingMode): [number, number] {
  if (mode === 'recover') return [0.78, 0.85];
  if (mode === 'challenge') return [0.82, 0.88];
  return [0.8, 0.88];
}

function targetLagMaxSecForMode(mode: ListeningTrainingMode): number {
  if (mode === 'recover') return 2.5;
  if (mode === 'stabilize') return 2;
  if (mode === 'challenge') return 1.5;
  return 1.8;
}

function phraseDifficultyRangeForDifficulty(difficulty: DictationScriptDifficulty): [number, number] {
  if (difficulty === 'easy') return [0.25, 0.45];
  if (difficulty === 'hard') return [0.65, 0.82];
  return [0.45, 0.65];
}

function phrasePolicyForMode(mode: ListeningTrainingMode): ListeningTrainingPrescription['phrasePolicy'] {
  if (mode === 'recover') return 'short_safe_semantic';
  if (mode === 'stabilize') return 'stable_semantic';
  if (mode === 'challenge') return 'challenge_semantic';
  return 'moderate_semantic';
}

function defaultDurationForMode(mode: ListeningTrainingMode): 1 | 2 | 3 | 4 {
  if (mode === 'recover') return 1;
  if (mode === 'challenge') return 3;
  return 2;
}

function buildContentGuidance(
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

function buildPacingGuidance({
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

function buildRationale({
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

type FeedbackPressure = {
  isAnyPressure: boolean;
  isRecoveryPressure: boolean;
  reasons: string[];
};

function assessFeedbackPressure(feedback: AdaptiveSessionFeedback | null): FeedbackPressure {
  if (!feedback) return { isAnyPressure: false, isRecoveryPressure: false, reasons: [] };
  const reasons: string[] = [];
  const issues = feedback.playbackIssues;
  if (feedback.verdict === 'regressed') reasons.push('latest session regressed');
  if (issues.repeatedPhraseCount >= 3 || issues.maxRepeatCountForSinglePhrase >= 3) reasons.push('repeat pressure');
  if (issues.skippedPhraseCount > 0) reasons.push('skipped phrases');
  if (issues.outOfOrderAdvanceCount > 0 || issues.replayAdvancedPhraseCount > 0 || issues.phraseIndexJumpCount > 0) {
    reasons.push('phrase order instability');
  }
  if (feedback.phraseStats.totalPhrases > 0) {
    const completionRatio = feedback.phraseStats.completedPhrases / feedback.phraseStats.totalPhrases;
    if (completionRatio < 0.75) reasons.push('low phrase completion');
  }
  const isRecoveryPressure = reasons.some((reason) =>
    reason === 'latest session regressed' ||
    reason === 'phrase order instability' ||
    reason === 'low phrase completion'
  );
  return {
    isAnyPressure: reasons.length > 0,
    isRecoveryPressure,
    reasons,
  };
}

type ListeningPrecisionPressure = {
  isAnyPressure: boolean;
  isRecoveryPressure: boolean;
  isStabilizationPressure: boolean;
  requiresStrictBoundary: boolean;
  score: number;
  reasons: string[];
};

function assessListeningPrecisionPressure(
  profile: InputLanguageBenchmarkMetrics,
  latestFeedback: AdaptiveSessionFeedback | null,
): ListeningPrecisionPressure {
  const metrics = latestFeedback?.listeningPrecisionSummary ?? profile.listeningPrecisionAverages;
  if (!metrics) {
    return {
      isAnyPressure: false,
      isRecoveryPressure: false,
      isStabilizationPressure: false,
      requiresStrictBoundary: false,
      score: 1,
      reasons: [],
    };
  }

  const score = computeListeningPrecisionPolicyScore(metrics);
  const reasons: string[] = [];
  const recoveryReasons: string[] = [];
  const stabilizationReasons: string[] = [];

  if (score < 0.78) recoveryReasons.push(`low listening precision score ${score.toFixed(2)}`);
  if (metrics.contentWordRecall < 0.75) recoveryReasons.push(`content word recall ${metrics.contentWordRecall.toFixed(2)}`);
  if (metrics.omissionRate > 0.18) recoveryReasons.push(`omission rate ${metrics.omissionRate.toFixed(2)}`);
  if (metrics.completionWindowScore < 0.65) recoveryReasons.push(`completion window score ${metrics.completionWindowScore.toFixed(2)}`);

  if (score < 0.86) stabilizationReasons.push(`listening precision score ${score.toFixed(2)}`);
  if (metrics.detailPrecisionScore < 0.78) stabilizationReasons.push(`detail precision ${metrics.detailPrecisionScore.toFixed(2)}`);
  if (metrics.functionWordAccuracy < 0.78) stabilizationReasons.push(`function-word accuracy ${metrics.functionWordAccuracy.toFixed(2)}`);
  if (metrics.wordOrderAccuracy < 0.8) stabilizationReasons.push(`word order ${metrics.wordOrderAccuracy.toFixed(2)}`);
  if (metrics.completionWindowScore < 0.8) stabilizationReasons.push(`completion window score ${metrics.completionWindowScore.toFixed(2)}`);

  if (score < 0.92) reasons.push(`emerging listening precision score ${score.toFixed(2)}`);
  if (metrics.omissionRate > 0.08) reasons.push(`emerging omission rate ${metrics.omissionRate.toFixed(2)}`);
  if (metrics.completionWindowScore < 0.9) reasons.push(`emerging completion window score ${metrics.completionWindowScore.toFixed(2)}`);

  const mergedReasons = [...new Set([...recoveryReasons, ...stabilizationReasons, ...reasons])];
  const isRecoveryPressure = recoveryReasons.length > 0;
  const isStabilizationPressure = isRecoveryPressure || stabilizationReasons.length > 0;

  return {
    isAnyPressure: mergedReasons.length > 0,
    isRecoveryPressure,
    isStabilizationPressure,
    requiresStrictBoundary: metrics.wordOrderAccuracy < 0.8 || metrics.completionWindowScore < 0.8,
    score,
    reasons: mergedReasons,
  };
}

function computeListeningPrecisionPolicyScore(metrics: ListeningPrecisionMetrics): number {
  return clamp01(
    metrics.listeningRecallScore * 0.28 +
    metrics.contentWordRecall * 0.23 +
    metrics.detailPrecisionScore * 0.14 +
    metrics.functionWordAccuracy * 0.14 +
    metrics.wordOrderAccuracy * 0.09 +
    metrics.completionWindowScore * 0.12,
  );
}

function hasAny(values: Set<AdaptiveWeakArea>, targets: Set<AdaptiveWeakArea>): boolean {
  for (const value of values) {
    if (targets.has(value)) return true;
  }
  return false;
}

function finiteOr(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function finitePositiveOr(value: number | null | undefined, fallback: number): number {
  const next = finiteOr(value, fallback);
  return next > 0 ? next : fallback;
}

function clamp01(value: number): number {
  return clamp(finiteOr(value, 0), 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}
