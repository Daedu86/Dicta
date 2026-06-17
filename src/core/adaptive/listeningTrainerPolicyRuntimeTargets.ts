import type {
  InputLanguageBenchmarkMetrics,
  ListeningTrainingMode,
} from './types';
import type { RuntimePolicy } from './adaptivePolicyLayers';
import {
  adjustPauseForMode,
  adjustPauseForPrecision,
  adjustPhraseSizeForMode,
  adjustPhraseSizeForPrecision,
  adjustRateRangeForMode,
  adjustRateRangeForPrecision,
  sanitizeRateRange,
} from './listeningTrainerPolicyPacing';
import type { assessListeningTrainingPolicy } from './listeningTrainerPolicyAssessment';
import { finitePositiveOr } from './listeningTrainerPolicySignals';

export function buildListeningTrainingRuntimePolicy(args: {
  profile: InputLanguageBenchmarkMetrics;
  mode: ListeningTrainingMode;
  hasBoundarySupportInstability: boolean;
  precisionPressure: ReturnType<typeof assessListeningTrainingPolicy>['precisionPressure'];
}): RuntimePolicy {
  const { profile, mode, hasBoundarySupportInstability, precisionPressure } = args;
  const baseRateRange = sanitizeRateRange(profile.recommendation?.targetRateRange, profile.preferredPlaybackRate);
  const basePauseMs = finitePositiveOr(profile.recommendation?.targetPauseMs, profile.preferredPauseAfterPhraseMs || 700);
  const basePhraseSize = profile.recommendation?.targetPhraseSize ?? profile.preferredPhraseSize ?? 'medium';
  const targetRateRange = adjustRateRangeForPrecision(adjustRateRangeForMode(baseRateRange, mode), precisionPressure);
  const targetPauseMs = adjustPauseForPrecision(adjustPauseForMode(basePauseMs, mode), precisionPressure);
  const targetPhraseSize = adjustPhraseSizeForPrecision(
    adjustPhraseSizeForMode(basePhraseSize, mode, hasBoundarySupportInstability),
    precisionPressure,
  );
  const boundaryPolicy = mode === 'recover' || hasBoundarySupportInstability || precisionPressure.requiresStrictBoundary
    ? 'strict_semantic'
    : 'normal_semantic';

  return {
    targetRateRange,
    targetPauseMs,
    targetPhraseSize,
    boundaryPolicy,
  };
}
