import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Adaptive benchmark cockpit boundary', () => {
  it('keeps AdaptiveBenchmarkCockpit as a thin shell around the extracted view', () => {
    const shell = readFileSync('src/components/adaptive-workspace/AdaptiveBenchmarkCockpit.tsx', 'utf8');
    const view = readFileSync('src/components/adaptive-workspace/AdaptiveBenchmarkCockpitView.tsx', 'utf8');

    expect(shell.trim()).toBe("export { AdaptiveBenchmarkCockpit } from './AdaptiveBenchmarkCockpitView';");
    expect(shell).not.toContain('useAdaptiveBenchmarkCockpitRuntime');
    expect(shell).not.toContain('adaptive-export-copy-actions');
    expect(shell).not.toContain('adaptive-session-feedback-panel');
    expect(shell).not.toContain('adaptive-benchmark-timeline');

    expect(view).toContain('export function AdaptiveBenchmarkCockpit');
    expect(view).toContain('useAdaptiveBenchmarkCockpitRuntime');
    expect(view).toContain('adaptive-export-copy-actions');
    expect(view).toContain('adaptive-session-feedback-panel');
    expect(view).toContain('adaptive-benchmark-timeline');
  });
});
