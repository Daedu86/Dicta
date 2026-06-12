import { describe, expect, it } from 'vitest';
import {
  assignMissingBrowserTtsVoiceEnvironments,
  collectBrowserTtsEnvironmentForSession,
  resolveBrowserTtsVoiceSessionUpdate,
} from '../src/app/browserTtsSessionEnvironment';
import type { StoredSession } from '../src/app/sessionTypes';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';

function createVoice(overrides: Partial<SpeechSynthesisVoice>): SpeechSynthesisVoice {
  return {
    default: false,
    lang: 'de-DE',
    localService: true,
    name: 'German Voice',
    voiceURI: 'de-a',
    ...overrides,
  } as SpeechSynthesisVoice;
}

const voices = [
  createVoice({ name: 'Anna', voiceURI: 'de-a', lang: 'de-DE' }),
  createVoice({ name: 'Bernd', voiceURI: 'de-b', lang: 'de-DE' }),
  createVoice({ name: 'Emma', voiceURI: 'en-a', lang: 'en-US' }),
];

const navigatorRef = {
  userAgent: 'Vitest Browser',
  platform: 'TestOS',
};

const matchMedia = () => ({ matches: false });

function createSession(overrides: Partial<StoredSession> = {}): StoredSession {
  return {
    id: 'session-1',
    name: 'Session',
    createdAt: '2026-06-12T00:00:00.000Z',
    updatedAt: '2026-06-12T00:00:00.000Z',
    inputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    inputSettingsLocked: true,
    ttsText: 'Hallo Welt',
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
      startedAt: '',
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

describe('Browser TTS session environment helpers', () => {
  it('collects an environment fingerprint for the selected session voice', () => {
    const environment = collectBrowserTtsEnvironmentForSession({
      session: createSession(),
      selectedVoice: voices[0],
      browserTtsVoices: voices,
      navigatorRef,
      matchMedia,
    });

    expect(environment).toMatchObject({
      engine: 'browser',
      platform: 'TestOS',
      standalonePwa: false,
      voiceURI: 'de-a',
      voiceName: 'Anna',
      voiceLang: 'de-DE',
      localService: true,
      availableVoiceCount: 3,
      matchingVoiceCount: 2,
    });
  });

  it('assigns missing Browser TTS voice URIs and attaches environment metadata', () => {
    const sessions = [
      createSession({ id: 'used', ttsVoiceURI: 'de-a' }),
      createSession({ id: 'missing' }),
      createSession({ id: 'unlocked', inputSettingsLocked: false }),
    ];

    const next = assignMissingBrowserTtsVoiceEnvironments({
      sessions,
      browserTtsVoices: voices,
      navigatorRef,
      matchMedia,
      random: () => 0,
    });

    expect(next).not.toBe(sessions);
    expect(next[0]).toBe(sessions[0]);
    expect(next[1].ttsVoiceURI).toBe('de-b');
    expect(next[1].ttsEnvironment?.voiceURI).toBe('de-b');
    expect(next[2]).toBe(sessions[2]);
  });

  it('returns the original sessions reference when no session needs a voice assignment', () => {
    const sessions = [
      createSession({ id: 'ready-a', ttsVoiceURI: 'de-a' }),
      createSession({ id: 'ready-b', ttsVoiceURI: 'de-b' }),
    ];

    expect(
      assignMissingBrowserTtsVoiceEnvironments({
        sessions,
        browserTtsVoices: voices,
        navigatorRef,
        matchMedia,
      }),
    ).toBe(sessions);
  });

  it('builds a session update when the saved Browser TTS voice is missing on this device', () => {
    const session = createSession({ ttsVoiceURI: 'missing-device-voice' });

    const resolution = resolveBrowserTtsVoiceSessionUpdate({
      session,
      browserTtsVoices: voices,
      language: 'de',
      navigatorRef,
      matchMedia,
      nowIso: () => '2026-06-12T12:00:00.000Z',
      random: () => 0,
    });

    expect(resolution.voiceURI).toBe('de-a');
    expect(resolution.changed).toBe(true);
    expect(resolution.nextSession.ttsVoiceURI).toBe('de-a');
    expect(resolution.nextSession.ttsEnvironment?.voiceURI).toBe('de-a');
    expect(resolution.nextSession.updatedAt).toBe('2026-06-12T12:00:00.000Z');
  });
});
