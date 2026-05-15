import { describe, expect, it } from 'vitest';
import {
  buildAdaptiveSessionFeedback,
  buildBenchmarkFeedbackPackage,
  computeImprovementDelta,
  derivePlaybackDiagnosticsFromTimeline,
  detectPlaybackIssues,
} from '../src/core/adaptive/sessionFeedback';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type { PhrasePlaybackEvent } from '../src/core/adaptive/types';
import type { AdaptiveTimelinePoint } from '../src/core/adaptive/types';

function phraseEvent(
  phraseIndex: number,
  phraseId: string,
  event: PhrasePlaybackEvent['event'],
  timestampMs: number,
): PhrasePlaybackEvent {
  return {
    sessionId: 'session-1',
    phraseId,
    phraseIndex,
    textPreview: `Phrase ${phraseIndex}`,
    event,
    timestampMs,
    inputMode: 'kokoro',
    language: 'en',
  };
}

describe('session feedback diagnostics', () => {
  it('counts repeated phrase starts and detects a max repeat count of 4', () => {
    const events: PhrasePlaybackEvent[] = [
      phraseEvent(7, 'p07', 'phrase_started', 1),
      phraseEvent(7, 'p07', 'phrase_replayed', 2),
      phraseEvent(7, 'p07', 'phrase_started', 3),
      phraseEvent(7, 'p07', 'phrase_replayed', 4),
      phraseEvent(7, 'p07', 'phrase_started', 5),
      phraseEvent(7, 'p07', 'phrase_replayed', 6),
      phraseEvent(7, 'p07', 'phrase_started', 7),
      phraseEvent(7, 'p07', 'phrase_replayed', 8),
      phraseEvent(7, 'p07', 'phrase_started', 9),
    ];

    const issues = detectPlaybackIssues(events);

    expect(issues.repeatedPhraseCount).toBe(4);
    expect(issues.maxRepeatCountForSinglePhrase).toBe(4);
    expect(issues.repeatedPhrases[0]).toMatchObject({
      phraseId: 'p07',
      repeatCount: 4,
    });
  });

  it('detects skipped phrases and phrase index jumps', () => {
    const issues = detectPlaybackIssues([
      phraseEvent(0, 'p00', 'phrase_started', 1),
      phraseEvent(3, 'p03', 'phrase_started', 2),
    ]);

    expect(issues.skippedPhraseCount).toBe(2);
    expect(issues.skippedPhrases.map((phrase) => phrase.expectedIndex)).toEqual([1, 2]);
    expect(issues.phraseIndexJumpCount).toBe(1);
  });

  it('treats phraseIndex as canonical even when phraseId numbering differs', () => {
    const issues = detectPlaybackIssues([
      phraseEvent(0, 'tts-21-chunk', 'phrase_started', 1),
      phraseEvent(1, 'tts-99-chunk', 'phrase_started', 2),
      phraseEvent(1, 'tts-5-chunk', 'phrase_started', 3),
      phraseEvent(2, 'tts-300-chunk', 'phrase_advanced', 4),
    ]);

    expect(issues.phraseIndexJumpCount).toBe(0);
    expect(issues.outOfOrderAdvanceCount).toBe(0);
    expect(issues.repeatedPhraseCount).toBe(1);
    expect(issues.repeatedPhrases[0]?.phraseId).toBe('tts-99-chunk');
  });

  it('calculates positive improvement deltas when benchmark metrics improve', () => {
    const before = {
      ...createEmptyInputLanguageBenchmark('browser-tts', 'en'),
      averageAccuracy: 0.8,
      averageLagSec: 1.5,
      averageWpm: 45,
      sweetSpotScore: 0.4,
    };
    const after = {
      ...before,
      averageAccuracy: 0.9,
      averageLagSec: 0.4,
      averageWpm: 52,
      sweetSpotScore: 0.65,
    };
    const cleanIssues = detectPlaybackIssues([phraseEvent(0, 'p00', 'phrase_started', 1)]);

    const delta = computeImprovementDelta(before, after, cleanIssues);

    expect(delta.accuracyDelta).toBeCloseTo(0.1);
    expect(delta.lagDelta).toBeCloseTo(1.1);
    expect(delta.sweetSpotScoreDelta).toBeCloseTo(0.25);
    expect(delta.overallImprovementScore).toBeGreaterThan(0.5);
  });

  it('marks feedback as regressed when playback issues are high', () => {
    const events: PhrasePlaybackEvent[] = Array.from({ length: 16 }, (_, index) =>
      phraseEvent(2, 'p02', 'phrase_started', index + 1),
    );
    const profile = createEmptyInputLanguageBenchmark('kokoro', 'en');

    const feedback = buildAdaptiveSessionFeedback({
      sessionId: 'session-1',
      inputMode: 'kokoro',
      language: 'en',
      sourceType: 'dictation_script',
      createdAt: '2026-04-30T08:00:00.000Z',
      completedAt: '2026-04-30T08:10:00.000Z',
      benchmarkBefore: profile,
      benchmarkAfter: profile,
      phraseEvents: events,
      totalPhrases: 5,
    });

    expect(feedback.playbackIssues.maxRepeatCountForSinglePhrase).toBe(15);
    expect(feedback.improvementDelta.overallImprovementScore).toBeLessThan(0.45);
    expect(feedback.verdict).toBe('regressed');
  });

  it('builds a package with benchmark and session feedback fields', () => {
    const profile = createEmptyInputLanguageBenchmark('kokoro', 'en');
    const feedback = buildAdaptiveSessionFeedback({
      sessionId: 'session-1',
      inputMode: 'kokoro',
      language: 'en',
      sourceType: 'dictation_script',
      createdAt: '2026-04-30T08:00:00.000Z',
      phraseEvents: [phraseEvent(0, 'p00', 'phrase_started', 1)],
      totalPhrases: 1,
    });

    const payload = buildBenchmarkFeedbackPackage(profile, feedback) as {
      benchmarkProfile?: unknown;
      latestSessionFeedback?: unknown;
      playbackDiagnostics?: unknown;
    };

    expect(payload.benchmarkProfile).toBeTruthy();
    expect(payload.latestSessionFeedback).toBe(feedback);
    expect(payload.playbackDiagnostics).toEqual(feedback.playbackIssues);
  });

  it('keeps clean browser-tts DE playback verdict stable even when benchmark recommendation is conservative', () => {
    const before = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const after = {
      ...before,
      recommendation: {
        ...before.recommendation,
        targetRateRange: [0.95, 1] as [number, number],
        targetPhraseSize: 'short' as const,
        targetPauseMs: 1200,
        confidence: 0.24,
      },
    };
    const events: PhrasePlaybackEvent[] = Array.from({ length: 20 }, (_, index) => ({
      ...phraseEvent(index, `p${index}`, 'phrase_completed', index + 1),
      inputMode: 'browser-tts',
      language: 'de',
    }));

    const feedback = buildAdaptiveSessionFeedback({
      sessionId: 'session-1',
      inputMode: 'browser-tts',
      language: 'de',
      sourceType: 'dictation_script',
      createdAt: '2026-05-13T08:00:00.000Z',
      completedAt: '2026-05-13T08:05:00.000Z',
      benchmarkBefore: before,
      benchmarkAfter: after,
      phraseEvents: events,
      totalPhrases: 20,
    });

    expect(feedback.verdict).toBe('stable');
    expect(feedback.playbackIssues.repeatedPhraseCount).toBe(0);
    expect(feedback.playbackIssues.skippedPhraseCount).toBe(0);
    expect(feedback.playbackIssues.outOfOrderAdvanceCount).toBe(0);
    expect(feedback.playbackIssues.phraseIndexJumpCount).toBe(0);
    expect(feedback.phraseStats.completedPhrases).toBe(20);
  });

  it('keeps stable browser-tts DE playback separate from an invalid unchanged benchmark', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const events: PhrasePlaybackEvent[] = Array.from({ length: 20 }, (_, index) => ({
      ...phraseEvent(index, `p${index}`, 'phrase_completed', index + 1),
      sessionId: 'session-invalid-benchmark',
      inputMode: 'browser-tts',
      language: 'de',
    }));

    const feedback = buildAdaptiveSessionFeedback({
      sessionId: 'session-invalid-benchmark',
      inputMode: 'browser-tts',
      language: 'de',
      sourceType: 'dictation_script',
      createdAt: '2026-05-13T08:00:00.000Z',
      completedAt: '2026-05-13T08:05:00.000Z',
      benchmarkBefore: profile,
      benchmarkAfter: profile,
      phraseEvents: events,
      totalPhrases: 20,
    });

    expect(feedback.verdict).toBe('stable');
    expect(feedback.phraseStats.completedPhrases).toBe(20);
    expect(feedback.improvementDelta.accuracyDelta).toBe(0);
    expect(feedback.improvementDelta.lagDelta).toBe(0);
    expect(feedback.improvementDelta.wpmDelta).toBe(0);
    expect(feedback.improvementDelta.sweetSpotScoreDelta).toBe(0);
  });

  it('scopes browser-tts DE latest feedback to the requested session only', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const currentSessionStart = {
      ...phraseEvent(0, 'current-0', 'phrase_started', 10),
      sessionId: 'session-current',
      inputMode: 'browser-tts' as const,
      language: 'de',
    };
    const oldSessionRepeats: PhrasePlaybackEvent[] = Array.from({ length: 6 }, (_, index) => ({
      ...phraseEvent(2, 'old-2', 'phrase_started', index + 1),
      sessionId: 'session-old',
      inputMode: 'browser-tts' as const,
      language: 'de',
    }));

    const feedback = buildAdaptiveSessionFeedback({
      sessionId: 'session-current',
      inputMode: 'browser-tts',
      language: 'de',
      sourceType: 'dictation_script',
      createdAt: '2026-04-30T08:00:00.000Z',
      completedAt: '2026-04-30T08:10:00.000Z',
      benchmarkBefore: profile,
      benchmarkAfter: profile,
      phraseEvents: [...oldSessionRepeats, currentSessionStart],
      totalPhrases: 1,
    });

    expect(feedback.playbackIssues.repeatedPhraseCount).toBe(0);
    expect(feedback.playbackIssues.maxRepeatCountForSinglePhrase).toBe(0);
    expect(feedback.phraseStats.totalPhrases).toBe(1);
    expect(feedback.phraseStats.averageRepeatsPerPhrase).toBe(0);
  });

  it('includes sessionCountDroppedReason when session count decreases after benchmark recalculation', () => {
    const before = {
      ...createEmptyInputLanguageBenchmark('browser-tts', 'es'),
      sessionCount: 12,
      sampleCount: 120,
    };
    const after = {
      ...createEmptyInputLanguageBenchmark('browser-tts', 'es'),
      sessionCount: 9,
      sampleCount: 90,
    };
    const feedback = buildAdaptiveSessionFeedback({
      sessionId: 'session-drop',
      inputMode: 'browser-tts',
      language: 'es',
      sourceType: 'dictation_script',
      createdAt: '2026-05-05T10:00:00.000Z',
      benchmarkBefore: before,
      benchmarkAfter: after,
      phraseEvents: [phraseEvent(0, 'p00', 'phrase_started', 1)],
      totalPhrases: 1,
    });
    expect(feedback.sessionCountDroppedReason).toContain('rolling-window pruning');
  });

  it('derives fallback playback diagnostics from recent timeline points', () => {
    const timeline: AdaptiveTimelinePoint[] = [
      timelinePoint(0, 'phrase_advance', 1),
      timelinePoint(1, 'replay', 2),
      timelinePoint(1, 'replay', 3),
      timelinePoint(1, 'replay', 4),
      timelinePoint(1, 'replay', 5),
      timelinePoint(4, 'phrase_advance', 6),
      timelinePoint(4, 'defer_pause', 7),
    ];

    const diagnostics = derivePlaybackDiagnosticsFromTimeline(timeline);

    expect(diagnostics.replayCount).toBe(4);
    expect(diagnostics.repeatedPhraseCount).toBe(4);
    expect(diagnostics.maxRepeatCountForSinglePhrase).toBe(4);
    expect(diagnostics.deferPauseCount).toBe(1);
    expect(diagnostics.phraseIndexJumpCount).toBe(1);
  });

  it('includes fallback diagnostics and active status when formal feedback is missing', () => {
    const profile = {
      ...createEmptyInputLanguageBenchmark('browser-tts', 'en'),
      timeline: [timelinePoint(3, 'replay', 1)],
    };

    const payload = buildBenchmarkFeedbackPackage(profile, null, { activeSessionStatus: 'running' }) as {
      sessionFeedbackStatus?: string;
      latestSessionFeedback?: { status?: string };
      playbackDiagnostics?: { source?: string; replayCount?: number };
    };

    expect(payload.sessionFeedbackStatus).toBe('session_running_no_completed_feedback_yet');
    expect(payload.latestSessionFeedback?.status).toBe('session_running_no_completed_feedback_yet');
    expect(payload.playbackDiagnostics?.source).toBe('timeline_fallback');
    expect(payload.playbackDiagnostics?.replayCount).toBe(1);
  });

  it('normalizes stale browser-tts DE benchmark recommendations in feedback packages', () => {
    const profile = staleBrowserTtsDePressureProfile();

    const payload = buildBenchmarkFeedbackPackage(profile, null) as {
      benchmarkProfile?: {
        flowStabilityScore?: number;
        weakAreas?: string[];
        recommendation?: { targetRateRange?: [number, number]; targetPauseMs?: number; summary?: string };
      };
      recommendation?: { targetRateRange?: [number, number]; targetPauseMs?: number; summary?: string };
      weakAreas?: string[];
    };

    expect(payload.recommendation?.targetRateRange).toEqual([0.95, 1]);
    expect(payload.recommendation?.targetPauseMs).toBe(1200);
    expect(payload.recommendation?.summary).not.toContain('medium-length semantic phrases');
    expect(payload.weakAreas).toEqual(
      expect.arrayContaining(['support_dependency', 'unsafe_boundary_pressure', 'lag_instability', 'accuracy_instability']),
    );
    expect(payload.benchmarkProfile?.flowStabilityScore).toBeLessThan(1);
    expect(payload.benchmarkProfile?.recommendation?.targetRateRange).toEqual([0.95, 1]);
  });
});

