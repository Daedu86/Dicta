import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('OpenRouter direct generation preset actions boundary', () => {
  it('keeps direct generation preset wiring outside the direct generation runtime', () => {
    const runtime = readFileSync('src/app/useOpenRouterDirectGenerationRuntime.ts', 'utf8');
    const presetActions = readFileSync('src/app/useOpenRouterDirectGenerationPresetActions.ts', 'utf8');

    expect(runtime).toContain("import { useOpenRouterDirectGenerationPresetActions } from './useOpenRouterDirectGenerationPresetActions';");
    expect(runtime).not.toContain('OPEN_ROUTER_DIRECT_GENERATION_PRESETS');
    expect(runtime).not.toContain('const generateEasyNextSessionFromOpenRouter = useCallback');
    expect(runtime).not.toContain('const generateIntermediateNextSessionFromOpenRouter = useCallback');
    expect(runtime).not.toContain('const generateAdvancedNextSessionFromOpenRouter = useCallback');

    expect(presetActions).toContain('export function useOpenRouterDirectGenerationPresetActions');
    expect(presetActions).toContain('OPEN_ROUTER_DIRECT_GENERATION_PRESETS.easy');
    expect(presetActions).toContain('OPEN_ROUTER_DIRECT_GENERATION_PRESETS.medium');
    expect(presetActions).toContain('OPEN_ROUTER_DIRECT_GENERATION_PRESETS.hard');
    expect(presetActions).toContain('generateEasyNextSessionFromOpenRouter');
    expect(presetActions).toContain('generateIntermediateNextSessionFromOpenRouter');
    expect(presetActions).toContain('generateAdvancedNextSessionFromOpenRouter');
  });
});
