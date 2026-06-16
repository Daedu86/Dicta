import { AdaptiveBenchmarkBenchmarkJsonExportGroup } from './AdaptiveBenchmarkBenchmarkJsonExportGroup';
import { AdaptiveBenchmarkDiagnosticsExportGroup } from './AdaptiveBenchmarkDiagnosticsExportGroup';
import { AdaptiveBenchmarkPrimaryExportGroup } from './AdaptiveBenchmarkPrimaryExportGroup';
import { AdaptiveBenchmarkTemplatesExportGroup } from './AdaptiveBenchmarkTemplatesExportGroup';
import type { AdaptiveBenchmarkExportSectionProps } from './AdaptiveBenchmarkExportPanelTypes';

export function AdaptiveBenchmarkExportGroups(props: AdaptiveBenchmarkExportSectionProps) {
  return (
    <div className="adaptive-export-groups">
      <AdaptiveBenchmarkBenchmarkJsonExportGroup {...props} />
      <AdaptiveBenchmarkPrimaryExportGroup {...props} />
      <AdaptiveBenchmarkDiagnosticsExportGroup {...props} />
      <AdaptiveBenchmarkTemplatesExportGroup {...props} />
    </div>
  );
}
