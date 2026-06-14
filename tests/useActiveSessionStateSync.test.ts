import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appSource = readFileSync(resolve(repoRoot, 'src/App.tsx'), 'utf-8');
const focusedTrainingSource = readFileSync(resolve(repoRoot, 'src/app/useFocusedTrainingRuntime.ts'), 'utf-8');
const hookSource = readFileSync(resolve(repoRoot, 'src/app/useActiveSessionStateSync.ts'), 'utf-8');

describe('useActiveSessionStateSync extraction', () => {
  it('keeps App.tsx delegating active-session sync through the focused training runtime', () => {
    expect(appSource).toContain("import { useFocusedTrainingRuntime } from './app/useFocusedTrainingRuntime';");
    expect(appSource).toContain('useFocusedTrainingRuntime({');
    expect(appSource).not.toContain("import { useActiveSessionStateSync } from './app/useActiveSessionStateSync';");
    expect(appSource).not.toContain('useActiveSessionStateSync({');

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
