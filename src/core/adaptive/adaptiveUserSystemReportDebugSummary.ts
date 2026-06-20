import type { AdaptiveUserSystemReport } from './adaptiveUserSystemReportTypes';
import { asRecord } from './adaptiveUserSystemReportUtils';

const TECHNICAL_DEBUG_RECENT_TIMELINE_LIMIT = 12;

const BENCHMARK_PROFILE_COMPACT_KEYS = [
  'inputMode',
  'language',
  'sessionCount',
  'sampleCount',
  'benchmarkSessionCount',
  'acceptedTelemetrySamples',
  'countSemantics',
  'lastUpdatedAt',
  'sweetSpotScore',
  'semanticFidelityScore',
  'controlFidelityScore',
  'learningEffectivenessScore',
  'flowStabilityScore',
  'averageAccuracy',
  'averageWpm',
  'averageLagSec',
  'weakAreas',
  'recommendation',
  'environmentChanged',
] as const;

const TIMELINE_POINT_COMPACT_KEYS = [
  'timestampMs',
  'sessionId',
  'phraseId',
  'phraseIndex',
  'event',
  'mode',
  'trend',
  'accuracy',
  'wpm',
  'lagSec',
  'rawLagSec',
  'stableLagSec',
  'playbackRate',
  'requestedPlaybackRate',
  'actualPlaybackRate',
  'pauseMs',
  'requestedPauseMs',
  'actualPauseMs',
  'phraseBoundaryType',
  'semanticCompleteness',
  'adaptiveLevel',
  'adaptiveDirection',
  'derivedAdaptiveLabel',
  'decisionReason',
  'acceptedForBenchmark',
  'benchmarkRejectionReason',
  'acceptedForSessionInsight',
  'acceptedForRuntimePressure',
  'acceptedForTelemetryLearning',
  'replayExecuted',
  'ttsEnvironmentId',
  'unsafeChunkCount',
  'perceptualPauseShortfallMs',
] as const;

const PACING_OUTPUT_COMPACT_KEYS = [
  'pauseMsTarget',
  'replaySupport',
  'targetWpmRange',
  'phraseSizeTarget',
  'boundaryStrictness',
  'playbackRateTarget',
  'perceptualRateLevel',
  'perceptualPauseLevel',
] as const;

const SAMPLE_QUALITY_COMPACT_KEYS = [
  'lagReliability',
  'rejectionReason',
  'confidenceWeight',
  'acceptedForBenchmark',
  'acceptedForSessionInsight',
  'acceptedForRuntimePressure',
  'acceptedForTelemetryLearning',
] as const;

const PRESSURE_VECTOR_COMPACT_KEYS = [
  'lag',
  'typing',
  'accuracy',
  'boundary',
  'correction',
  'environment',
  'semanticLoad',
  'currentSession',
  'reconstruction',
  'perceptualPause',
] as const;

const TTS_ENVIRONMENT_COMPACT_KEYS = [
  'engine',
  'platform',
  'voiceURI',
  'voiceLang',
  'voiceName',
  'localService',
  'standalonePwa',
  'availableVoiceCount',
  'matchingVoiceCount',
  'browserUserAgentHash',
] as const;

export function compactTechnicalDebugData(technicalDebugData: unknown): unknown {
  const debugRecord = asRecord(technicalDebugData);
  if (!debugRecord) return technicalDebugData;

  const compact: Record<string, unknown> = { ...debugRecord };
  const recentTimeline = Array.isArray(debugRecord.recentTimelinePoints) ? debugRecord.recentTimelinePoints : null;
  const benchmarkProfile = asRecord(debugRecord.benchmarkProfile);
  let compacted = false;

  if (recentTimeline) {
    const retainedTimeline = recentTimeline.slice(-TECHNICAL_DEBUG_RECENT_TIMELINE_LIMIT).map(compactTimelinePoint);
    compact.recentTimelinePoints = retainedTimeline;
    compact.recentTimelinePointCount = recentTimeline.length;
    compact.recentTimelineOmittedCount = Math.max(0, recentTimeline.length - retainedTimeline.length);
    compacted = true;
  }

  if (benchmarkProfile) {
    compact.benchmarkProfile = compactBenchmarkProfile(benchmarkProfile);
    compacted = true;
  }

  if (!compacted) return technicalDebugData;

  compact.debugCompaction = {
    recentTimelinePointLimit: TECHNICAL_DEBUG_RECENT_TIMELINE_LIMIT,
    originalRecentTimelinePointCount: recentTimeline ? recentTimeline.length : null,
    retainedRecentTimelinePointCount: recentTimeline
      ? Math.min(recentTimeline.length, TECHNICAL_DEBUG_RECENT_TIMELINE_LIMIT)
      : null,
    benchmarkProfileCompacted: Boolean(benchmarkProfile),
    note: 'technicalDebugData is compacted for report export; summarized diagnostics above are canonical for UI.',
  };

  return compact;
}

