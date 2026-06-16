import type { AdaptiveTimelinePoint } from './types';

export type BenchmarkRejectedSampleDiagnostics = {
  totalSamples: number;
  acceptedSamples: number;
  rejectedSamples: number;
  rejectionReasons: Record<string, number>;
  unsafeBoundaryCount: number;
  rawLagOutOfRangeCount: number;
  eventNotScoringCount: number;
  wpmInvalidCount: number;
};

export function summarizeBenchmarkRejectedSamples(timeline: AdaptiveTimelinePoint[]): BenchmarkRejectedSampleDiagnostics {
  const summary: BenchmarkRejectedSampleDiagnostics = {
    totalSamples: timeline.length,
    acceptedSamples: 0,
    rejectedSamples: 0,
    rejectionReasons: {},
    unsafeBoundaryCount: 0,
    rawLagOutOfRangeCount: 0,
    eventNotScoringCount: 0,
    wpmInvalidCount: 0,
  };
  for (const point of timeline) {
    const reason = point.benchmarkRejectionReason;
    if (!reason) {
      summary.acceptedSamples += 1;
      continue;
    }
    summary.rejectedSamples += 1;
    summary.rejectionReasons[reason] = (summary.rejectionReasons[reason] ?? 0) + 1;
    if (reason === 'unsafe_phrase_boundary') summary.unsafeBoundaryCount += 1;
    if (reason === 'rawLagSec_out_of_range') summary.rawLagOutOfRangeCount += 1;
    if (reason === 'event_not_scoring') summary.eventNotScoringCount += 1;
    if (reason === 'wpm_not_positive_or_placeholder') summary.wpmInvalidCount += 1;
  }
  return summary;
}
