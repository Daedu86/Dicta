import type { InputLanguageBenchmarkMetrics } from './types';
import { normalizeInputLanguageBenchmarkForRecommendation } from './AdaptiveInputLanguageBenchmarkService';

export type SelectedBenchmarkExportPayload = {
  selectedProfileKey: string;
  inputMode: InputLanguageBenchmarkMetrics['inputMode'];
  language: InputLanguageBenchmarkMetrics['language'];
  rollingWindowDays: number;
  sessionCount: number;
  sampleCount: number;
  benchmarkSessionCount: number;
  acceptedTelemetrySamples: number;
  countSemantics: string;
  lastUpdatedAt: string | null;
  sweetSpotScore: number;
  semanticFidelityScore: number;
  controlFidelityScore: number;
  learningEffectivenessScore: number;
  flowStabilityScore: number;
  averageAccuracy: number;
  averageWpm: number;
  averageLagSec: number;
  averageCorrectionRate: number;
  preferredPlaybackRate: number;
  preferredPhraseSize: InputLanguageBenchmarkMetrics['preferredPhraseSize'];
  preferredPauseAfterPhraseMs: number;
  semanticCutPenalty: number;
  unsafePauseCount: number;
  safePauseCount: number;
  deferredPauseCount: number;
  replayDeniedByBoundaryCount: number;
  averageSemanticCompleteness: number;
  averagePhraseDifficulty: number;
  recoveryScore: number;
  timeToRecoveryMs: number | null;
  errorBurstLength: number;
  modeSwitchFrequency: number;
  rateVariance: number;
  pauseVariance: number;
  inputExecutionFidelityScore: number;
  rateAccuracyBuckets: InputLanguageBenchmarkMetrics['rateAccuracyBuckets'];
  weakAreas: InputLanguageBenchmarkMetrics['weakAreas'];
  recommendation: InputLanguageBenchmarkMetrics['recommendation'];
  recentTimelinePoints: InputLanguageBenchmarkMetrics['timeline'];
  debug: {
    currentPhraseIndex: number | null;
    totalSemanticPhrases: number | null;
    currentPhraseId: string | null;
    currentPhraseTextPreview: string | null;
    currentPacingMode: string | null;
    lastDecisionReason: string | null;
    lastExecutionHint: string | null;
    lastBenchmarkUpdateReason: string | null;
  };
};

export function buildSelectedBenchmarkExportPayload(profile: InputLanguageBenchmarkMetrics): SelectedBenchmarkExportPayload {
  const normalizedProfile = normalizeInputLanguageBenchmarkForRecommendation(profile);
  const recentTimelinePoints = normalizedProfile.timeline.slice(-60);
  const latest = recentTimelinePoints[recentTimelinePoints.length - 1] ?? null;
  return {
    selectedProfileKey: `${normalizedProfile.inputMode}/${normalizedProfile.language}`,
    inputMode: normalizedProfile.inputMode,
    language: normalizedProfile.language,
    rollingWindowDays: normalizedProfile.rollingWindowDays,
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
    averageCorrectionRate: normalizedProfile.averageCorrectionRate,
    preferredPlaybackRate: normalizedProfile.preferredPlaybackRate,
    preferredPhraseSize: normalizedProfile.preferredPhraseSize,
    preferredPauseAfterPhraseMs: normalizedProfile.preferredPauseAfterPhraseMs,
    semanticCutPenalty: normalizedProfile.semanticCutPenalty,
    unsafePauseCount: normalizedProfile.unsafePauseCount,
    safePauseCount: normalizedProfile.safePauseCount,
    deferredPauseCount: normalizedProfile.deferredPauseCount,
    replayDeniedByBoundaryCount: normalizedProfile.replayDeniedByBoundaryCount,
    averageSemanticCompleteness: normalizedProfile.averageSemanticCompleteness,
    averagePhraseDifficulty: normalizedProfile.averagePhraseDifficulty,
    recoveryScore: normalizedProfile.recoveryScore,
    timeToRecoveryMs: normalizedProfile.timeToRecoveryMs,
    errorBurstLength: normalizedProfile.errorBurstLength,
    modeSwitchFrequency: normalizedProfile.modeSwitchFrequency,
    rateVariance: normalizedProfile.rateVariance,
    pauseVariance: normalizedProfile.pauseVariance,
    inputExecutionFidelityScore: normalizedProfile.inputExecutionFidelityScore,
    rateAccuracyBuckets: normalizedProfile.rateAccuracyBuckets,
    weakAreas: normalizedProfile.weakAreas,
    recommendation: normalizedProfile.recommendation,
    recentTimelinePoints,
    debug: {
      currentPhraseIndex: latest?.phraseIndex ?? null,
      totalSemanticPhrases: latest?.totalSemanticPhrases ?? null,
      currentPhraseId: latest?.phraseId ?? null,
      currentPhraseTextPreview: null,
      currentPacingMode: latest?.mode ?? null,
      lastDecisionReason: latest?.decisionReason ?? null,
      lastExecutionHint: latest?.executionHint ?? null,
      lastBenchmarkUpdateReason: latest?.event ?? null,
    },
  };
}

export function buildBenchmarkFilename(inputMode: string, language: string, now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `adaptive-benchmark-${inputMode}-${language}-${date}-${time}.json`;
}
