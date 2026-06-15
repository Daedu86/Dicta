import type { OpenRouterWorkspaceProps } from './types';
import type { OpenRouterWorkspaceRuntime } from './openRouterWorkspaceRuntimeTypes';

export type OpenRouterBenchmarkExportGroupProps = {
  workspace: OpenRouterWorkspaceProps;
  runtime: OpenRouterWorkspaceRuntime;
};

export function OpenRouterBenchmarkExportGroup({ workspace, runtime }: OpenRouterBenchmarkExportGroupProps) {
  const { exportProfile, onCopyBenchmark, onExportBenchmark } = workspace;
  const { copyToClipboard, exportPayloads, formatPromptSizeHint } = runtime;

  return (
    <div>
      <p className="dashboard-eyebrow">Benchmark JSON</p>
      <div className="admin-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => onCopyBenchmark(exportProfile)}
          title={`Copies benchmark JSON to clipboard.
${formatPromptSizeHint(exportPayloads.benchmarkJson)}`}
        >
          Copy Benchmark JSON
        </button>
        <button
          type="button"
          className="secondary-button compact-button"
          onClick={() => void copyToClipboard('Benchmark JSON (compact)', exportPayloads.compactBenchmark)}
          title={`Compact version: benchmark summary only (no timeline / large arrays).
${formatPromptSizeHint(exportPayloads.compactBenchmark)}`}
        >
          Copy
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => onExportBenchmark(exportProfile)}
          title={`Downloads benchmark JSON.
${formatPromptSizeHint(exportPayloads.benchmarkJson)}`}
        >
          Export Benchmark JSON
        </button>
        <button
          type="button"
          className="secondary-button compact-button"
          onClick={() => void copyToClipboard('Benchmark JSON (compact)', exportPayloads.compactBenchmark)}
          title={`Compact version: copies benchmark summary JSON (clipboard).
${formatPromptSizeHint(exportPayloads.compactBenchmark)}`}
        >
          Export
        </button>
      </div>
    </div>
  );
}
