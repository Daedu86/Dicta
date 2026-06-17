import { afterEach, beforeEach, vi } from 'vitest';
import {
  cleanupSessionPersistenceSyncHarness,
  setupSessionPersistenceSyncHarness,
} from '../helpers/sessionPersistenceSyncHarness';

export function registerSessionPersistenceSyncTestLifecycle(): void {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    setupSessionPersistenceSyncHarness();
  });

  afterEach(() => {
    cleanupSessionPersistenceSyncHarness();
    window.localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
}
