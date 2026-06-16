import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Dicta focused training runtime boundary', () => {
  it('keeps focused training orchestration behind root and focused training runtime boundaries', () => {
    const root = readFileSync('src/app/DictaAppRuntimeRoot.tsx', 'utf8');
    const rootBoundary = readFileSync('src/app/useDictaRootFocusedTrainingRuntime.ts', 'utf8');
    const boundary = readFileSync('src/app/useDictaFocusedTrainingRuntime.ts', 'utf8');

    expect(root).toContain("import { useDictaRootFocusedTrainingRuntime } from './useDictaRootFocusedTrainingRuntime';");
    expect(root).toContain('useDictaRootFocusedTrainingRuntime({');
    expect(root).not.toContain("import { useDictaFocusedTrainingRuntime } from './useDictaFocusedTrainingRuntime';");
    expect(root).not.toContain("import { perfDiagnostics } from '../core/perfDiagnostics';");

    expect(rootBoundary).toContain("import { perfDiagnostics } from '../core/perfDiagnostics';");
    expect(rootBoundary).toContain("import { useDictaFocusedTrainingRuntime } from './useDictaFocusedTrainingRuntime';");
    expect(rootBoundary).toContain('useDictaFocusedTrainingRuntime({');

    expect(boundary).toContain('export function useDictaFocusedTrainingRuntime');
    expect(boundary).toContain('useFocusedTrainingRuntime');
    expect(boundary).toContain('ttsSessionRuntime');
  });
});
