import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('OpenRouter direct generation runtime boundary', () => {
  it('keeps direct generation execution inside the runner hook', () => {
    const runtime = readFileSync('src/app/useOpenRouterDirectGenerationRuntime.ts', 'utf8');
    const runner = readFileSync('src/app/useOpenRouterDirectGenerationRunner.ts', 'utf8');

    expect(runtime).toContain("from './useOpenRouterDirectGenerationRunner';");
    expect(runtime).toContain("from './useOpenRouterDirectGenerationPresetActions';");
    expect(runtime).not.toContain('requestTrainingNotificationPermission');
    expect(runtime).not.toContain('perfDiagnostics');
    expect(runtime).not.toContain('buildOpenRouterDirectGenerationJobPlan');
    expect(runtime).not.toContain('buildOpenRouterDirectGenerationStartPlan');
    expect(runtime).not.toContain('requestOpenRouterGenerationJob');
    expect(runtime).not.toContain('resolveOpenRouterDirectGenerationFailure');

    expect(runner).toContain('export function useOpenRouterDirectGenerationRunner');
    expect(runner).toContain('requestTrainingNotificationPermission');
    expect(runner).toContain('perfDiagnostics.startSpan');
    expect(runner).toContain('buildOpenRouterDirectGenerationJobPlan');
    expect(runner).toContain('buildOpenRouterDirectGenerationStartPlan');
    expect(runner).toContain('requestOpenRouterGenerationJob');
    expect(runner).toContain('resolveOpenRouterDirectGenerationFailure');
    expect(runner).toContain('createOpenRouterErrorSession');
  });
});
