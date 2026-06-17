import type { StoredSession } from '../../src/app/sessionTypes';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../../src/core/sessionInputModes';

export function createFocusedTrainingSession(overrides: Partial<StoredSession> = {}): StoredSession {
  return {
    id: 'session-1',
    name: 'Focused session',
    createdAt: '2026-06-14T00:00:00.000Z',
    updatedAt: '2026-06-14T00:00:00.000Z',
    inputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    inputSettingsLocked: false,
    ttsText: 'eins zwei drei vier',
    ttsLanguage: 'de',
    ttsPracticeText: 'typed text',
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
