import type { AdaptiveUserSystemReport } from './adaptiveUserSystemReportTypes';
import { asRecord } from './adaptiveUserSystemReportUtils';

export function buildCompactTechnicalDebugSummary(
  technicalDebugData: unknown,
  estimatedTechnicalDebugDataBytes: number | null,
): AdaptiveUserSystemReport['compactTechnicalDebugSummary'] {
  const debugRecord = asRecord(technicalDebugData);
  const recentTimeline = Array.isArray(debugRecord?.recentTimelinePoints) ? debugRecord.recentTimelinePoints : null;
  return {
    estimatedTechnicalDebugDataBytes,
    rawDebugIncluded: true,
    rawDebugLocation: 'technicalDebugData',
    debugTopLevelKeys: debugRecord ? Object.keys(debugRecord).sort() : [],
    recentTimelinePointCount: recentTimeline ? recentTimeline.length : null,
    note: 'Use the summarized sections above first. The raw technicalDebugData payload is intentionally kept at the end for deep debugging and backward compatibility.',
  };
}
