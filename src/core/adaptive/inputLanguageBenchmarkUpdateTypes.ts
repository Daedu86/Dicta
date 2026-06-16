import type {
  AdaptiveTimelinePoint,
  InputExecutionTelemetry,
  InputLanguageBenchmarkMetrics,
  LiveTelemetryFrame,
  PacingDecision,
} from './types';
import type { BrowserTtsEnvironmentFingerprint } from '../../types/dictation';

export type InputLanguageBenchmarkUpdateArgs = {
  current?: InputLanguageBenchmarkMetrics | null;
  live: LiveTelemetryFrame;
  decision: PacingDecision;
  execution?: InputExecutionTelemetry;
  timestampMs?: number;
  sessionId?: string;
  ttsEnvironment?: BrowserTtsEnvironmentFingerprint | null;
  phraseIndex?: number;
  totalSemanticPhrases?: number;
  event?: AdaptiveTimelinePoint['event'];
  decisionTraceId?: string;
  benchmarkRejectionReason?: string | null;
  requestedPlaybackRate?: number;
  actualPlaybackRate?: number;
  requestedPauseMs?: number;
  actualPauseMs?: number;
  replayExecuted?: boolean;
  unsafeBoundaryApplied?: boolean;
  mobileFallbackApplied?: boolean;
  recoverySafeBoundary?: boolean;
  germanShortBias?: boolean;
};
