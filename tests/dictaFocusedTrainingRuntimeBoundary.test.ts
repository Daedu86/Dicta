import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Dicta focused training runtime boundary', () => {
  it('keeps focused training orchestration behind useDictaFocusedTrainingRuntime', () => {
    const boundary = readFileSync('src/app/useDictaFocusedTrainingRuntime.ts', 'utf8');
    const runtime = readFileSync('src/app/DictaAppRuntime.tsx', 'utf8');

    expect(boundary).toContain('export function useDictaFocusedTrainingRuntime');
    expect(boundary).toContain('useFocusedTrainingRuntime');
    expect(boundary).toContain('ttsSessionRuntime');

    expect(runtime).toContain("import { useDictaFocusedTrainingRuntime } from './useDictaFocusedTrainingRuntime';");
    expect(runtime).not.toContain("import { useFocusedTrainingRuntime } from './useFocusedTrainingRuntime';");
    expect(runtime).toContain('const ttsSessionRuntime = useTtsSessionRuntime');
    expect(runtime).toContain('useDictaFocusedTrainingRuntime({');
    expect(runtime).toContain('ttsSessionRuntime,');
  });
});
