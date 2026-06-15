import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appRuntimeSource = readFileSync(resolve(repoRoot, 'src/app/DictaAppRuntime.tsx'), 'utf-8');
const focusedTrainingSource = readFileSync(resolve(repoRoot, 'src/app/useFocusedTrainingRuntime.ts'), 'utf-8');
const hookSource = readFileSync(resolve(repoRoot, 'src/app/useActiveSessionStateSync.ts'), 'utf-8');

describe('useActiveSessionStateSync extraction', () => {
  it('keeps DictaAppRuntime delegating active-session sync through the focused training runtime', () => {
    expect(appRuntimeSource).toContain("import { useFocusedTrainingRuntime } from './useFocusedTrainingRuntime';");
    expect(appRuntimeSource).toContain('useFocusedTrainingRuntime({');
    expect(appRuntimeSource).not.toContain("import { useActiveSessionStateSync } from './useActiveSessionStateSync';");
    expect(appRuntimeSource).not.toContain('useActiveSessionStateSync({');

    expect(focusedTrainingSource).toContain("import { useActiveSessionStateSync } from './useActiveSessionStateSync';");
    expect(focusedTrainingSource).toContain('useActiveSessionStateSync({');
    expect(focusedTrainingSource).not.toContain("import { buildActiveSessionHydrationState } from './activeSessionHydration';");
    expect(focusedTrainingSource).not.toContain("import { telemetryEquals } from '../core/sessionTelemetryEquality';");
    expect(focusedTrainingSource).not.toContain('normalizeLiveSessionStatusForPersistence');
  });

  it('preserves hydration, finished-session sync, and finished-downgrade protection in the extracted hook', () => {
    expect(hookSource).toContain('buildActiveSessionHydrationState(activeSession)');
    expect(hookSource).toContain("activeSession.status !== 'finished' || sessionStatus === 'finished'");
    expect(hookSource).toContain('normalizeLiveSessionStatusForPersistence(sessionStatus, nextTelemetry, running)');
    expect(hookSource).toContain("session.status === 'finished' && nextStatus !== 'finished' && !isExplicitFinishedReset");
    expect(hookSource).toContain('allowFinishedSessionResetRef.current = null;');
  });
});
