import type {
  AdaptiveTimelinePoint,
  InputLanguageBenchmarkMetrics,
  LiveTelemetryFrame,
  PacingDecision,
} from './types';
import type { BrowserTtsEnvironmentBenchmarkState } from './inputLanguageBenchmarkEnvironment';
import type { InputLanguageBenchmarkScoringState } from './inputLanguageBenchmarkScoringState';
import { buildBenchmarkSnapshotBase } from './inputLanguageBenchmarkSnapshotBase';

export {
  applyScoredBenchmarkDerivedMetrics,
  preserveUnscoredBenchmarkScoreState,
} from './inputLanguageBenchmarkDerivedMetrics';

export function buildNextInputLanguageBenchmarkSnapshot({
  current,
  live,
  decision,
  timestampMs,
  timeline,
  environmentState,
  scoringState,
  semanticCompleteness,
  phraseDifficulty,
  executionFidelity,
}: {
  current: InputLanguageBenchmarkMetrics;
  live: LiveTelemetryFrame;
  decision: PacingDecision;
  timestampMs: number;
  timeline: AdaptiveTimelinePoint[];
  environmentState: BrowserTtsEnvironmentBenchmarkState;
  scoringState: InputLanguageBenchmarkScoringState;
  semanticCompleteness: number;
  phraseDifficulty: number;
  executionFidelity: number;
}): InputLanguageBenchmarkMetrics {
  return buildBenchmarkSnapshotBase({
    current,
    live,
    decision,
    timestampMs,
    timeline,
    environmentState,
    scoringState,
    semanticCompleteness,
    phraseDifficulty,
    executionFidelity,
  });
}
