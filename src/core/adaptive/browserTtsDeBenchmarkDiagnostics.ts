import type { InputLanguageBenchmarkMetrics } from './types';
import {
  BROWSER_TTS_DE_CONSERVATIVE_PAUSE_MS,
  isBrowserTtsDe,
} from './browserTtsDeBenchmarkCore';
import {
  getBrowserTtsDeBenchmarkRejectionReason,
  includesDiagnosticReason,
  isValidBrowserTtsDeSessionInsightSample,
  type BrowserTtsDeBenchmarkRejectionReason,
} from './browserTtsDeBenchmarkSamples';

export type BrowserTtsDeDiagnostics = {
  targetPauseMs: number;
  runtimeRecoveryPauseMs: number | null;
  pauseGapMs: number;
  acceptedRecentTimelineSamples: number;
  acceptedRecentSessionInsightSamples: number;
  sessionInsightOnlyRecentTimelineSamples: number;
  lagFallbackRecentTimelineSamples: number;
  rejectedRecentTimelineSamples: number;
  rejectionReasonCounts: Partial<Record<BrowserTtsDeBenchmarkRejectionReason, number>>;
  note: string;
  semanticPressureNote?: string;
};

export function buildBrowserTtsDeDiagnostics(
  profile: InputLanguageBenchmarkMetrics,
  recentPointLimit = 60,
): BrowserTtsDeDiagnostics | null {
  if (!isBrowserTtsDe(profile.inputMode, profile.language)) return null;

  const recentTimeline = profile.timeline.slice(-recentPointLimit);
  const targetPauseMs = Math.round(profile.recommendation?.targetPauseMs ?? profile.preferredPauseAfterPhraseMs ?? BROWSER_TTS_DE_CONSERVATIVE_PAUSE_MS);
  const runtimeRecoveryPauses = recentTimeline
    .filter(
      (point) =>
        includesDiagnosticReason(point, 'android-speech-rate-fallback') ||
        includesDiagnosticReason(point, 'browser-tts-de-recovery'),
    )
    .map((point) => point.pauseMs)
    .filter((pauseMs) => Number.isFinite(pauseMs) && pauseMs > 0);
  const runtimeRecoveryPauseMs = runtimeRecoveryPauses.length > 0 ? Math.max(...runtimeRecoveryPauses) : null;
  const pauseGapMs = runtimeRecoveryPauseMs === null ? 0 : Math.max(0, runtimeRecoveryPauseMs - targetPauseMs);
  const rejectionReasonCounts: Partial<Record<BrowserTtsDeBenchmarkRejectionReason, number>> = {};
  let acceptedRecentTimelineSamples = 0;
  let acceptedRecentSessionInsightSamples = 0;
  let sessionInsightOnlyRecentTimelineSamples = 0;
  let lagFallbackRecentTimelineSamples = 0;
  let rejectedRecentTimelineSamples = 0;

  for (const point of recentTimeline) {
    const reason = getBrowserTtsDeBenchmarkRejectionReason(point);
    const acceptedForSessionInsight = isValidBrowserTtsDeSessionInsightSample(point);
    if (acceptedForSessionInsight) {
      acceptedRecentSessionInsightSamples += 1;
    }
    if (point.lagFallbackUsed) {
      lagFallbackRecentTimelineSamples += 1;
    }
    if (reason === null) {
      acceptedRecentTimelineSamples += 1;
    } else {
      rejectedRecentTimelineSamples += 1;
      if (acceptedForSessionInsight) {
        sessionInsightOnlyRecentTimelineSamples += 1;
      }
      rejectionReasonCounts[reason] = (rejectionReasonCounts[reason] ?? 0) + 1;
    }
  }

  const semanticPressureNote =
    profile.semanticFidelityScore >= 0.95 && profile.weakAreas.includes('unsafe_boundary_pressure')
      ? 'Semantic Fidelity can stay high because accepted benchmark samples are safe, while unsafe_boundary_pressure is derived from recent runtime pressure and rejected unsafe chunks.'
      : undefined;

  return {
    targetPauseMs,
    runtimeRecoveryPauseMs,
    pauseGapMs,
    acceptedRecentTimelineSamples,
    acceptedRecentSessionInsightSamples,
    sessionInsightOnlyRecentTimelineSamples,
    lagFallbackRecentTimelineSamples,
    rejectedRecentTimelineSamples,
    rejectionReasonCounts,
    note:
      pauseGapMs > 0
        ? `targetPauseMs is the benchmark target; Browser TTS DE runtime recovery observed an executable Android/DE safety pause up to ${runtimeRecoveryPauseMs}ms.`
        : 'targetPauseMs is the benchmark target; no higher Browser TTS DE runtime recovery pause was observed in the recent timeline.',
    semanticPressureNote,
  };
}
