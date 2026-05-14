import type { PacingMode } from '../../core/adaptive/types';
import type { PacingDecision } from '../../core/adaptive/types';
import type { BrowserTtsAdaptiveProfile } from './browserTtsAdaptiveProfiles';

function roundRate(value: number): number {
  return Number(value.toFixed(2));
}

export function applyBrowserTtsRuntimeRateFloor(params: {
  mode: PacingMode;
  requestedRate: number;
  lagSec: number;
  accuracy: number;
  supportNeeded?: boolean;
  profile: BrowserTtsAdaptiveProfile;
}): number {
  const { mode, requestedRate, lagSec, accuracy, supportNeeded, profile } = params;
  const extremeSupport = mode === 'support' && lagSec > 4 && accuracy < 0.76;
  const floor =
    mode === 'support'
      ? (extremeSupport ? profile.extremeSupportRateFloor : profile.supportRateFloor)
      : profile.balancedFlowFloor;
  let rate = Math.max(floor, requestedRate);
  if (mode === 'support' && supportNeeded) {
    rate = Math.min(profile.supportRateCeiling, rate);
  }
  return roundRate(rate);
}

export function isLikelyAndroidSpeechSynthesisRuntime(params: {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
}): boolean {
  const userAgent = params.userAgent ?? '';
  const platform = params.platform ?? '';
  return /Android/i.test(userAgent) || (/Linux/i.test(platform) && (params.maxTouchPoints ?? 0) > 1 && /Mobile/i.test(userAgent));
}

export function applyBrowserTtsMobilePacingFallback(params: {
  decision: PacingDecision;
  lagSec: number;
  accuracy: number;
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
  profile: BrowserTtsAdaptiveProfile;
}): { decision: PacingDecision; mobileFallbackApplied: boolean } {
  if (!isLikelyAndroidSpeechSynthesisRuntime(params)) {
    return { decision: params.decision, mobileFallbackApplied: false };
  }

  const supportPressure =
    params.decision.mode === 'support' ||
    params.decision.reason.includes('support-needed') ||
    params.lagSec > 1.5 ||
    params.accuracy < 0.9;

  if (!supportPressure) {
    return { decision: params.decision, mobileFallbackApplied: false };
  }

  const extremePressure = params.lagSec > 4 && params.accuracy < 0.76;
  const minimumPauseMs = extremePressure
    ? Math.max(2200, params.profile.unsafeBoundaryMinPauseMs + 800)
    : Math.max(1600, params.profile.unsafeBoundaryMinPauseMs + 400);
  const playbackRate = roundRate(Math.min(params.decision.playbackRate, params.profile.supportRateCeiling));
  const replayRate = roundRate(Math.min(params.decision.replayRate, Math.max(params.profile.supportRateFloor, playbackRate - 0.08)));
  const reason = params.decision.reason.includes('android-speech-rate-fallback')
    ? params.decision.reason
    : `${params.decision.reason}, android-speech-rate-fallback`;

  return {
    decision: {
      ...params.decision,
      playbackRate,
      replayRate,
      pauseAfterPhraseMs: Math.max(params.decision.pauseAfterPhraseMs, minimumPauseMs),
      shouldPauseNow: true,
      nextPhraseSize: 'short',
      reason,
    },
    mobileFallbackApplied: true,
  };
}
