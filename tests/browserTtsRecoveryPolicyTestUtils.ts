import {
  applyBrowserTtsDeRecoveryPolicy,
  summarizeBrowserTtsDeRecoveryState,
} from '../src/inputs/browserTts/browserTtsRecoveryPolicy';
import { resolveBrowserTtsAdaptiveProfile } from '../src/inputs/browserTts/browserTtsAdaptiveProfiles';
import type { AdaptiveTimelinePoint, PacingDecision } from '../src/core/adaptive/types';
import { ANDROID_SAMSUNG_S22_CHROME_RUNTIME } from './browserTtsRatePolicyTestUtils';

export const DE_BROWSER_TTS_RECOVERY_PROFILE = resolveBrowserTtsAdaptiveProfile('de');

export function createBrowserTtsRecoveryPoint(
  overrides: Partial<AdaptiveTimelinePoint> = {},
): AdaptiveTimelinePoint {
  return {
    timestampMs: Date.now(),
    inputMode: 'browser-tts',
    language: 'de',
    mode: 'support',
    playbackRate: 0.95,
    accuracy: 0.82,
    lagSec: 3.1,
    rawLagSec: 3.1,
    stableLagSec: 3.1,
    wpm: 48,
    pauseMs: 1200,
    correctionRate: 0,
    phraseBoundaryType: 'sentence',
    semanticCompleteness: 1,
    event: 'phrase_completed',
    phraseId: 'p',
    phraseIndex: 0,
    sessionId: 's',
    ...overrides,
  };
}

export function createBrowserTtsRecoveryDecision(
  overrides: Partial<PacingDecision> = {},
): PacingDecision {
  return {
    mode: 'support',
    playbackRate: 0.95,
    pauseAfterPhraseMs: 1600,
    shouldPauseNow: true,
    shouldReplayPhrase: false,
    boundaryStrictness: 'clause',
    allowMidPhrasePause: false,
    deferPauseUntilSafeBoundary: false,
    replayRate: 0.9,
    nextPhraseSize: 'short',
    reason: 'mode=support, support-needed',
    lagScore: 0.2,
    accuracyScore: 0.5,
    hesitationScore: 0.5,
    confidenceScore: 0.5,
    ...overrides,
  };
}

type RecoveryRuntime = Pick<
  Parameters<typeof summarizeBrowserTtsDeRecoveryState>[0],
  'userAgent' | 'platform' | 'maxTouchPoints'
>;

export type BrowserTtsDeRecoveryCase = {
  timeline: AdaptiveTimelinePoint[];
  runtime?: RecoveryRuntime;
};

export function summarizeBrowserTtsDeRecoveryCase({
  timeline,
  runtime = ANDROID_SAMSUNG_S22_CHROME_RUNTIME,
}: BrowserTtsDeRecoveryCase) {
  return summarizeBrowserTtsDeRecoveryState({
    timeline,
    ...runtime,
  });
}

export type BrowserTtsDeRecoveryPolicyCase = BrowserTtsDeRecoveryCase & {
  decision?: PacingDecision;
};

export function applyBrowserTtsDeRecoveryPolicyCase({
  timeline,
  runtime,
  decision = createBrowserTtsRecoveryDecision(),
}: BrowserTtsDeRecoveryPolicyCase) {
  const recovery = summarizeBrowserTtsDeRecoveryCase({ timeline, runtime });

  return {
    recovery,
    next: applyBrowserTtsDeRecoveryPolicy({
      decision,
      recovery,
      profile: DE_BROWSER_TTS_RECOVERY_PROFILE,
    }),
  };
}
