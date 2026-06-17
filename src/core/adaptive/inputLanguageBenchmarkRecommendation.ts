import type {
  AdaptiveWeakArea,
  InputLanguageBenchmarkMetrics,
  InputLanguageBenchmarkRecommendation,
} from './types';
import { applyBrowserTtsDeTimelinePressureFallback } from './browserTtsDeBenchmarkPolicy';
import { clamp01 } from './inputLanguageBenchmarkMath';
import {
  calibrateTargetRateRangeForProfile,
  pickBestRateRange,
} from './inputLanguageBenchmarkRateRange';
import {
  clampPhraseSizeAtMost,
  movePhraseSizeBySteps,
} from './inputLanguageBenchmarkPhraseSize';
import {
  deriveWeakAreas,
  hasSensitiveBenchmarkWeakAreas,
} from './inputLanguageBenchmarkWeakAreas';

export { pickBestRateRange } from './inputLanguageBenchmarkRateRange';
export { deriveWeakAreas } from './inputLanguageBenchmarkWeakAreas';

export function normalizeInputLanguageBenchmarkForRecommendation(
  metrics: InputLanguageBenchmarkMetrics,
): InputLanguageBenchmarkMetrics {
  return applyBrowserTtsDeTimelinePressureFallback(metrics);
}

export function computeBenchmarkRecommendation(metrics: InputLanguageBenchmarkMetrics): InputLanguageBenchmarkRecommendation {
  const targetRateRange = calibrateTargetRateRangeForProfile(metrics, pickBestRateRange(metrics.rateAccuracyBuckets));
  const weakAreas = deriveWeakAreas(metrics);
  const targetPhraseSize = metrics.averagePhraseDifficulty > 0.65 || metrics.averageSemanticCompleteness < 0.7 ? 'short' : metrics.preferredPhraseSize;
  const focus = weakAreas.length > 0 ? weakAreas.slice(0, 3).map(formatWeakArea) : [`Maintain stable pace and ${targetPhraseSize}-length semantic phrases`];
  const confidence = clamp01(Math.min(1, metrics.sampleCount / 40) * metrics.sweetSpotScore);
  const inputLabel = metrics.inputMode;
  const languageLabel = String(metrics.language).toUpperCase();
  return {
    targetRateRange,
    targetPhraseSize,
    targetPauseMs: Math.round(Math.max(1200, metrics.preferredPauseAfterPhraseMs || 1200)),
    nextTrainingFocus: focus,
    confidence,
    summary:
      metrics.sampleCount === 0
        ? `No benchmark samples yet for ${inputLabel} ${languageLabel}.`
        : `For ${inputLabel} ${languageLabel}, the current target is ${targetRateRange[0].toFixed(2)}x-${targetRateRange[1].toFixed(2)}x with focus on ${focus.join(', ')}.`,
  };
}

export function applyRecommendationHysteresis(
  metrics: InputLanguageBenchmarkMetrics,
  recommendation: InputLanguageBenchmarkRecommendation,
): InputLanguageBenchmarkRecommendation {
  const confidence = recommendation.confidence;
  const targetRateRange = [...recommendation.targetRateRange] as [number, number];
  let targetPhraseSize = recommendation.targetPhraseSize;
  let targetPauseMs = recommendation.targetPauseMs;
  const preferredPhraseSize = metrics.preferredPhraseSize ?? recommendation.targetPhraseSize;
  const sensitiveWeakAreas = hasSensitiveBenchmarkWeakAreas(metrics.weakAreas);
  const unstableBrowserTtsDe = metrics.inputMode === 'browser-tts' && metrics.language === 'de';
  if (confidence < 0.4) {
    targetRateRange[1] = Math.min(targetRateRange[1], metrics.preferredPlaybackRate, unstableBrowserTtsDe ? 0.95 : metrics.preferredPlaybackRate);
    targetPhraseSize = sensitiveWeakAreas ? 'short' : clampPhraseSizeAtMost(targetPhraseSize, preferredPhraseSize);
    targetPauseMs = Math.max(targetPauseMs, 900);
  } else if (confidence < 0.6) {
    targetRateRange[0] = Math.max(targetRateRange[0], metrics.preferredPlaybackRate - 0.04);
    targetRateRange[1] = Math.min(targetRateRange[1], metrics.preferredPlaybackRate + 0.04);
    targetPhraseSize = movePhraseSizeBySteps(preferredPhraseSize, targetPhraseSize, 1);
  }
  if (sensitiveWeakAreas) {
    targetPhraseSize = 'short';
    targetPauseMs = Math.max(targetPauseMs, 900);
  }
  if (targetRateRange[0] > targetRateRange[1]) {
    targetRateRange[0] = targetRateRange[1];
  }
  return { ...recommendation, targetRateRange, targetPhraseSize, targetPauseMs };
}

function formatWeakArea(value: AdaptiveWeakArea): string {
  return value.replace(/_/g, ' ');
}
