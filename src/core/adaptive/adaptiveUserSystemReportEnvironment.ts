import type { BrowserTtsEnvironmentFingerprint, BrowserTtsEnvironmentHistoryEntry } from '../../types/dictation';
import {
  createEmptyInputLanguageBenchmark,
  normalizeInputLanguageBenchmarkForRecommendation,
} from './AdaptiveInputLanguageBenchmarkService';
import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics } from './types';
import type { AdaptiveReportSession } from './adaptiveUserSystemReportTypes';

export function buildTtsEnvironmentReport(
  profile: InputLanguageBenchmarkMetrics,
  feedback: AdaptiveSessionFeedback | null,
  latestSession: AdaptiveReportSession | null,
): {
  ttsEnvironment?: BrowserTtsEnvironmentFingerprint;
  ttsEnvironmentHistory?: BrowserTtsEnvironmentHistoryEntry[];
  environmentChanged?: boolean;
} {
  if (profile.inputMode !== 'browser-tts') return {};
  const ttsEnvironment = latestSession?.ttsEnvironment ?? feedback?.ttsEnvironment ?? profile.ttsEnvironment;
  const history = profile.ttsEnvironmentHistory;
  return {
    ...(ttsEnvironment ? { ttsEnvironment } : {}),
    ...(history && history.length > 0 ? { ttsEnvironmentHistory: history } : {}),
    ...(profile.environmentChanged || (history && history.length > 1) ? { environmentChanged: true } : {}),
  };
}

export function estimateJsonBytes(value: unknown): number | null {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return null;
  }
}

export function normalizeReportProfile(profile: InputLanguageBenchmarkMetrics): InputLanguageBenchmarkMetrics {
  const base = createEmptyInputLanguageBenchmark(profile.inputMode, profile.language);
  const candidate = profile as Partial<InputLanguageBenchmarkMetrics>;
  return normalizeInputLanguageBenchmarkForRecommendation({
    ...base,
    ...candidate,
    inputMode: profile.inputMode,
    language: profile.language,
    rollingWindowDays: 20,
    weakAreas: Array.isArray(candidate.weakAreas) ? candidate.weakAreas : base.weakAreas,
    rateAccuracyBuckets: Array.isArray(candidate.rateAccuracyBuckets) ? candidate.rateAccuracyBuckets : base.rateAccuracyBuckets,
    timeline: Array.isArray(candidate.timeline) ? candidate.timeline : base.timeline,
    recommendation: {
      ...base.recommendation,
      ...(candidate.recommendation ?? {}),
      targetRateRange: Array.isArray(candidate.recommendation?.targetRateRange)
        ? candidate.recommendation.targetRateRange
        : base.recommendation.targetRateRange,
      nextTrainingFocus: Array.isArray(candidate.recommendation?.nextTrainingFocus)
        ? candidate.recommendation.nextTrainingFocus
        : base.recommendation.nextTrainingFocus,
    },
  } as InputLanguageBenchmarkMetrics);
}
