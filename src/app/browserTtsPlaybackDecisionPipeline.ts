import { hasPacingReason } from '../core/adaptive/pacingReasonCodes';
import type {
  InputLanguageBenchmarkMetrics,
  PacingDecision,
  PacingReasonCode,
} from '../core/adaptive/types';
import type { BrowserTtsAdaptiveProfile } from '../inputs/browserTts/browserTtsAdaptiveProfiles';
import {
  applyBrowserTtsDeRecoveryPolicy,
  type BrowserTtsDeRecoveryState,
} from '../inputs/browserTts/browserTtsRecoveryPolicy';
import {
  applyBrowserTtsMobilePacingFallback,
  applyBrowserTtsRuntimeRateFloor,
} from '../inputs/browserTts/browserTtsRatePolicy';
import { applyBrowserTtsUnsafeBoundaryPolicy } from '../inputs/browserTts/browserTtsUnsafePolicy';
import type { PlannedBrowserTtsChunk } from '../inputs/browserTts/ttsDynamicChunkPlanner';
import type { TtsLiveSignal } from './ttsPlaybackProfile';

const EN_BENCHMARK_MIN_SAMPLE_COUNT = 3;
const EN_BENCHMARK_LOW_CONFIDENCE = 0.15;
const EN_BENCHMARK_INTRACHUNK_RATE_CEILING = 0.66;
const EN_BENCHMARK_ENV_CHANGED_INTRACHUNK_RATE_CEILING = 0.62;
const EN_BENCHMARK_MIN_PAUSE_MS = 2600;
const EN_BENCHMARK_ENV_CHANGED_MIN_PAUSE_MS = 3000;

const EN_BENCHMARK_PRESSURE_WEAK_AREAS = new Set<string>([
  'lag',
  'lag_instability',
  'low_accuracy',
  'accuracy_instability',
  'support_dependency',
  'flow_instability',
]);

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
  const postRecoveryDecision = applyBrowserTtsDeRecoveryPolicy({
    decision: mobileFallback.decision,
    recovery: browserTtsRecovery,
    profile: browserTtsProfile,
  });
  const runtimeDecision = applyBrowserTtsEnBenchmarkRecoveryPolicy({
    decision: postRecoveryDecision,
    browserTtsBenchmark,
    profile: browserTtsProfile,
  });

  return {
    runtimeDecision,
    unsafeBoundaryApplied: unsafeRuntime.unsafeBoundaryApplied,
    mobileFallbackApplied: mobileFallback.mobileFallbackApplied,
  };
}

export function applyBrowserTtsEnBenchmarkRecoveryPolicy(params: {
  decision: PacingDecision;
  browserTtsBenchmark: InputLanguageBenchmarkMetrics | null | undefined;
  profile: BrowserTtsAdaptiveProfile;
}): PacingDecision {
  const { browserTtsBenchmark, decision, profile } = params;
  if (!browserTtsBenchmark || browserTtsBenchmark.inputMode !== 'browser-tts' || browserTtsBenchmark.language !== 'en') {
    return decision;
  }

  const pressure = summarizeBrowserTtsEnBenchmarkPressure(browserTtsBenchmark);
  if (!pressure.shouldApply) return decision;

  const recommendedCeiling = safeNumber(browserTtsBenchmark.recommendation.targetRateRange[1]);
  const perceptualCeiling = pressure.environmentChanged
    ? EN_BENCHMARK_ENV_CHANGED_INTRACHUNK_RATE_CEILING
    : EN_BENCHMARK_INTRACHUNK_RATE_CEILING;
  const rateCeiling = Math.max(
    profile.extremeSupportRateFloor,
    Math.min(perceptualCeiling, recommendedCeiling ?? perceptualCeiling),
  );
  const playbackRate = roundRate(Math.max(profile.extremeSupportRateFloor, Math.min(decision.playbackRate, rateCeiling)));
  const replayRate = roundRate(
    Math.max(profile.extremeSupportRateFloor, Math.min(decision.replayRate, Math.max(profile.extremeSupportRateFloor, playbackRate - 0.06))),
  );
  const benchmarkPauseMs = Math.max(
    EN_BENCHMARK_MIN_PAUSE_MS,
    pressure.environmentChanged ? EN_BENCHMARK_ENV_CHANGED_MIN_PAUSE_MS : 0,
    safeNumber(browserTtsBenchmark.recommendation.targetPauseMs) ?? 0,
  );

  return {
    ...decision,
    playbackRate,
    replayRate,
    pauseAfterPhraseMs: Math.max(decision.pauseAfterPhraseMs, benchmarkPauseMs),
    shouldPauseNow: true,
    nextPhraseSize: 'short',
    reason: appendDecisionReason(
      appendDecisionReason(decision.reason, 'browser-tts-en-benchmark-recovery'),
      'browser-tts-en-intrachunk-slowdown',
    ),
    reasonCodes: appendReasonCode(
      appendReasonCode(decision.reasonCodes, pressure.environmentChanged ? 'environment-pressure' : 'low-history-confidence'),
      'support-needed',
    ),
  };
}

function summarizeBrowserTtsEnBenchmarkPressure(benchmark: InputLanguageBenchmarkMetrics): {
  shouldApply: boolean;
  environmentChanged: boolean;
} {
  const weakAreaPressure = benchmark.weakAreas.some((weakArea) => EN_BENCHMARK_PRESSURE_WEAK_AREAS.has(weakArea));
  const lowSampleConfidence =
    benchmark.sampleCount < EN_BENCHMARK_MIN_SAMPLE_COUNT ||
    benchmark.sessionCount < 1 ||
    benchmark.recommendation.confidence < EN_BENCHMARK_LOW_CONFIDENCE;
  const lagPressure =
    benchmark.p90AbsLagSec > 1.5 ||
    benchmark.stableAverageLagSec > 1.5 ||
    benchmark.averageLagSec > 1.5;
  const accuracyPressure = benchmark.averageAccuracy > 0 && benchmark.averageAccuracy < 0.9;
  const environmentChanged = benchmark.environmentChanged === true;

  return {
    shouldApply: environmentChanged || lowSampleConfidence || weakAreaPressure || lagPressure || accuracyPressure,
    environmentChanged,
  };
}

function appendDecisionReason(reason: string, token: string): string {
  return reason.includes(token) ? reason : `${reason}, ${token}`;
}

function appendReasonCode(reasonCodes: PacingDecision['reasonCodes'] | undefined, code: PacingReasonCode): PacingDecision['reasonCodes'] {
  const existing = Array.isArray(reasonCodes) ? reasonCodes : [];
  return existing.includes(code) ? existing : [...existing, code];
}

function safeNumber(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function roundRate(value: number): number {
  return Number(value.toFixed(2));
}
