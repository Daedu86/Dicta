import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Dicta app runtime root persistence boundary', () => {
  it('keeps session persistence wiring behind the root persistence runtime boundary', () => {
    const root = readFileSync('src/app/DictaAppRuntimeRoot.tsx', 'utf8');
    const rootPersistence = readFileSync('src/app/useDictaRootPersistenceRuntime.ts', 'utf8');

    expect(root).toContain("import { useDictaRootPersistenceRuntime } from './useDictaRootPersistenceRuntime';");
    expect(root).toContain('useDictaRootPersistenceRuntime({');
    expect(root).not.toContain("import { useSessionPersistenceRuntime } from './useSessionPersistenceRuntime';");
    expect(root).not.toContain('useSessionPersistenceRuntime({');
    expect(root).not.toContain("import { useRef } from 'react';");

    expect(rootPersistence).toContain("import { useSessionPersistenceRuntime } from './useSessionPersistenceRuntime';");
    expect(rootPersistence).toContain('useRef<() => void>(() => undefined)');
    expect(rootPersistence).toContain('resetOpenRouterJobsRuntime');
  });
});
