import { hasPacingReason } from '../core/adaptive/pacingReasonCodes';
import type {
  InputLanguageBenchmarkMetrics,
  PacingDecision,
} from '../core/adaptive/types';
import type { BrowserTtsAdaptiveProfile } from '../inputs/browserTts/browserTtsAdaptiveProfiles';
import type { BrowserTtsDeRecoveryState } from '../inputs/browserTts/browserTtsRecoveryPolicy';
import {
  applyBrowserTtsMobilePacingFallback,
  applyBrowserTtsRuntimeRateFloor,
} from '../inputs/browserTts/browserTtsRatePolicy';
import { applyBrowserTtsUnsafeBoundaryPolicy } from '../inputs/browserTts/browserTtsUnsafePolicy';
import type { PlannedBrowserTtsChunk } from '../inputs/browserTts/ttsDynamicChunkPlanner';
import type { TtsLiveSignal } from './ttsPlaybackProfile';

export type BrowserTtsRuntimeDecisionPipelineResult = {
  runtimeDecision: PacingDecision;
  unsafeBoundaryApplied: boolean;
  mobileFallbackApplied: boolean;
};

export function buildBrowserTtsRuntimeDecisionPipeline({
  decision,
  browserTtsBenchmark,
  browserTtsRecovery,
  browserTtsProfile,
  liveSignal,
  rollingAccuracyLast3,
  navigatorInfo,
  chunk,
  ttsSpeechRate,
}: {
  decision: PacingDecision;
  browserTtsBenchmark: InputLanguageBenchmarkMetrics | null | undefined;
  browserTtsRecovery: BrowserTtsDeRecoveryState;
  browserTtsProfile: BrowserTtsAdaptiveProfile;
  liveSignal: TtsLiveSignal;
  rollingAccuracyLast3: number;
  navigatorInfo: {
    userAgent?: string;
    platform?: string;
    maxTouchPoints?: number;
  };
  chunk: PlannedBrowserTtsChunk;
  ttsSpeechRate: number;
}): BrowserTtsRuntimeDecisionPipelineResult {
  const rateAfterFloor = applyBrowserTtsRuntimeRateFloor({
    mode: decision.mode,
    requestedRate: decision.playbackRate,
    lagSec: liveSignal.lagSec,
    accuracy: rollingAccuracyLast3,
    supportNeeded: hasPacingReason(decision, 'support-needed'),
    profile: browserTtsProfile,
  });
  const unsafeRuntime = applyBrowserTtsUnsafeBoundaryPolicy({
    boundaryType: chunk.phraseBoundaryType,
    requestedRate: rateAfterFloor,
    previousRate: ttsSpeechRate,
    pauseAfterPhraseMs: decision.pauseAfterPhraseMs,
    profile: browserTtsProfile,
  });
  const postPolicyDecision =
    unsafeRuntime.playbackRate === decision.playbackRate && unsafeRuntime.pauseAfterPhraseMs === decision.pauseAfterPhraseMs
      ? decision
      : {
          ...decision,
          playbackRate: unsafeRuntime.playbackRate,
          pauseAfterPhraseMs: unsafeRuntime.pauseAfterPhraseMs,
          reason: unsafeRuntime.unsafeBoundaryApplied
            ? `${decision.reason}, unsafe-boundary-conservative`
            : decision.reason,
        };
  const mobileFallback = applyBrowserTtsMobilePacingFallback({
    decision: postPolicyDecision,
    lagSec: liveSignal.lagSec,
    accuracy: rollingAccuracyLast3,
    userAgent: navigatorInfo.userAgent,
    platform: navigatorInfo.platform,
    maxTouchPoints: navigatorInfo.maxTouchPoints,
    profile: browserTtsProfile,
  });
  void browserTtsBenchmark;
  void browserTtsRecovery;
  const runtimeDecision = mobileFallback.decision;

  return {
    runtimeDecision,
    unsafeBoundaryApplied: unsafeRuntime.unsafeBoundaryApplied,
    mobileFallbackApplied: mobileFallback.mobileFallbackApplied,
  };
}
