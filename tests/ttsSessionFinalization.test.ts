import { describe, expect, it } from 'vitest';
import { buildFinalizedTtsSessionState } from '../src/app/ttsSessionFinalization';
import type { StoredSession, TtsPerformanceSampleResult } from '../src/app/sessionTypes';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';
import type { BrowserTtsEnvironmentFingerprint, SessionTelemetry } from '../src/types/dictation';

function telemetry(overrides: Partial<SessionTelemetry> = {}): SessionTelemetry {
  return {
    startedAt: '2026-06-13T10:00:00.000Z',
    finishedAt: '2026-06-13T10:04:00.000Z',
    lagSeries: [0.2],
    wpmSeries: [52],
    accuracySeries: [96],
    actions: [{ t: 240, action: 'submit', rate: 0.95 }],
    ttsChunks: [],
    repeatCount: 0,
    rateDistribution: [{ rate: 0.95, seconds: 240 }],
    ...overrides,
  };
}

function session(overrides: Partial<StoredSession> = {}): StoredSession {
  return {
    id: 'session-1',
    name: 'Session 1',
    createdAt: '2026-06-13T09:55:00.000Z',
    updatedAt: '2026-06-13T10:00:00.000Z',
    inputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    inputSettingsLocked: true,
    ttsText: 'Hallo Welt',
    ttsLanguage: 'de',
    ttsVoiceURI: 'old-voice',
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
    telemetry: telemetry({ finishedAt: undefined }),
    sessionSource: 'plainText',
    generationOrigin: 'manual',
    createdDeviceKind: 'desktop',
    dictationScript: null,
    ...overrides,
  };
}

const finalEnvironment: BrowserTtsEnvironmentFingerprint = {
  engine: 'browser',
  browserUserAgentHash: 'ua-hash',
  platform: 'Win32',
  standalonePwa: false,
  voiceURI: 'selected-voice',
  voiceName: 'Selected Voice',
  voiceLang: 'de-DE',
  localService: true,
  availableVoiceCount: 3,
  matchingVoiceCount: 2,
};

const finalSample: TtsPerformanceSampleResult = {
  metrics: {
    controllerState: 'hold',
    rate: 0.95,
    lagSec: 0.3,
    lagWords: 1,
    wpm: 52,
    accuracy: 96,
    trend: 'improving',
    score: 98,
    points: 12,
  },
  telemetry: telemetry(),
};

describe('buildFinalizedTtsSessionState', () => {
  it('replaces only the target session with finalized Browser TTS state', () => {
    const untouched = session({ id: 'untouched', name: 'Untouched' });
    const target = session({ id: 'target', name: 'Target', ttsVoiceURI: 'old-voice' });
    const sessions = [untouched, target];

    const result = buildFinalizedTtsSessionState({
      sessions,
      activeSessionId: 'target',
      activeSession: target,
      latestPracticeText: 'Hallo Welt',
      finalSample,
      finishedAt: '2026-06-13T10:04:00.000Z',
      finalVoiceURI: 'selected-voice',
      finalTtsEnvironment: finalEnvironment,
    });

    expect(result.nextSessions).not.toBe(sessions);
    expect(result.nextSessions[0]).toBe(untouched);
    expect(result.nextSessions[1]).not.toBe(target);
    expect(target.status).toBe('ready');

    const finalized = result.finalizedSession;
    expect(finalized).toBe(result.nextSessions[1]);
    expect(finalized).toMatchObject({
      id: 'target',
      status: 'finished',
      updatedAt: '2026-06-13T10:04:00.000Z',
      ttsPracticeText: 'Hallo Welt',
      ttsVoiceURI: 'selected-voice',
    });
    expect(finalized?.metrics).toBe(finalSample.metrics);
    expect(finalized?.telemetry).toBe(finalSample.telemetry);
    expect(finalized?.ttsEnvironment).toBe(finalEnvironment);
  });
});
