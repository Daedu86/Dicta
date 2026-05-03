import type { InputLanguageBenchmarkMetrics } from './types';

export type SelectedBenchmarkExportPayload = {
  selectedProfileKey: string;
  inputMode: InputLanguageBenchmarkMetrics['inputMode'];
  language: InputLanguageBenchmarkMetrics['language'];
  rollingWindowDays: number;
  sessionCount: number;
  sampleCount: number;
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
  const recentTimelinePoints = profile.timeline.slice(-60);
  const latest = recentTimelinePoints[recentTimelinePoints.length - 1] ?? null;
  return {
    selectedProfileKey: `${profile.inputMode}/${profile.language}`,
    inputMode: profile.inputMode,
    language: profile.language,
    rollingWindowDays: profile.rollingWindowDays,
    sessionCount: profile.sessionCount,
    sampleCount: profile.sampleCount,
    lastUpdatedAt: profile.lastUpdatedAt,
    sweetSpotScore: profile.sweetSpotScore,
    semanticFidelityScore: profile.semanticFidelityScore,
    controlFidelityScore: profile.controlFidelityScore,
    learningEffectivenessScore: profile.learningEffectivenessScore,
    flowStabilityScore: profile.flowStabilityScore,
    averageAccuracy: profile.averageAccuracy,
    averageWpm: profile.averageWpm,
    averageLagSec: profile.averageLagSec,
    averageCorrectionRate: profile.averageCorrectionRate,
    preferredPlaybackRate: profile.preferredPlaybackRate,
    preferredPhraseSize: profile.preferredPhraseSize,
    preferredPauseAfterPhraseMs: profile.preferredPauseAfterPhraseMs,
    semanticCutPenalty: profile.semanticCutPenalty,
    unsafePauseCount: profile.unsafePauseCount,
    safePauseCount: profile.safePauseCount,
    deferredPauseCount: profile.deferredPauseCount,
    replayDeniedByBoundaryCount: profile.replayDeniedByBoundaryCount,
    averageSemanticCompleteness: profile.averageSemanticCompleteness,
    averagePhraseDifficulty: profile.averagePhraseDifficulty,
    recoveryScore: profile.recoveryScore,
    timeToRecoveryMs: profile.timeToRecoveryMs,
    errorBurstLength: profile.errorBurstLength,
    modeSwitchFrequency: profile.modeSwitchFrequency,
    rateVariance: profile.rateVariance,
    pauseVariance: profile.pauseVariance,
    inputExecutionFidelityScore: profile.inputExecutionFidelityScore,
    rateAccuracyBuckets: profile.rateAccuracyBuckets,
    weakAreas: profile.weakAreas,
    recommendation: profile.recommendation,
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