export function buildCompactTechnicalDebugSummary(
  technicalDebugData: unknown,
  estimatedTechnicalDebugDataBytes: number | null,
): AdaptiveUserSystemReport['compactTechnicalDebugSummary'] {
  const debugRecord = asRecord(technicalDebugData);
  const recentTimeline = Array.isArray(debugRecord?.recentTimelinePoints) ? debugRecord.recentTimelinePoints : null;
  return {
    estimatedTechnicalDebugDataBytes,
    rawDebugIncluded: false,
    rawDebugLocation: 'technicalDebugData',
    debugTopLevelKeys: debugRecord ? Object.keys(debugRecord).sort() : [],
    recentTimelinePointCount: recentTimeline ? recentTimeline.length : null,
    note: 'Use the summarized sections above first. technicalDebugData is compacted for report export and keeps only the most recent timeline points plus benchmark essentials.',
  };
}

function compactBenchmarkProfile(benchmarkProfile: Record<string, unknown>): Record<string, unknown> {
  const compact = pickKnown(benchmarkProfile, BENCHMARK_PROFILE_COMPACT_KEYS);
  const ttsEnvironment = asRecord(benchmarkProfile.ttsEnvironment);
  const environmentHistory = Array.isArray(benchmarkProfile.ttsEnvironmentHistory)
    ? benchmarkProfile.ttsEnvironmentHistory
    : null;

  if (ttsEnvironment) {
    compact.ttsEnvironment = compactTtsEnvironment(ttsEnvironment);
  }

  if (environmentHistory) {
    compact.ttsEnvironmentHistorySummary = {
      count: environmentHistory.length,
      recent: environmentHistory.slice(-5).map(compactTtsEnvironmentHistoryEntry),
    };
  }

  return compact;
}

function compactTimelinePoint(point: unknown): unknown {
  const pointRecord = asRecord(point);
  if (!pointRecord) return point;

  const compact = pickKnown(pointRecord, TIMELINE_POINT_COMPACT_KEYS);
  const pacingOutput = asRecord(pointRecord.pacingOutput);
  const sampleQuality = asRecord(pointRecord.sampleQuality);
  const pressureVector = asRecord(pointRecord.pressureVector);

  if (pacingOutput) {
    compact.pacingOutput = pickKnown(pacingOutput, PACING_OUTPUT_COMPACT_KEYS);
  }

  if (sampleQuality) {
    compact.sampleQuality = pickKnown(sampleQuality, SAMPLE_QUALITY_COMPACT_KEYS);
  }

  if (pressureVector) {
    compact.pressureVector = pickKnown(pressureVector, PRESSURE_VECTOR_COMPACT_KEYS);
  }

  return compact;
}

function compactTtsEnvironmentHistoryEntry(entry: unknown): unknown {
  const entryRecord = asRecord(entry);
  if (!entryRecord) return entry;

  const compact = pickKnown(entryRecord, ['environmentId', 'firstSeenAt', 'lastSeenAt', 'sampleCount', 'sessionCount']);
  const ttsEnvironment = asRecord(entryRecord.ttsEnvironment);
  if (ttsEnvironment) compact.ttsEnvironment = compactTtsEnvironment(ttsEnvironment);
  return compact;
}

function compactTtsEnvironment(ttsEnvironment: Record<string, unknown>): Record<string, unknown> {
  return pickKnown(ttsEnvironment, TTS_ENVIRONMENT_COMPACT_KEYS);
}

function pickKnown(record: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    if (record[key] !== undefined) picked[key] = record[key];
  }
  return picked;
}
