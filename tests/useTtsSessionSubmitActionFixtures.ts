import type {
  StoredSession,
  TtsPerformanceSampleResult,
} from '../src/app/sessionTypes';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';
import type { BrowserTtsEnvironmentFingerprint } from '../src/types/dictation';

export function buildTtsSubmitSession(overrides: Partial<StoredSession> = {}): StoredSession {
  return {
    id: 'session-1',
    name: 'Session 1',
    createdAt: '2026-06-14T10:00:00.000Z',
    updatedAt: '2026-06-14T10:00:00.000Z',
    inputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    inputSettingsLocked: false,
    ttsText: 'eins zwei',
    ttsLanguage: 'de',
    ttsVoiceURI: null,
    ttsEnvironment: null,
    ttsPracticeText: '',
    difficulty: 'normal',
    status: 'ready',
    metrics: {
      controllerState: 'hold',
      rate: 1,
      lagSec: 0,
      lagWords: 0,
      wpm: 0,
      accuracy: 100,
      trend: 'stable',
      score: 0,
      points: 0,
    },
    telemetry: {
      startedAt: '2026-06-14T10:00:00.000Z',
      lagSeries: [],
      wpmSeries: [],
      accuracySeries: [],
      actions: [],
      ttsChunks: [],
      repeatCount: 0,
      rateDistribution: [],
    },
    sessionSource: 'plainText',
    generationOrigin: 'manual',
    createdDeviceKind: 'desktop',
    dictationScript: null,
    ...overrides,
  };
}

export function buildTtsFinalSample(): TtsPerformanceSampleResult {
  return {
    metrics: {
      controllerState: 'hold',
      rate: 1,
      lagSec: 0.2,
      lagWords: 1,
      wpm: 80,
      accuracy: 95,
      trend: 'stable',
      score: 91,
      points: 12,
    },
    telemetry: {
      startedAt: '2026-06-14T10:00:00.000Z',
      finishedAt: '2026-06-14T10:01:00.000Z',
      lagSeries: [0.2],
      wpmSeries: [80],
      accuracySeries: [95],
      actions: [{ t: 60, action: 'submit', rate: 1 }],
      ttsChunks: [],
      repeatCount: 0,
      rateDistribution: [],
    },
  };
}

export function buildTtsEnvironmentFingerprint(): BrowserTtsEnvironmentFingerprint {
  return {
    engine: 'browser',
    browserUserAgentHash: 'hash',
    platform: 'Win32',
    standalonePwa: false,
    voiceURI: 'voice-1',
    voiceName: 'Voice 1',
    voiceLang: 'de-DE',
    localService: true,
    availableVoiceCount: 1,
    matchingVoiceCount: 1,
  };
}
