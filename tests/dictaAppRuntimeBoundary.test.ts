import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Dicta app runtime boundary', () => {
  it('keeps DictaAppRuntime as a thin shell over the runtime root', () => {
    const shell = readFileSync('src/app/DictaAppRuntime.tsx', 'utf8');
    const root = readFileSync('src/app/DictaAppRuntimeRoot.tsx', 'utf8');

    expect(shell.trim()).toBe("export { DictaAppRuntime } from './DictaAppRuntimeRoot';");
    expect(shell).not.toContain('useTrainingRuntimeState');
    expect(shell).not.toContain('useDictaAccessRuntime');
    expect(shell).not.toContain('useDictaAppRouteCompositionRuntime');
    expect(shell).not.toContain('<AppRouteRenderer');

    expect(root).toContain('export function DictaAppRuntime');
    expect(root).toContain('useTrainingRuntimeState');
    expect(root).toContain('useDictaAccessRuntime');
    expect(root).toContain('useDictaAppRouteCompositionRuntime');
    expect(root).toContain('<AppRouteRenderer');
  });
});
