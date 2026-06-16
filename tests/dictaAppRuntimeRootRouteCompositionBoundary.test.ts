import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Dicta app runtime root route composition boundary', () => {
  it('keeps route composition behind the root route composition runtime boundary', () => {
    const root = readFileSync('src/app/DictaAppRuntimeRoot.tsx', 'utf8');
    const rootBoundary = readFileSync('src/app/useDictaRootRouteCompositionRuntime.ts', 'utf8');
    const routeComposition = readFileSync('src/app/useDictaAppRouteCompositionRuntime.ts', 'utf8');

    expect(root).toContain("import { useDictaRootRouteCompositionRuntime } from './useDictaRootRouteCompositionRuntime';");
    expect(root).toContain('useDictaRootRouteCompositionRuntime({');
    expect(root).not.toContain("import { useDictaAppRouteCompositionRuntime } from './useDictaAppRouteCompositionRuntime';");
    expect(root).not.toContain('useDictaAppRouteCompositionRuntime({');

    expect(rootBoundary).toContain("import { useDictaAppRouteCompositionRuntime } from './useDictaAppRouteCompositionRuntime';");
    expect(rootBoundary).toContain('Parameters<');
    expect(rootBoundary).toContain('typeof useDictaAppRouteCompositionRuntime');
    expect(rootBoundary).toContain('useDictaAppRouteCompositionRuntime(params)');

    expect(routeComposition).toContain('export function useDictaAppRouteCompositionRuntime');
    expect(routeComposition).toContain('useAdaptiveWorkspaceRouteRuntime');
    expect(routeComposition).toContain('useAppPresentationRuntime');
  });
});
