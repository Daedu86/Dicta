import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Dicta OpenRouter runtime boundary', () => {
  it('keeps app OpenRouter orchestration behind useDictaOpenRouterRuntime', () => {
    const boundary = readFileSync('src/app/useDictaOpenRouterRuntime.ts', 'utf8');
    const runtime = readFileSync('src/app/DictaAppRuntime.tsx', 'utf8');

    expect(boundary).toContain('export function useDictaOpenRouterRuntime');
    expect(boundary).toContain("import { useOnlineStatus } from './useOnlineStatus';");
    expect(boundary).toContain("import { useOpenRouterGenerationRuntime } from './useOpenRouterGenerationRuntime';");
    expect(boundary).toContain("from './useDictaOpenRouterJobsRuntime';");
    expect(boundary).not.toContain("import { useOpenRouterErrorSessionActions } from './useOpenRouterErrorSessionActions';");
    expect(boundary).not.toContain("import { useOpenRouterGeneratedScriptSettlement } from './useOpenRouterGeneratedScriptSettlement';");
    expect(boundary).not.toContain("import { useOpenRouterJobsRuntime } from './useOpenRouterJobsRuntime';");

    expect(runtime).toContain("import { useDictaOpenRouterRuntime } from './useDictaOpenRouterRuntime';");
    expect(runtime).not.toContain("import { useOnlineStatus } from './useOnlineStatus';");
    expect(runtime).not.toContain("import { useOpenRouterGenerationRuntime } from './useOpenRouterGenerationRuntime';");
    expect(runtime).not.toContain("import { useOpenRouterErrorSessionActions } from './useOpenRouterErrorSessionActions';");
    expect(runtime).not.toContain("import { useOpenRouterGeneratedScriptSettlement } from './useOpenRouterGeneratedScriptSettlement';");
    expect(runtime).not.toContain("import { useOpenRouterJobsRuntime } from './useOpenRouterJobsRuntime';");
  });

  it('keeps job orchestration behind useDictaOpenRouterJobsRuntime', () => {
    const jobsBoundary = readFileSync('src/app/useDictaOpenRouterJobsRuntime.ts', 'utf8');

    expect(jobsBoundary).toContain('export function useDictaOpenRouterJobsRuntime');
    expect(jobsBoundary).toContain("import { useOpenRouterErrorSessionActions } from './useOpenRouterErrorSessionActions';");
    expect(jobsBoundary).toContain("import { useOpenRouterGeneratedScriptSettlement } from './useOpenRouterGeneratedScriptSettlement';");
    expect(jobsBoundary).toContain("import { useOpenRouterJobsRuntime } from './useOpenRouterJobsRuntime';");
    expect(jobsBoundary).toContain('onCreateGenerationErrorSession: createCustomOpenRouterErrorSessionForJob');
    expect(jobsBoundary).toContain('onGeneratedScript: settleOpenRouterGeneratedScript');
    expect(jobsBoundary).toContain('resetOpenRouterJobsRuntimeRef.current = jobsRuntime.resetOpenRouterJobsRuntime;');
  });
});
