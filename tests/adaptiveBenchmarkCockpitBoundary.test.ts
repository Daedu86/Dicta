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
    expect(view).toContain('AdaptiveBenchmarkExportPanel');
    expect(view).toContain('adaptive-session-feedback-panel');
    expect(view).toContain('adaptive-benchmark-timeline');
  });

  it('keeps advanced export actions behind AdaptiveBenchmarkExportPanel and its extracted groups', () => {
    const view = readFileSync('src/components/adaptive-workspace/AdaptiveBenchmarkCockpitView.tsx', 'utf8');
    const exportPanel = readFileSync('src/components/adaptive-workspace/AdaptiveBenchmarkExportPanel.tsx', 'utf8');
    const benchmarkJsonGroup = readFileSync(
      'src/components/adaptive-workspace/AdaptiveBenchmarkBenchmarkJsonExportGroup.tsx',
      'utf8',
    );
    const primaryExportGroup = readFileSync(
      'src/components/adaptive-workspace/AdaptiveBenchmarkPrimaryExportGroup.tsx',
      'utf8',
    );
    const humanFeedbackEditor = readFileSync(
      'src/components/adaptive-workspace/AdaptiveBenchmarkHumanFeedbackEditor.tsx',
      'utf8',
    );

    expect(view).toContain("import { AdaptiveBenchmarkExportPanel } from './AdaptiveBenchmarkExportPanel';");
    expect(view).not.toContain('id="adaptive-export-copy-actions"');
    expect(view).not.toContain('Copy Benchmark JSON');
    expect(view).not.toContain('Copy next adaptive script prompt');
    expect(view).not.toContain('adaptive-human-feedback-editor');

    expect(exportPanel).toContain('export function AdaptiveBenchmarkExportPanel');
    expect(exportPanel).toContain('AdaptiveBenchmarkExportGroups');
    expect(exportPanel).toContain('AdaptiveBenchmarkHumanFeedbackEditor');
    expect(exportPanel).toContain('id="adaptive-export-copy-actions"');
    expect(benchmarkJsonGroup).toContain('Copy Benchmark JSON');
    expect(primaryExportGroup).toContain('Copy next adaptive script prompt');
    expect(humanFeedbackEditor).toContain('adaptive-human-feedback-editor');
  });
});
