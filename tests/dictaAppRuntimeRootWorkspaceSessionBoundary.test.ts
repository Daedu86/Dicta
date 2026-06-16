import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Dicta app runtime root workspace session boundary', () => {
  it('keeps workspace navigation and session wiring behind the root workspace session boundary', () => {
    const root = readFileSync('src/app/DictaAppRuntimeRoot.tsx', 'utf8');
    const rootWorkspaceSession = readFileSync('src/app/useDictaRootWorkspaceSessionRuntime.ts', 'utf8');

    expect(root).toContain("import { useDictaRootWorkspaceSessionRuntime } from './useDictaRootWorkspaceSessionRuntime';");
    expect(root).toContain('useDictaRootWorkspaceSessionRuntime({');
    expect(root).not.toContain("import { useWorkspaceSessionRuntime } from './useWorkspaceSessionRuntime';");
    expect(root).not.toContain("import { useWorkspaceNavigationEffects } from './useWorkspaceNavigationEffects';");
    expect(root).not.toContain('useWorkspaceNavigationEffects({');
    expect(root).not.toContain('useWorkspaceSessionRuntime({');

    expect(rootWorkspaceSession).toContain("import { useWorkspaceNavigationEffects } from './useWorkspaceNavigationEffects';");
    expect(rootWorkspaceSession).toContain("import { useWorkspaceSessionRuntime } from './useWorkspaceSessionRuntime';");
    expect(rootWorkspaceSession).toContain('useWorkspaceNavigationEffects(options)');
    expect(rootWorkspaceSession).toContain('useWorkspaceSessionRuntime(options)');
  });
});
