import type { BrowserTtsEnvironmentFingerprint } from '../types/dictation';
import type { PacingDecision, PhraseBoundaryType, PhraseSize, LiveTelemetryFrame, InputExecutionTelemetry } from '../core/adaptive/types';
import type { BrowserTtsPlaybackPlan } from './browserTtsPlaybackPlan';

export type BrowserTtsDecisionTraceEvent = 'chunk_planned' | 'chunk_committed' | 'chunk_started' | 'chunk_completed' | 'chunk_error' | 'benchmark_recorded';
export type BrowserTtsDecisionTraceBenchmarkStatus = 'accepted' | 'rejected' | 'not_applicable' | 'unknown';

export type BrowserTtsDecisionTrace = {
  traceId: string;
  sessionId?: string;
  language: string;
  chunkIndex: number;
  phraseId?: string;
  phraseIndex?: number;
  totalSemanticPhrases?: number;
  event: BrowserTtsDecisionTraceEvent;
  timestampMs: number;
  candidateText: string;
  chunkText: string;
  startWordIndex: number;
  wordCount: number;
  controllerInput: LiveTelemetryFrame;
  rawDecision: PacingDecision;
  clampedDecision: PacingDecision;
  runtimeDecision: PacingDecision;
  plannedPhraseSize: PhraseSize;
  appliedPhraseSize: PhraseSize;
  plannedBoundaryStrictness?: string;
  appliedBoundaryType?: PhraseBoundaryType;
  requestedPlaybackRate: number;
  actualPlaybackRate: number;
  requestedPauseMs: number;
  actualPauseMs: number;
  replayExecuted: boolean;
  unsafeBoundaryApplied: boolean;
  mobileFallbackApplied: boolean;
  germanShortBias: boolean;
  recoverySafeBoundary: boolean;
  browserVoiceURI?: string | null;
  browserVoiceName?: string | null;
  browserVoiceLang?: string | null;
  ttsEnvironment?: BrowserTtsEnvironmentFingerprint | null;
  rawLagSec?: number;
  stableLagSec?: number;
  lagSec?: number;
  accuracy?: number;
  wpm?: number;
  benchmarkStatus: BrowserTtsDecisionTraceBenchmarkStatus;
  benchmarkRejectionReason?: string | null;
  executionHint?: string;
  decisionReason?: string;
};

export function buildBrowserTtsDecisionTrace(args: {
  event: BrowserTtsDecisionTraceEvent;
  playbackPlan: BrowserTtsPlaybackPlan;
  language: string;
  chunkIndex: number;
  phraseIndex?: number;
  totalSemanticPhrases?: number;
  sessionId?: string;
  browserVoice?: SpeechSynthesisVoice | null;
  ttsEnvironment?: BrowserTtsEnvironmentFingerprint | null;
  execution?: InputExecutionTelemetry;
  benchmarkStatus?: BrowserTtsDecisionTraceBenchmarkStatus;
  benchmarkRejectionReason?: string | null;
  timestampMs?: number;
}): BrowserTtsDecisionTrace {
  const { playbackPlan } = args;
  const execution = args.execution ?? {};
  const timestampMs = args.timestampMs ?? Date.now();
  return {
    traceId: `${args.sessionId ?? 'sessionless'}:${args.language}:${args.chunkIndex}:${args.event}:${timestampMs}`,
    sessionId: args.sessionId,
    language: args.language,
    chunkIndex: args.chunkIndex,
    phraseIndex: args.phraseIndex,
    totalSemanticPhrases: args.totalSemanticPhrases,
    event: args.event,
    timestampMs,
    candidateText: playbackPlan.chunk.text,
    chunkText: playbackPlan.chunk.text,
    startWordIndex: playbackPlan.chunk.startWordIndex,
    wordCount: playbackPlan.chunk.wordCount,
    controllerInput: playbackPlan.browserTelemetry,
    rawDecision: playbackPlan.rawDecision,
    clampedDecision: playbackPlan.decision,
    runtimeDecision: playbackPlan.runtimeDecision,
    plannedPhraseSize: playbackPlan.decision.nextPhraseSize,
    appliedPhraseSize: playbackPlan.runtimeDecision.nextPhraseSize,
    plannedBoundaryStrictness: playbackPlan.decision.boundaryStrictness,
    appliedBoundaryType: playbackPlan.chunk.phraseBoundaryType,
    requestedPlaybackRate: execution.requestedPlaybackRate ?? playbackPlan.decision.playbackRate,
    actualPlaybackRate: execution.actualPlaybackRate ?? playbackPlan.rate,
    requestedPauseMs: execution.requestedPauseMs ?? playbackPlan.decision.pauseAfterPhraseMs,
    actualPauseMs: execution.actualPauseMs ?? playbackPlan.pauseBeforeNextChunkMs,
    replayExecuted: execution.replayExecuted ?? playbackPlan.effectiveReplay,
    unsafeBoundaryApplied: playbackPlan.unsafeBoundaryApplied,
    mobileFallbackApplied: playbackPlan.mobileFallbackApplied,
    germanShortBias: playbackPlan.germanShortBias,
    recoverySafeBoundary: playbackPlan.recoverySafeBoundary,
    browserVoiceURI: args.browserVoice?.voiceURI ?? null,
    browserVoiceName: args.browserVoice?.name ?? null,
    browserVoiceLang: args.browserVoice?.lang ?? null,
    ttsEnvironment: args.ttsEnvironment ?? null,
    rawLagSec: playbackPlan.chunkTelemetry.rawLagSec,
    stableLagSec: playbackPlan.chunkTelemetry.stableLagSec,
    lagSec: playbackPlan.chunkTelemetry.lagSec,
    accuracy: playbackPlan.chunkTelemetry.accuracy,
    wpm: playbackPlan.chunkTelemetry.wpm,
    benchmarkStatus: args.benchmarkStatus ?? 'unknown',
    benchmarkRejectionReason: args.benchmarkRejectionReason ?? null,
    executionHint: playbackPlan.decision.executionHint,
    decisionReason: playbackPlan.decision.reason,
  };
}
