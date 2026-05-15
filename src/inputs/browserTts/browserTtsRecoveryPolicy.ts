import type {
  AdaptiveTimelinePoint,
  PacingDecision,
  PhraseSize,
} from '../../core/adaptive/types';
import { isValidBrowserTtsDeBenchmarkSample } from '../../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type { BrowserTtsAdaptiveProfile } from './browserTtsAdaptiveProfiles';
import { isLikelyAndroidSpeechSynthesisRuntime } from './browserTtsRatePolicy';

const RECENT_VALID_SAMPLE_COUNT = 5;
const HIGH_LAG_SEC = 2.5;
const LOW_ACCURACY = 0.85;
const RECOVERY_EXIT_LAG_SEC = 1.5;
const RECOVERY_EXIT_ACCURACY = 0.88;

export type BrowserTtsDeRecoveryLevel = 'none' | 'moderate' | 'strong' | 'severe';

export type BrowserTtsDeRecoveryState = {
  active: boolean;
  level: BrowserTtsDeRecoveryLevel;
  validCompletedSampleCount: number;
  pressureSampleCount: number;
  highLagSampleCount: number;
  lowAccuracySampleCount: number;
  recentOutlierDiagnosticCount: number;
  shortChunkWordCap?: number;
};

export function summarizeBrowserTtsDeRecoveryState(params: {
  timeline: AdaptiveTimelinePoint[];
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
}): BrowserTtsDeRecoveryState {
  if (!isLikelyAndroidSpeechSynthesisRuntime(params)) {
    return emptyRecoveryState();
  }

  const browserTtsDePoints = params.timeline.filter(
    (point) => point.inputMode === 'browser-tts' && point.language === 'de',
  );
  const validCompleted = browserTtsDePoints
    .filter((point) => point.event === 'phrase_completed')
    .filter(isValidBrowserTtsDeBenchmarkSample)
    .slice(-RECENT_VALID_SAMPLE_COUNT);

  const recentDiagnostics = browserTtsDePoints.slice(-12);
  const recentOutlierDiagnosticCount = recentDiagnostics.filter(
    (point) => typeof point.rawLagSec === 'number' && Number.isFinite(point.rawLagSec) && Math.abs(point.rawLagSec) > 10,
  ).length;

  if (validCompleted.length < 2) {
    return {
      ...emptyRecoveryState(),
      validCompletedSampleCount: validCompleted.length,
      recentOutlierDiagnosticCount,
    };
  }

  const recoveryExitReady =
    validCompleted.length >= 3 &&
    validCompleted.slice(-3).every((point) => Math.abs(point.stableLagSec ?? point.lagSec) <= RECOVERY_EXIT_LAG_SEC && point.accuracy >= RECOVERY_EXIT_ACCURACY);
  if (recoveryExitReady) {
    return {
      ...emptyRecoveryState(),
      validCompletedSampleCount: validCompleted.length,
      recentOutlierDiagnosticCount,
    };
  }

  const highLagSampleCount = validCompleted.filter((point) => (point.stableLagSec ?? point.lagSec) > HIGH_LAG_SEC).length;
  const lowAccuracySampleCount = validCompleted.filter((point) => point.accuracy < LOW_ACCURACY).length;
  const pressureSampleCount = validCompleted.filter(
    (point) => (point.stableLagSec ?? point.lagSec) > HIGH_LAG_SEC || point.accuracy < LOW_ACCURACY,
  ).length;
  const repeatedHighLagLowAccuracyCount = validCompleted.filter(
    (point) => (point.stableLagSec ?? point.lagSec) > HIGH_LAG_SEC && point.accuracy < LOW_ACCURACY,
  ).length;

  if (pressureSampleCount < 2) {
    return {
      ...emptyRecoveryState(),
      validCompletedSampleCount: validCompleted.length,
      pressureSampleCount,
      highLagSampleCount,
      lowAccuracySampleCount,
      recentOutlierDiagnosticCount,
    };
  }

  const level: BrowserTtsDeRecoveryLevel =
    repeatedHighLagLowAccuracyCount >= 2 || (highLagSampleCount >= 3 && lowAccuracySampleCount >= 3)
      ? 'severe'
      : pressureSampleCount >= 3 || highLagSampleCount >= 3
        ? 'strong'
        : 'moderate';

  return {
    active: true,
    level,
    validCompletedSampleCount: validCompleted.length,
    pressureSampleCount,
    highLagSampleCount,
    lowAccuracySampleCount,
    recentOutlierDiagnosticCount,
    shortChunkWordCap: level === 'moderate' ? 5 : 4,
  };
}

export function applyBrowserTtsDeRecoveryPolicy(params: {
  decision: PacingDecision;
  recovery: BrowserTtsDeRecoveryState;
  profile: BrowserTtsAdaptiveProfile;
}): PacingDecision {
  if (!params.recovery.active) return params.decision;

  const targetPauseMs = params.recovery.level === 'moderate' ? 2200 : 2600;
  const rateCeiling =
    params.recovery.level === 'severe'
      ? params.profile.supportRateFloor
      : params.recovery.level === 'strong'
        ? 0.84
        : 0.88;
  const playbackRate = roundRate(Math.max(params.profile.supportRateFloor, Math.min(params.decision.playbackRate, rateCeiling)));
  const replayRate = roundRate(Math.max(params.profile.supportRateFloor, Math.min(params.decision.replayRate, playbackRate)));
  const reasonToken = `browser-tts-de-recovery-${params.recovery.level}`;
  return {
    ...params.decision,
    playbackRate,
    replayRate,
    pauseAfterPhraseMs: Math.max(params.decision.pauseAfterPhraseMs, targetPauseMs),
    shouldPauseNow: true,
    nextPhraseSize: 'short' as PhraseSize,
    reason: params.decision.reason.includes(reasonToken)
      ? params.decision.reason
      : `${params.decision.reason}, ${reasonToken}`,
  };
}

function emptyRecoveryState(): BrowserTtsDeRecoveryState {
  return {
    active: false,
    level: 'none',
    validCompletedSampleCount: 0,
    pressureSampleCount: 0,
    highLagSampleCount: 0,
    lowAccuracySampleCount: 0,
    recentOutlierDiagnosticCount: 0,
  };
}

function roundRate(value: number): number {
  return Number(value.toFixed(2));
}
