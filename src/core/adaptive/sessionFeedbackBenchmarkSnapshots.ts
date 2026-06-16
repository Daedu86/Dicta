import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics } from './types';
import { normalizeInputLanguageBenchmarkForRecommendation } from './AdaptiveInputLanguageBenchmarkService';

export function normalizeFeedbackBenchmarkSnapshots(feedback: AdaptiveSessionFeedback): AdaptiveSessionFeedback {
  return {
    ...feedback,
    benchmarkBefore: addBenchmarkCountSemantics(feedback.benchmarkBefore),
    benchmarkAfter: addBenchmarkCountSemantics(feedback.benchmarkAfter),
  };
}

export function compactBenchmark(profile: InputLanguageBenchmarkMetrics): Partial<InputLanguageBenchmarkMetrics> & {
  benchmarkSessionCount: number;
  acceptedTelemetrySamples: number;
  countSemantics: string;
} {
  const normalizedProfile = normalizeInputLanguageBenchmarkForRecommendation(profile);
  return {
    inputMode: normalizedProfile.inputMode,
    language: normalizedProfile.language,
    sessionCount: normalizedProfile.sessionCount,
    sampleCount: normalizedProfile.sampleCount,
    benchmarkSessionCount: normalizedProfile.sessionCount,
    acceptedTelemetrySamples: normalizedProfile.sampleCount,
    countSemantics:
      'sessionCount/benchmarkSessionCount count unique sessions represented by accepted adaptive telemetry samples; sampleCount/acceptedTelemetrySamples count accepted timeline samples, not all saved sessions.',
    lastUpdatedAt: normalizedProfile.lastUpdatedAt,
    sweetSpotScore: normalizedProfile.sweetSpotScore,
    semanticFidelityScore: normalizedProfile.semanticFidelityScore,
    controlFidelityScore: normalizedProfile.controlFidelityScore,
    learningEffectivenessScore: normalizedProfile.learningEffectivenessScore,
    flowStabilityScore: normalizedProfile.flowStabilityScore,
    averageAccuracy: normalizedProfile.averageAccuracy,
    averageWpm: normalizedProfile.averageWpm,
    averageLagSec: normalizedProfile.averageLagSec,
    ...(normalizedProfile.inputMode === 'browser-tts' && normalizedProfile.ttsEnvironment
      ? { ttsEnvironment: normalizedProfile.ttsEnvironment }
      : {}),
    ...(normalizedProfile.inputMode === 'browser-tts' && normalizedProfile.ttsEnvironmentHistory
      ? { ttsEnvironmentHistory: normalizedProfile.ttsEnvironmentHistory }
      : {}),
    ...(normalizedProfile.inputMode === 'browser-tts' && normalizedProfile.environmentChanged
      ? { environmentChanged: true }
      : {}),
    weakAreas: normalizedProfile.weakAreas,
    recommendation: normalizedProfile.recommendation,
  };
}

function addBenchmarkCountSemantics<T extends Partial<InputLanguageBenchmarkMetrics> | undefined>(
  benchmark: T,
): T extends undefined
  ? undefined
  : Partial<InputLanguageBenchmarkMetrics> & {
      benchmarkSessionCount: number;
      acceptedTelemetrySamples: number;
      countSemantics: string;
    } {
  if (!benchmark) return undefined as never;
  return {
    ...benchmark,
    benchmarkSessionCount: benchmark.sessionCount ?? 0,
    acceptedTelemetrySamples: benchmark.sampleCount ?? 0,
    countSemantics:
      'sessionCount/benchmarkSessionCount count unique sessions represented by accepted adaptive telemetry samples; sampleCount/acceptedTelemetrySamples count accepted timeline samples, not all saved sessions.',
  } as never;
}
