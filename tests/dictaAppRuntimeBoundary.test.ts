import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Dicta app runtime boundary', () => {
  it('keeps DictaAppRuntime as a thin shell over the runtime root graph', () => {
    const shell = readFileSync('src/app/DictaAppRuntime.tsx', 'utf8');
    const root = readFileSync('src/app/DictaAppRuntimeRoot.tsx', 'utf8');
    const environmentGraph = readFileSync('src/app/useDictaRuntimeRootEnvironment.ts', 'utf8');
    const presentationGraph = readFileSync('src/app/useDictaRuntimeRootPresentationGraph.ts', 'utf8');
    const bootRuntime = readFileSync('src/app/useDictaAppBootRuntime.ts', 'utf8');

    expect(shell.trim()).toBe("export { DictaAppRuntime } from './DictaAppRuntimeRoot';");
    expect(shell).not.toContain('useTrainingRuntimeState');
    expect(shell).not.toContain('useDictaAccessRuntime');
    expect(shell).not.toContain('useDictaAppRouteCompositionRuntime');
    expect(shell).not.toContain('<AppRouteRenderer');

    expect(root).toContain('export function DictaAppRuntime');
    expect(root).toContain("import { useDictaRuntimeRootEnvironment } from './useDictaRuntimeRootEnvironment';");
    expect(root).toContain("import { useDictaRuntimeRootPresentationGraph } from './useDictaRuntimeRootPresentationGraph';");
    expect(root).toContain('<AppRouteRenderer');

    expect(environmentGraph).toContain('useDictaAppBootRuntime');
    expect(environmentGraph).toContain('useDictaAccessRuntime');
    expect(presentationGraph).toContain('useDictaRootRouteCompositionRuntime');
    expect(bootRuntime).toContain('useTrainingRuntimeState');
  });
});
