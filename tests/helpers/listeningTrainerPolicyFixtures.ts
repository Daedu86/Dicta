import { createEmptyInputLanguageBenchmark } from '../../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type { InputLanguageBenchmarkMetrics } from '../../src/core/adaptive/types';

export function stableListeningProfile(
  inputMode: InputLanguageBenchmarkMetrics['inputMode'],
  language: string,
): InputLanguageBenchmarkMetrics {
  const profile = createEmptyInputLanguageBenchmark(inputMode, language);
  profile.sessionCount = 12;
  profile.sampleCount = 48;
  profile.averageAccuracy = 0.86;
  profile.averageLagSec = 0.8;
  profile.stableAverageLagSec = 0.8;
  profile.p75LagSec = 0.9;
  profile.p90AbsLagSec = 1.4;
  profile.averageWpm = 52;
  profile.flowStabilityScore = 0.84;
  profile.learningEffectivenessScore = 0.62;
  profile.sweetSpotScore = 0.78;
  profile.preferredPlaybackRate = 1;
  profile.preferredPhraseSize = 'medium';
  profile.preferredPauseAfterPhraseMs = 650;
  profile.weakAreas = [];
  profile.recommendation = {
    targetRateRange: [0.95, 1.05],
    targetPhraseSize: 'medium',
    targetPauseMs: 650,
    nextTrainingFocus: ['Maintain stable semantic phrases'],
    confidence: 0.82,
    summary: 'Stable profile.',
  };
  return profile;
}

export function unstableBrowserTtsDeListeningProfile(): InputLanguageBenchmarkMetrics {
  const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
  profile.sessionCount = 3;
  profile.sampleCount = 10;
  profile.averageAccuracy = 0.72;
  profile.averageLagSec = 3.6;
  profile.stableAverageLagSec = 3.4;
  profile.p75LagSec = 3.8;
  profile.p90AbsLagSec = 4.6;
  profile.flowStabilityScore = 0.34;
  profile.learningEffectivenessScore = 0.2;
  profile.preferredPlaybackRate = 1.05;
  profile.preferredPhraseSize = 'medium';
  profile.preferredPauseAfterPhraseMs = 700;
  profile.weakAreas = ['lag', 'low_accuracy', 'unsafe_boundary_pressure', 'support_dependency', 'flow_instability'];
  profile.recommendation = {
    targetRateRange: [1.05, 1.1],
    targetPhraseSize: 'medium',
    targetPauseMs: 700,
    nextTrainingFocus: ['Recover DE browser TTS flow'],
    confidence: 0.22,
    summary: 'Unstable German Browser TTS profile.',
  };
  return profile;
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}
