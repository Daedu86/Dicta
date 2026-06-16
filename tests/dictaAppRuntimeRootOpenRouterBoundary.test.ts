import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Dicta app runtime root OpenRouter boundary', () => {
  it('keeps OpenRouter runtime wiring outside the app runtime root', () => {
    const root = readFileSync('src/app/DictaAppRuntimeRoot.tsx', 'utf8');
    const rootOpenRouter = readFileSync('src/app/useDictaRootOpenRouterRuntime.ts', 'utf8');

    expect(root).toContain("import { useDictaRootOpenRouterRuntime } from './useDictaRootOpenRouterRuntime';");
    expect(root).not.toContain("from './useDictaOpenRouterRuntime';");
    expect(root).not.toContain("from './appRuntimeHelpers';");
    expect(root).not.toContain('fallbackInputMode: mapSessionInputMode');

    expect(rootOpenRouter).toContain('export function useDictaRootOpenRouterRuntime');
    expect(rootOpenRouter).toContain("from './useDictaOpenRouterRuntime';");
    expect(rootOpenRouter).toContain("from './appRuntimeHelpers';");
    expect(rootOpenRouter).toContain('fallbackInputMode: mapSessionInputMode(activeInputMode)');
  });
});
