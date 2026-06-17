import { vi } from 'vitest';
import { createTtsSessionSubmitAction } from '../src/app/useTtsSessionSubmitAction';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';
import {
  buildTtsEnvironmentFingerprint,
  buildTtsFinalSample,
  buildTtsSubmitSession,
} from './useTtsSessionSubmitActionFixtures';

export type TtsSessionSubmitActionOptions = Parameters<typeof createTtsSessionSubmitAction>[0];

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
