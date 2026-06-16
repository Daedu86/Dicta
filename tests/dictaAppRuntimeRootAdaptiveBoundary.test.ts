import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Dicta app runtime root adaptive boundary', () => {
  it('keeps adaptive runtime wiring behind the root adaptive runtime boundary', () => {
    const root = readFileSync('src/app/DictaAppRuntimeRoot.tsx', 'utf8');
    const rootAdaptive = readFileSync('src/app/useDictaRootAdaptiveRuntime.ts', 'utf8');

    expect(root).toContain("import { useDictaRootAdaptiveRuntime } from './useDictaRootAdaptiveRuntime';");
    expect(root).toContain('useDictaRootAdaptiveRuntime({');
    expect(root).not.toContain("import { useAdaptiveWorkspaceRuntime } from './useAdaptiveWorkspaceRuntime';");
    expect(root).not.toContain('useAdaptiveWorkspaceRuntime({');

    expect(rootAdaptive).toContain("import { useAdaptiveWorkspaceRuntime } from './useAdaptiveWorkspaceRuntime';");
    expect(rootAdaptive).toContain('adaptiveWorkspaceState');
    expect(rootAdaptive).toContain('useAdaptiveWorkspaceRuntime({');
  });
});
