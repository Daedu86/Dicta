import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appSource = readFileSync(resolve(repoRoot, 'src/App.tsx'), 'utf-8');
const hookSource = readFileSync(resolve(repoRoot, 'src/app/useActiveSessionStateSync.ts'), 'utf-8');

describe('useActiveSessionStateSync extraction', () => {
  it('keeps App.tsx delegating active-session sync to the focused hook', () => {
    expect(appSource).toContain("import { useActiveSessionStateSync } from './app/useActiveSessionStateSync';");
    expect(appSource).toContain('useActiveSessionStateSync({');
    expect(appSource).not.toContain("import { buildActiveSessionHydrationState } from './app/activeSessionHydration';");
    expect(appSource).not.toContain("import { telemetryEquals } from './core/sessionTelemetryEquality';");
    expect(appSource).not.toContain('normalizeLiveSessionStatusForPersistence');
  });

  it('preserves hydration, finished-session sync, and finished-downgrade protection in the extracted hook', () => {
    expect(hookSource).toContain('buildActiveSessionHydrationState(activeSession)');
    expect(hookSource).toContain("activeSession.status !== 'finished' || sessionStatus === 'finished'");
    expect(hookSource).toContain('normalizeLiveSessionStatusForPersistence(sessionStatus, nextTelemetry, running)');
    expect(hookSource).toContain("session.status === 'finished' && nextStatus !== 'finished' && !isExplicitFinishedReset");
    expect(hookSource).toContain('allowFinishedSessionResetRef.current = null;');
  });
});
