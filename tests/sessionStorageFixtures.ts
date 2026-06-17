import { vi } from 'vitest';
import type { StoredSession } from '../src/app/sessionTypes';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';

export const CREATED_AT = '2026-06-12T10:00:00.000Z';
export const UPDATED_AT = '2026-06-12T10:05:00.000Z';

export function storedSessionPartial(overrides: Partial<StoredSession> = {}): Partial<StoredSession> {
  return {
    id: 'session-1',
    name: 'Stored session',
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    inputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    ...overrides,
  };
}

export function restoreFallbacks() {
  return {
    id: vi.fn(() => 'fallback-id'),
    name: vi.fn(() => 'Fallback session'),
    createdAt: vi.fn(() => CREATED_AT),
    updatedAt: vi.fn(() => UPDATED_AT),
  };
}
