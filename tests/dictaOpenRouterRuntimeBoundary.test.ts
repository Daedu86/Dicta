import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Dicta OpenRouter runtime boundary', () => {
  it('keeps OpenRouter orchestration behind useDictaOpenRouterRuntime', () => {
    const boundary = readFileSync('src/app/useDictaOpenRouterRuntime.ts', 'utf8');
    const runtime = readFileSync('src/app/DictaAppRuntime.tsx', 'utf8');

    expect(boundary).toContain('export function useDictaOpenRouterRuntime');
    expect(boundary).toContain('useOnlineStatus');
    expect(boundary).toContain('useOpenRouterErrorSessionActions');
    expect(boundary).toContain('useOpenRouterGeneratedScriptSettlement');
    expect(boundary).toContain('useOpenRouterJobsRuntime');
    expect(boundary).toContain('useOpenRouterGenerationRuntime');

    expect(runtime).toContain("import { useDictaOpenRouterRuntime } from './useDictaOpenRouterRuntime';");
    expect(runtime).not.toContain("import { useOnlineStatus } from './useOnlineStatus';");
    expect(runtime).not.toContain("import { useOpenRouterGenerationRuntime } from './useOpenRouterGenerationRuntime';");
    expect(runtime).not.toContain("import { useOpenRouterErrorSessionActions } from './useOpenRouterErrorSessionActions';");
    expect(runtime).not.toContain("import { useOpenRouterGeneratedScriptSettlement } from './useOpenRouterGeneratedScriptSettlement';");
    expect(runtime).not.toContain("import { useOpenRouterJobsRuntime } from './useOpenRouterJobsRuntime';");
  });
});
