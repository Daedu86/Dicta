import { describe, expect, it } from 'vitest';
import type {
  AdaptiveTimelinePoint,
  InputLanguageBenchmarkMetrics,
  PhrasePlaybackEvent,
} from '../src/core/adaptive/types';
import {
  buildAdaptiveBenchmarkFeedbackPromptWithHumanFeedbackPayload,
  buildAdaptiveEventCounts,
  buildAdaptiveSessionFeedbackExportPayload,
} from '../src/app/adaptiveExportPackages';

const createBenchmarkProfile = (
  overrides: Partial<InputLanguageBenchmarkMetrics> = {},
): InputLanguageBenchmarkMetrics => ({
  inputMode: 'browser-tts',
  language: 'de',
  rollingWindowDays: 30,
  sessionCount: 2,
  sampleCount: 3,
  lastUpdatedAt: '2026-06-12T10:00:00.000Z',
  semanticFidelityScore: 82,
  controlFidelityScore: 79,
  learningEffectivenessScore: 76,
  flowStabilityScore: 74,
  sweetSpotScore: 80,
  averageAccuracy: 86,
  averageWpm: 42,
  averageLagSec: 0.8,
  rawAverageLagSec: 0.9,
  stableAverageLagSec: 0.7,
  medianLagSec: 0.6,
  p75LagSec: 1.1,
  p90AbsLagSec: 1.8,
  lagOutlierCount: 0,
  averageCorrectionRate: 0.03,
  semanticCutPenalty: 0,
  unsafePauseCount: 0,
  safePauseCount: 3,
  deferredPauseCount: 1,
  replayDeniedByBoundaryCount: 0,
  averageSemanticCompleteness: 0.88,
  averagePhraseDifficulty: 0.42,
  preferredPlaybackRate: 0.95,
  preferredPhraseSize: 'medium',
  preferredPauseAfterPhraseMs: 900,
  recoveryScore: 72,
  timeToRecoveryMs: null,
  errorBurstLength: 1,
  modeSwitchFrequency: 0,
  rateVariance: 0.01,
  pauseVariance: 0.02,
  inputExecutionFidelityScore: 84,
  rateAccuracyBuckets: [],
  timeline: [],
  weakAreas: ['lag'],
  recommendation: {
    targetRateRange: [0.9, 1],
    targetPhraseSize: 'medium',
    targetPauseMs: 900,
    nextTrainingFocus: ['lag'],
    confidence: 0.7,
    summary: 'Keep the next session stable and focused on lag control.',
  },
  ...overrides,
});

const createTimelinePoint = (
  event: AdaptiveTimelinePoint['event'],
  timestampMs: number,
): AdaptiveTimelinePoint => ({
  timestampMs,
  inputMode: 'browser-tts',
  language: 'de',
  mode: 'balanced',
  playbackRate: 0.95,
  accuracy: 86,
  lagSec: 0.8,
  wpm: 42,
  pauseMs: 900,
  event,
});

const createPhraseEvent = (
  event: PhrasePlaybackEvent['event'],
  timestampMs: number,
): PhrasePlaybackEvent => ({
  sessionId: 'session-1',
  phraseId: `phrase-${timestampMs}`,
  phraseIndex: timestampMs,
  textPreview: 'Kurzer deutscher Übungssatz.',
  event,
  timestampMs,
  inputMode: 'browser-tts',
  language: 'de',
});

describe('buildAdaptiveEventCounts', () => {
  it('counts tracked timeline and phrase playback events together', () => {
    const counts = buildAdaptiveEventCounts(
      [
        createTimelinePoint('pause', 1),
        createTimelinePoint('support_entered', 2),
        createTimelinePoint('phrase_completed', 3),
        createTimelinePoint('replay', 4),
      ],
      [
        createPhraseEvent('phrase_started', 5),
        createPhraseEvent('phrase_completed', 6),
        createPhraseEvent('phrase_replayed', 7),
      ],
    );

    expect(counts.pause).toBe(1);
    expect(counts.support_entered).toBe(1);
    expect(counts.phrase_started).toBe(1);
    expect(counts.phrase_completed).toBe(2);
    expect(counts.rate_change).toBe(0);
    expect(counts.replay).toBeUndefined();
    expect(counts.phrase_replayed).toBeUndefined();
  });
});

describe('buildAdaptiveSessionFeedbackExportPayload', () => {
  it('includes fallback diagnostics when no formal session feedback is available', () => {
    const payload = buildAdaptiveSessionFeedbackExportPayload({
      sessions: [],
      profile: createBenchmarkProfile({
        timeline: [
          createTimelinePoint('pause', 1),
          createTimelinePoint('defer_pause', 2),
          createTimelinePoint('phrase_completed', 3),
        ],
      }),
      feedback: null,
      activeSessionStatus: undefined,
    }) as Record<string, unknown>;

    expect(payload.inputMode).toBe('browser-tts');
    expect(payload.language).toBe('de');
    expect(payload.latestSessionFeedback).toBeTruthy();
    expect(payload.fallbackPlaybackDiagnostics).toBeTruthy();
  });
});

describe('buildAdaptiveBenchmarkFeedbackPromptWithHumanFeedbackPayload', () => {
  it('adds trimmed human feedback and a generated LLM prompt to the benchmark package', () => {
    const payload = buildAdaptiveBenchmarkFeedbackPromptWithHumanFeedbackPayload({
      sessions: [],
      profile: createBenchmarkProfile(),
      feedback: null,
      activeSessionStatus: 'finished',
      humanFeedback: '  Please make the next script more focused on prepositions.  ',
    });

    expect(payload.inputMode).toBe('browser-tts');
    expect(payload.language).toBe('de');
    expect(payload.humanFeedback).toBe('Please make the next script more focused on prepositions.');
    expect(typeof payload.llmPrompt).toBe('string');
    const prompt = String(payload.llmPrompt);
    expect(prompt).toContain('dictation training script');
    expect(prompt).toContain('Return JSON that exactly follows this schema');
    expect(prompt).toContain('"phrases"');
  });
});
