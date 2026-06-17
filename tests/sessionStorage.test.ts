/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StoredSession } from '../src/app/sessionTypes';
import {
  loadSessions,
  restoreStoredSessionFromPartial,
} from '../src/app/sessionStorage';
import {
  DELETED_SESSION_IDS_KEY,
  SESSION_STORAGE_KEY,
} from '../src/app/useSessionPersistenceSync';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';
import {
  CREATED_AT,
  UPDATED_AT,
  restoreFallbacks,
  storedSessionPartial,
} from './sessionStorageFixtures';

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('sessionStorage', () => {
  describe('loadSessions', () => {
    it('returns an empty list when no sessions are stored', () => {
      expect(loadSessions()).toEqual([]);
    });

    it('returns an empty list when the stored sessions JSON is invalid', () => {
      window.localStorage.setItem(SESSION_STORAGE_KEY, '{not valid json');

      expect(loadSessions()).toEqual([]);
    });

    it('restores partial sessions with normalized defaults', () => {
      window.localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify([
          storedSessionPartial({
            id: 'stored-session',
            name: 'Stored German drill',
            ttsText: 'Hallo Welt',
            ttsLanguage: 'xx' as StoredSession['ttsLanguage'],
            ttsVoiceURI: 'voice://de-DE',
            status: 'unknown' as StoredSession['status'],
            metrics: {
              accuracy: 91,
              wpm: 42,
            } as StoredSession['metrics'],
            generationOrigin: 'openrouter',
          }),
        ]),
      );

      const [session] = loadSessions();

      expect(session).toMatchObject({
        id: 'stored-session',
        name: 'Stored German drill',
        createdAt: CREATED_AT,
        updatedAt: UPDATED_AT,
        inputMode: BROWSER_TTS_SESSION_INPUT_MODE,
        inputSettingsLocked: false,
        ttsText: 'Hallo Welt',
        ttsLanguage: null,
        ttsVoiceURI: 'voice://de-DE',
        ttsPracticeText: '',
        difficulty: 'normal',
        status: 'ready',
        sessionSource: 'plainText',
        generationOrigin: 'openrouter',
        dictationScript: null,
      });
      expect(session.metrics).toMatchObject({
        accuracy: 91,
        wpm: 42,
        rate: 1,
        lagSec: 0,
        lagWords: 0,
        trend: 'stable',
        score: 0,
        points: 0,
      });
    });

    it('filters sessions marked as locally deleted', () => {
      window.localStorage.setItem(DELETED_SESSION_IDS_KEY, JSON.stringify(['deleted-session']));
      window.localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify([
          storedSessionPartial({ id: 'deleted-session', name: 'Deleted session' }),
          storedSessionPartial({ id: 'kept-session', name: 'Kept session' }),
        ]),
      );

      expect(loadSessions().map((session) => session.id)).toEqual(['kept-session']);
    });

    it('filters invalid stored entries that do not have a supported input mode', () => {
      window.localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify([
          { id: 'missing-input-mode', name: 'Invalid session' },
          storedSessionPartial({ id: 'valid-session', name: 'Valid session' }),
        ]),
      );

      expect(loadSessions().map((session) => session.id)).toEqual(['valid-session']);
    });

    it('returns an empty list when the stored value is not an array', () => {
      window.localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ id: 'not-an-array', inputMode: BROWSER_TTS_SESSION_INPUT_MODE }),
      );

      expect(loadSessions()).toEqual([]);
    });
  });

  describe('restoreStoredSessionFromPartial', () => {
    it('returns null when the partial session has no supported input mode', () => {
      expect(restoreStoredSessionFromPartial({ id: 'invalid-session' }, restoreFallbacks())).toBeNull();
    });

    it('uses fallback identity and timestamps when they are missing', () => {
      const fallbacks = restoreFallbacks();

      const session = restoreStoredSessionFromPartial(
        {
          inputMode: BROWSER_TTS_SESSION_INPUT_MODE,
          ttsLanguage: 'de',
          generationOrigin: 'invalid-origin' as StoredSession['generationOrigin'],
        },
        fallbacks,
      );

      expect(session).toMatchObject({
        id: 'fallback-id',
        name: 'Fallback session',
        createdAt: CREATED_AT,
        updatedAt: UPDATED_AT,
        inputMode: BROWSER_TTS_SESSION_INPUT_MODE,
        ttsLanguage: 'de',
        generationOrigin: 'manual',
      });
      expect(fallbacks.id).toHaveBeenCalledTimes(1);
      expect(fallbacks.name).toHaveBeenCalledTimes(1);
      expect(fallbacks.createdAt).toHaveBeenCalledTimes(1);
      expect(fallbacks.updatedAt).toHaveBeenCalledTimes(1);
    });

    it('drops Browser TTS voice URI when the input mode cannot be restored', () => {
      const session = restoreStoredSessionFromPartial(
        {
          id: 'invalid-session',
          inputMode: 'unsupported-input' as StoredSession['inputMode'],
          ttsVoiceURI: 'voice://de-DE',
        },
        restoreFallbacks(),
      );

      expect(session).toBeNull();
    });
  });
});
