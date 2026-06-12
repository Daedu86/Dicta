import { describe, expect, it } from 'vitest';
import type { StoredSession } from '../src/app/sessionTypes';
import {
  buildActiveSessionHydrationState,
  createDefaultTtsPublishedUiState,
} from '../src/app/activeSessionHydration';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';

function createSession(overrides: Partial<StoredSession> = {}): StoredSession {
  return {
    id: 'session-1',
    name: 'Session 1',
    createdAt: '2026-06-12T10:00:00.000Z',
    updatedAt: '2026-06-12T10:05:00.000Z',
    inputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    inputSettingsLocked: false,
    ttsText: '',
    ttsLanguage: null,
    ttsVoiceURI: null,
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
    telemetry: {},
    sessionSource: 'plainText',
    generationOrigin: 'manual',
    createdDeviceKind: 'unknown',
    dictationScript: null,
    ...overrides,
  } as StoredSession;
}

describe('active session hydration', () => {
  it('builds default visible state for an unfinished Browser TTS session with text', () => {
    const state = buildActiveSessionHydrationState(
      createSession({
        inputSettingsLocked: true,
        ttsText: 'Hallo Welt',
        ttsLanguage: 'de',
        ttsPracticeText: 'Hallo',
        status: 'ready',
        metrics: {
          controllerState: 'tempo-up',
          rate: 1.4,
          lagSec: 3,
          lagWords: 5,
          wpm: 80,
          accuracy: 70,
          trend: 'declining',
          score: 40,
          points: 9,
        },
      }),
    );

    expect(state).toMatchObject({
      difficulty: 'normal',
      inputSettingsLocked: true,
      ttsLanguage: 'de',
      ttsPracticeText: 'Hallo',
      sessionStatus: 'ready',
      ttsText: 'Hallo Welt',
      ttsStatus: 'ready',
      ttsCurrentChunk: '',
      ttsPacingMode: 'balanced',
      ttsSpeechRate: 1,
      running: false,
      rate: 1,
      lagSec: 0,
      lagWords: 0,
      wpm: 0,
      accuracy: 100,
      trend: 'stable',
      controllerState: 'hold',
      publishedUi: createDefaultTtsPublishedUiState(),
    });
  });

  it('hydrates finished metrics and finished Browser TTS status', () => {
    const state = buildActiveSessionHydrationState(
      createSession({
        status: 'finished',
        ttsText: 'Hallo Welt',
        metrics: {
          controllerState: 'tempo-down',
          rate: 0.85,
          lagSec: 2.5,
          lagWords: 4,
          wpm: 55,
          accuracy: 88,
          trend: 'improving',
          score: 123,
          points: 45,
        },
      }),
    );

    expect(state).toMatchObject({
      sessionStatus: 'finished',
      ttsStatus: 'finished',
      rate: 0.85,
      lagSec: 2.5,
      lagWords: 4,
      wpm: 55,
      accuracy: 88,
      trend: 'improving',
      controllerState: 'tempo-down',
      running: false,
    });
  });

  it('falls back to idle status and German language when no text or language are stored', () => {
    const state = buildActiveSessionHydrationState(
      createSession({
        ttsText: '',
        ttsLanguage: null,
        status: 'ready',
      }),
    );

    expect(state.ttsStatus).toBe('idle');
    expect(state.ttsLanguage).toBe('de');
  });
});
