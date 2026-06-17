import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const runtime = readFileSync('src/app/useOpenRouterDirectGenerationRuntime.ts', 'utf8');
const runner = readFileSync('src/app/useOpenRouterDirectGenerationRunner.ts', 'utf8');
const executor = readFileSync('src/app/openRouterDirectGenerationRunExecutor.ts', 'utf8');
const lifecycle = readFileSync('src/app/openRouterDirectGenerationRunLifecycle.ts', 'utf8');
const jobRunner = readFileSync('src/app/openRouterDirectGenerationJobRunner.ts', 'utf8');
const failureHandler = readFileSync('src/app/openRouterDirectGenerationFailureHandler.ts', 'utf8');

describe('OpenRouter direct generation runtime boundary', () => {
  it('keeps direct generation execution delegated through the runner hook', () => {
    expect(runtime).toContain("from './useOpenRouterDirectGenerationRunner';");
    expect(runtime).toContain("from './useOpenRouterDirectGenerationPresetActions';");
    expect(runtime).not.toContain('requestTrainingNotificationPermission');
    expect(runtime).not.toContain('perfDiagnostics');
    expect(runtime).not.toContain('buildOpenRouterDirectGenerationJobPlan');
    expect(runtime).not.toContain('buildOpenRouterDirectGenerationStartPlan');
    expect(runtime).not.toContain('requestOpenRouterGenerationJob');
    expect(runtime).not.toContain('resolveOpenRouterDirectGenerationFailure');

    expect(runner).toContain('export function useOpenRouterDirectGenerationRunner');
    expect(runner).toContain("from './openRouterDirectGenerationRunExecutor';");
    expect(runner).toContain('runOpenRouterDirectGeneration({');
    expect(runner).not.toContain('buildOpenRouterDirectGenerationStartPlan');
    expect(runner).not.toContain('startOpenRouterDirectGenerationRun');
    expect(runner).not.toContain('runOpenRouterDirectGenerationJobRequest');
    expect(runner).not.toContain('handleOpenRouterDirectGenerationFailure');

    expect(executor).toContain('export async function runOpenRouterDirectGeneration');
    expect(executor).toContain('buildOpenRouterDirectGenerationStartPlan');
    expect(executor).toContain('startOpenRouterDirectGenerationRun');
    expect(executor).toContain('runOpenRouterDirectGenerationJobRequest');
    expect(executor).toContain('handleOpenRouterDirectGenerationFailure');
    expect(executor).toContain('createOpenRouterErrorSession');
  });

  it('keeps OpenRouter direct generation side effects inside focused seams', () => {
    expect(lifecycle).toContain('requestTrainingNotificationPermission');
    expect(lifecycle).toContain('perfDiagnostics.startSpan');
    expect(jobRunner).toContain('buildOpenRouterDirectGenerationJobPlan');
    expect(jobRunner).toContain('requestOpenRouterGenerationJob');
    expect(failureHandler).toContain('resolveOpenRouterDirectGenerationFailure');
    expect(failureHandler).toContain('createOpenRouterErrorSession');
  });
});
