import { createEmptyInputLanguageBenchmark } from '../../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildAdaptiveSessionFeedback } from '../../src/core/adaptive/sessionFeedback';
import type { PhrasePlaybackEvent } from '../../src/core/adaptive/types';
import type { BrowserTtsEnvironmentFingerprint } from '../../src/types/dictation';

export const REPORT_GENERATED_AT = '2026-05-24T20:00:00.000Z';

export const browserEnvironment: BrowserTtsEnvironmentFingerprint = {
  engine: 'browser',
  browserUserAgentHash: 'abcdef12',
  platform: 'Linux armv8l',
  standalonePwa: true,
  voiceURI: 'de-local',
  voiceName: 'German Local',
  voiceLang: 'de-DE',
  localService: true,
  availableVoiceCount: 5,
  matchingVoiceCount: 2,
};

type BrowserTtsBenchmarkProfile = ReturnType<typeof createEmptyInputLanguageBenchmark>;
type BrowserTtsBenchmarkLanguage = Parameters<typeof createEmptyInputLanguageBenchmark>[1];

export function createBrowserTtsBenchmarkProfile(language: BrowserTtsBenchmarkLanguage = 'de'): BrowserTtsBenchmarkProfile {
  return createEmptyInputLanguageBenchmark('browser-tts', language);
}

function phraseEvent(
  phraseIndex: number,
  event: PhrasePlaybackEvent['event'],
  timestampMs: number,
): PhrasePlaybackEvent {
  return {
    sessionId: 'session-1',
    phraseId: `phrase-${phraseIndex}`,
    phraseIndex,
    textPreview: `Phrase ${phraseIndex}`,
    event,
    timestampMs,
    inputMode: 'browser-tts',
    language: 'de',
  };
}

export function createRecoveryBenchmarkProfile(): BrowserTtsBenchmarkProfile {
  const profile = createBrowserTtsBenchmarkProfile('de');
  profile.sessionCount = 4;
  profile.sampleCount = 12;
  profile.recommendation = {
    targetRateRange: [0.9, 1],
    targetPhraseSize: 'medium',
    targetPauseMs: 850,
    nextTrainingFocus: ['steady timing'],
    confidence: 0.62,
    summary: 'Keep steady Browser TTS pacing.',
  };
  profile.weakAreas = ['lag'];
  profile.timeline = [
    {
      timestampMs: 1,
      inputMode: 'browser-tts',
      language: 'de',
      mode: 'balanced',
      playbackRate: 0.9,
      accuracy: 0.75,
      lagSec: 4.2,
      wpm: 34,
      pauseMs: 850,
      phraseBoundaryType: 'clause',
      semanticCompleteness: 0.8,
      event: 'rate_change',
      decisionReason: 'lag-pressure',
    },
  ];
  return profile;
}

export function createLegacyBenchmarkProfile(): BrowserTtsBenchmarkProfile {
  return {
    inputMode: 'browser-tts',
    language: 'de',
    rollingWindowDays: 20,
    sessionCount: 2,
    sampleCount: 4,
    weakAreas: ['lag'],
    averageAccuracy: 0.7,
    averageWpm: 30,
    averageLagSec: 4.5,
  } as unknown as BrowserTtsBenchmarkProfile;
}

export function createPoorBenchmarkProfile(): BrowserTtsBenchmarkProfile {
  const profile = createBrowserTtsBenchmarkProfile('de');
  profile.weakAreas = ['low_accuracy', 'replay', 'flow_instability'];
  return profile;
}

export function createPoorAdaptiveFeedback() {
  return buildAdaptiveSessionFeedback({
    sessionId: 'session-1',
    inputMode: 'browser-tts',
    language: 'de',
    sourceType: 'dictation_script',
    createdAt: REPORT_GENERATED_AT,
    phraseEvents: [
      phraseEvent(0, 'phrase_started', 1),
      phraseEvent(0, 'phrase_replayed', 2),
      phraseEvent(0, 'phrase_started', 3),
      phraseEvent(1, 'phrase_skipped', 4),
    ],
    totalPhrases: 2,
  });
}

export function createStrongPerformanceBenchmarkProfile(): BrowserTtsBenchmarkProfile {
  const profile = createBrowserTtsBenchmarkProfile('de');
  profile.sessionCount = 8;
  profile.sampleCount = 40;
  profile.recommendation = {
    ...profile.recommendation,
    targetRateRange: [0.95, 1.05],
    targetPhraseSize: 'medium',
    targetPauseMs: 700,
    confidence: 0.7,
  };
  profile.timeline = Array.from({ length: 30 }, (_, index) => ({
    timestampMs: index + 1,
    sessionId: 'session-2',
    phraseIndex: index,
    totalSemanticPhrases: 30,
    inputMode: 'browser-tts',
    language: 'de',
    mode: 'flow',
    playbackRate: 0.98,
    accuracy: 0.94,
    lagSec: 0.8,
    rawLagSec: 0.8,
    stableLagSec: 0.8,
    wpm: 48,
    pauseMs: 700,
    phraseBoundaryType: 'clause',
    semanticCompleteness: 0.92,
    event: 'phrase_completed',
    decisionReason: 'flow-stable',
  }));
  return profile;
}
