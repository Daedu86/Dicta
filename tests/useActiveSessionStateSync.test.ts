import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ACTIVE_SESSION_LIVE_PERSIST_DELAY_MS,
  ACTIVE_SESSION_LIVE_PERSIST_MAX_DELAY_MS,
  shouldDebounceActiveSessionStatePersist,
} from '../src/app/useActiveSessionStateSync';
import type { StoredSession } from '../src/app/sessionTypes';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appRuntimeSource = readFileSync(resolve(repoRoot, 'src/app/DictaAppRuntimeRoot.tsx'), 'utf-8');
const dictaRootFocusedTrainingSource = readFileSync(resolve(repoRoot, 'src/app/useDictaRootFocusedTrainingRuntime.ts'), 'utf-8');
const dictaFocusedTrainingSource = readFileSync(resolve(repoRoot, 'src/app/useDictaFocusedTrainingRuntime.ts'), 'utf-8');
const focusedTrainingSource = readFileSync(resolve(repoRoot, 'src/app/useFocusedTrainingRuntime.ts'), 'utf-8');
const hookSource = readFileSync(resolve(repoRoot, 'src/app/useActiveSessionStateSync.ts'), 'utf-8');
const syncActionsSource = readFileSync(resolve(repoRoot, 'src/app/activeSessionStateSyncActions.ts'), 'utf-8');

describe('useActiveSessionStateSync extraction', () => {
  it('keeps DictaAppRuntime delegating active-session sync through root and focused training runtimes', () => {
    expect(appRuntimeSource).toContain("import { useDictaRootFocusedTrainingRuntime } from './useDictaRootFocusedTrainingRuntime';");
    expect(appRuntimeSource).toContain('useDictaRootFocusedTrainingRuntime({');
    expect(appRuntimeSource).not.toContain("import { useDictaFocusedTrainingRuntime } from './useDictaFocusedTrainingRuntime';");
    expect(appRuntimeSource).not.toContain("import { useFocusedTrainingRuntime } from './useFocusedTrainingRuntime';");
    expect(appRuntimeSource).not.toContain('useFocusedTrainingRuntime({');

    expect(dictaRootFocusedTrainingSource).toContain("import { useDictaFocusedTrainingRuntime } from './useDictaFocusedTrainingRuntime';");
    expect(dictaRootFocusedTrainingSource).toContain('useDictaFocusedTrainingRuntime({');

    expect(dictaFocusedTrainingSource).toContain("import { useFocusedTrainingRuntime } from './useFocusedTrainingRuntime';");
    expect(dictaFocusedTrainingSource).toContain('useFocusedTrainingRuntime({');

    expect(appRuntimeSource).not.toContain("import { useActiveSessionStateSync } from './useActiveSessionStateSync';");
    expect(appRuntimeSource).not.toContain('useActiveSessionStateSync({');

    expect(focusedTrainingSource).toContain("import { useActiveSessionStateSync } from './useActiveSessionStateSync';");
    expect(focusedTrainingSource).toContain('useActiveSessionStateSync({');
    expect(focusedTrainingSource).not.toContain("import { buildActiveSessionHydrationState } from './activeSessionHydration';");
    expect(focusedTrainingSource).not.toContain("import { telemetryEquals } from '../core/sessionTelemetryEquality';");
    expect(focusedTrainingSource).not.toContain('normalizeLiveSessionStatusForPersistence');
  });

  it('preserves hydration, finished-session sync, and finished-downgrade protection in the extracted actions', () => {
    expect(hookSource).toContain('hydrateActiveSessionState(params);');
    expect(hookSource).toContain('syncFinishedActiveSessionState(params);');
    expect(hookSource).toContain('shouldDebounceActiveSessionStatePersist(params)');
    expect(hookSource).toContain('ACTIVE_SESSION_LIVE_PERSIST_DELAY_MS');
    expect(hookSource).toContain('ACTIVE_SESSION_LIVE_PERSIST_MAX_DELAY_MS');

    expect(syncActionsSource).toContain('buildActiveSessionHydrationState(activeSession)');
    expect(syncActionsSource).toContain("activeSession.status !== 'finished' || params.sessionStatus === 'finished'");
    expect(syncActionsSource).toContain('normalizeLiveSessionStatusForPersistence(params.sessionStatus, nextTelemetry, params.running)');
    expect(syncActionsSource).toContain("session.status === 'finished' && nextStatus !== 'finished' && !isExplicitFinishedReset");
    expect(syncActionsSource).toContain('params.allowFinishedSessionResetRef.current = null;');
  });

  it('debounces only live running-session persistence', () => {
    const runningSession = { id: 'session-1', status: 'running' } as StoredSession;
    const finishedSession = { id: 'session-1', status: 'finished' } as StoredSession;

    expect(ACTIVE_SESSION_LIVE_PERSIST_DELAY_MS).toBeGreaterThanOrEqual(3000);
    expect(ACTIVE_SESSION_LIVE_PERSIST_MAX_DELAY_MS).toBeGreaterThanOrEqual(10000);
    expect(shouldDebounceActiveSessionStatePersist({
      activeSession: runningSession,
      sessionStatus: 'running',
      running: true,
    })).toBe(true);
    expect(shouldDebounceActiveSessionStatePersist({
      activeSession: runningSession,
      sessionStatus: 'paused',
      running: false,
    })).toBe(false);
    expect(shouldDebounceActiveSessionStatePersist({
      activeSession: finishedSession,
      sessionStatus: 'finished',
      running: false,
    })).toBe(false);
  });
});