function timelinePoint(
  phraseIndex: number,
  event: AdaptiveTimelinePoint['event'],
  timestampMs: number,
): AdaptiveTimelinePoint {
  return {
    timestampMs,
    inputMode: 'browser-tts',
    language: 'en',
    mode: 'balanced',
    playbackRate: 1,
    accuracy: 0.9,
    lagSec: 0,
    wpm: 50,
    pauseMs: 600,
    phraseIndex,
    phraseId: `p${phraseIndex}`,
    event,
  };
}

function staleBrowserTtsDePressureProfile() {
  const base = Date.now();
  const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
  return {
    ...profile,
    sampleCount: 2,
    sweetSpotScore: 0.9709,
    flowStabilityScore: 1,
    weakAreas: [],
    recommendation: {
      ...profile.recommendation,
      targetRateRange: [1.05, 1.05] as [number, number],
      targetPhraseSize: 'short' as const,
      targetPauseMs: 750,
      nextTrainingFocus: ['Maintain stable pace and medium-length semantic phrases'],
      confidence: 0.0485,
      summary: 'Maintain stable pace and medium-length semantic phrases.',
    },
    timeline: Array.from({ length: 12 }, (_, index) => ({
      timestampMs: base + index,
      inputMode: 'browser-tts' as const,
      language: 'de',
      mode: 'support' as const,
      playbackRate: 1.05,
      accuracy: index % 2 === 0 ? 0.69 : 0.74,
      lagSec: index % 4 === 0 ? 3.4 : 1.4,
      rawLagSec: index === 3 ? -46 : index % 4 === 0 ? 3.4 : 1.4,
      stableLagSec: index === 3 ? -5 : index % 4 === 0 ? 3.4 : 1.4,
      wpm: 48,
      pauseMs: 1200,
      phraseBoundaryType: index % 3 === 0 ? ('unsafe' as const) : ('clause' as const),
      semanticCompleteness: index % 3 === 0 ? 0.6 : 0.82,
      decisionReason: 'support-needed, phrase-overload, replay-blocked-boundary',
      event: 'phrase_advance' as const,
      phraseIndex: index,
      sessionId: 'stale-de',
    })),
  };
}
