import { expect, vi } from 'vitest';
import { createTtsSessionSubmitAction } from '../src/app/useTtsSessionSubmitAction';
import type {
  StoredSession,
  TtsPerformanceSampleResult,
} from '../src/app/sessionTypes';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';
import type { BrowserTtsEnvironmentFingerprint } from '../src/types/dictation';

export type TtsSessionSubmitActionOptions = Parameters<typeof createTtsSessionSubmitAction>[0];

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

export function buildTtsSessionSubmitOptions(
  overrides: Partial<TtsSessionSubmitActionOptions> = {},
): TtsSessionSubmitActionOptions {
  const session = buildTtsSubmitSession();
  const finalSample = buildTtsFinalSample();
  const environment = buildTtsEnvironmentFingerprint();

  return {
    activeInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    ttsHasText: true,
    ttsPracticeText: '',
    ttsLanguage: 'de',
    sessions: [session],
    activeSessionId: session.id,
    activeSession: session,
    applyTtsPerformanceSample: vi.fn(() => finalSample),
    resolveBrowserTtsVoiceForSession: vi.fn(() => ({
      voice: { voiceURI: 'voice-1', name: 'Voice 1', lang: 'de-DE' } as SpeechSynthesisVoice,
      voiceURI: 'voice-1',
      usedFallback: false,
    })),
    collectBrowserTtsEnvironmentForSession: vi.fn(() => environment),
    persistAndPushSessionsNow: vi.fn(),
    stopTtsPlayback: vi.fn(),
    completeAdaptiveSessionFeedback: vi.fn(),
    setTtsPracticeText: vi.fn(),
    setSessions: vi.fn(),
    setRunning: vi.fn(),
    setSessionStatus: vi.fn(),
    setTtsStatus: vi.fn(),
    setError: vi.fn(),
    setTrainingSubmitMessage: vi.fn(),
    startPerfSpan: vi.fn(() => vi.fn()),
    nowIso: vi.fn(() => '2026-06-14T10:01:00.000Z'),
    ...overrides,
  } satisfies TtsSessionSubmitActionOptions;
}

export function submitTtsAttempt(options: TtsSessionSubmitActionOptions, attempt: string): void {
  createTtsSessionSubmitAction(options)(attempt);
}

export function expectTtsSubmitRejected(
  options: TtsSessionSubmitActionOptions,
  endPerfSpan: ReturnType<typeof vi.fn>,
): void {
  expect(options.setError).toHaveBeenCalledWith(
    'Paste TTS text and type your attempt before submitting.',
  );
  expect(options.setTrainingSubmitMessage).toHaveBeenCalledWith('');
  expect(options.applyTtsPerformanceSample).not.toHaveBeenCalled();
  expect(options.persistAndPushSessionsNow).not.toHaveBeenCalled();
  expect(endPerfSpan).toHaveBeenCalledTimes(1);
}

export function expectValidTtsSubmitFinalization(
  options: TtsSessionSubmitActionOptions,
  endPerfSpan: ReturnType<typeof vi.fn>,
): void {
  expect(options.setTtsPracticeText).toHaveBeenCalledWith('eins zwei');
  expect(options.applyTtsPerformanceSample).toHaveBeenCalledWith({
    action: 'submit',
    finalize: true,
    practiceTextOverride: 'eins zwei',
  });
  expect(options.resolveBrowserTtsVoiceForSession).toHaveBeenCalledWith(options.activeSession, 'de');
  expect(options.collectBrowserTtsEnvironmentForSession).toHaveBeenCalledWith(
    options.activeSession,
    expect.objectContaining({ voiceURI: 'voice-1' }),
    'voice-1',
  );
  expect(options.setSessions).toHaveBeenCalledWith([
    expect.objectContaining({
      id: 'session-1',
      status: 'finished',
      ttsPracticeText: 'eins zwei',
      ttsVoiceURI: 'voice-1',
      updatedAt: '2026-06-14T10:01:00.000Z',
    }),
  ]);
  expect(options.persistAndPushSessionsNow).toHaveBeenCalledWith(expect.any(Array), {
    criticalSessionIds: ['session-1'],
  });
  expect(options.stopTtsPlayback).toHaveBeenCalledTimes(1);
  expect(options.setRunning).toHaveBeenCalledWith(false);
  expect(options.setSessionStatus).toHaveBeenCalledWith('finished');
  expect(options.setTtsStatus).toHaveBeenCalledWith('finished');
  expect(options.completeAdaptiveSessionFeedback).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'session-1', status: 'finished' }),
  );
  expect(options.setError).toHaveBeenCalledWith('');
  expect(options.setTrainingSubmitMessage).toHaveBeenCalledWith(
    expect.stringContaining('Submitted to leaderboard.'),
  );
  expect(endPerfSpan).toHaveBeenCalledTimes(1);
}
