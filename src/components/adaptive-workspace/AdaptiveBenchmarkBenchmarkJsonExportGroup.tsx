import { AdaptiveBenchmarkExportButton } from './AdaptiveBenchmarkExportButton';
import type { AdaptiveBenchmarkExportSectionProps } from './AdaptiveBenchmarkExportPanelTypes';

export function AdaptiveBenchmarkBenchmarkJsonExportGroup({
  profile,
  exportPayloads,
  copyToClipboard,
  formatPromptSizeHint,
  onCopyBenchmark,
  onExportBenchmark,
}: Pick<
  AdaptiveBenchmarkExportSectionProps,
  'profile' | 'exportPayloads' | 'copyToClipboard' | 'formatPromptSizeHint' | 'onCopyBenchmark' | 'onExportBenchmark'
>) {
  return (
    <div>
      <p className="dashboard-eyebrow">Benchmark JSON</p>
      <div className="admin-actions">
        <AdaptiveBenchmarkExportButton
          onClick={() => onCopyBenchmark(profile)}
          title={`Copy the selected benchmark profile JSON to your clipboard (KPIs, recommendation, weak areas, and recent timeline points).\n${formatPromptSizeHint(exportPayloads.benchmarkJson)}`}
        >
          Copy Benchmark JSON
        </AdaptiveBenchmarkExportButton>
        <AdaptiveBenchmarkExportButton
          compact
          onClick={() => void copyToClipboard('Benchmark JSON (compact)', exportPayloads.compactBenchmark)}
          title={`Compact version: benchmark summary only (no timeline / large arrays).\n${formatPromptSizeHint(exportPayloads.compactBenchmark)}`}
        >
          Copy
        </AdaptiveBenchmarkExportButton>
        <AdaptiveBenchmarkExportButton
          onClick={() => onExportBenchmark(profile)}
          title={`Download the selected benchmark profile JSON as a .json file (same content as Copy Benchmark JSON).\n${formatPromptSizeHint(exportPayloads.benchmarkJson)}`}
        >
          Export Benchmark JSON
        </AdaptiveBenchmarkExportButton>
        <AdaptiveBenchmarkExportButton
          compact
          onClick={() => void copyToClipboard('Benchmark JSON (compact)', exportPayloads.compactBenchmark)}
          title={`Compact version: copies benchmark summary JSON (clipboard).\n${formatPromptSizeHint(exportPayloads.compactBenchmark)}`}
        >
          Export
        </AdaptiveBenchmarkExportButton>
      </div>
    </div>
  );
}
