import { describe, expect, it } from 'vitest';
import {
  buildAdaptiveSessionFeedback,
  buildBenchmarkFeedbackPackage,
  computeImprovementDelta,
  derivePlaybackDiagnosticsFromTimeline,
  detectPlaybackIssues,
  selectLatestAdaptiveSessionFeedback,
  upsertAdaptiveSessionFeedbackByInputLanguage,
} from '../src/core/adaptive/sessionFeedback';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type { AdaptiveSessionFeedback, AdaptiveTimelinePoint, InputMode, LanguageCode, PhrasePlaybackEvent } from '../src/core/adaptive/types';

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

function feedbackRecord({
  sessionId,
  inputMode,
  language,
  createdAt,
  completedAt,
}: {
  sessionId: string;
  inputMode: InputMode;
  language: LanguageCode;
  createdAt: string;
  completedAt?: string;
}): AdaptiveSessionFeedback {
  const profile = createEmptyInputLanguageBenchmark(inputMode, language);
  return buildAdaptiveSessionFeedback({
    sessionId,
    inputMode,
    language,
    sourceType: 'dictation_script',
    createdAt,
    completedAt,
    benchmarkBefore: profile,
    benchmarkAfter: profile,
    phraseEvents: [
      {
        ...phraseEvent(0, `${sessionId}-p0`, 'phrase_completed', 1),
        sessionId,
        inputMode,
        language,
      },
    ],
    totalPhrases: 1,
  });
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
      benchmarkProfile?: {
        benchmarkSessionCount?: number;
        acceptedTelemetrySamples?: number;
        countSemantics?: string;
      };
      latestSessionFeedback?: {
        sessionId?: string;
        benchmarkBefore?: {
          benchmarkSessionCount?: number;
          acceptedTelemetrySamples?: number;
          countSemantics?: string;
        };
        benchmarkAfter?: {
          benchmarkSessionCount?: number;
          acceptedTelemetrySamples?: number;
          countSemantics?: string;
        };
      };
      playbackDiagnostics?: unknown;
    };

    expect(payload.benchmarkProfile).toBeTruthy();
    expect(payload.benchmarkProfile?.benchmarkSessionCount).toBe(profile.sessionCount);
    expect(payload.benchmarkProfile?.acceptedTelemetrySamples).toBe(profile.sampleCount);
    expect(payload.benchmarkProfile?.countSemantics).toContain('not all saved sessions');
    expect(payload.latestSessionFeedback?.sessionId).toBe(feedback.sessionId);
    expect(payload.playbackDiagnostics).toEqual(feedback.playbackIssues);
  });

  it('selects the newest matching feedback for exported benchmark packages even when the list is stale-ordered', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const stale = feedbackRecord({
      sessionId: 'session-2026-05-17',
      inputMode: 'browser-tts',
      language: 'de',
      createdAt: '2026-05-17T23:08:39.293Z',
      completedAt: '2026-05-17T23:18:39.293Z',
    });
    const fresh = feedbackRecord({
      sessionId: 'session-2026-05-21',
      inputMode: 'browser-tts',
      language: 'de',
      createdAt: '2026-05-21T06:44:54.671Z',
      completedAt: '2026-05-21T06:54:54.671Z',
    });

    const selected = selectLatestAdaptiveSessionFeedback([stale, fresh], 'browser-tts', 'de');
    const payload = buildBenchmarkFeedbackPackage(profile, selected) as {
      latestSessionFeedback?: { sessionId?: string };
    };

    expect(selected?.sessionId).toBe('session-2026-05-21');
    expect(payload.latestSessionFeedback?.sessionId).toBe('session-2026-05-21');
  });

  it('filters latest feedback by inputMode before selecting by recency', () => {
    const browserTtsDe = feedbackRecord({
      sessionId: 'browser-tts-de-older',
      inputMode: 'browser-tts',
      language: 'de',
      createdAt: '2026-05-20T08:00:00.000Z',
      completedAt: '2026-05-20T08:10:00.000Z',
    });
    const newerAudioDe = feedbackRecord({
      sessionId: 'audio-de-newer',
      inputMode: 'audio',
      language: 'de',
      createdAt: '2026-05-21T08:00:00.000Z',
      completedAt: '2026-05-21T08:10:00.000Z',
    });

    const selected = selectLatestAdaptiveSessionFeedback([newerAudioDe, browserTtsDe], 'browser-tts', 'de');

    expect(selected?.sessionId).toBe('browser-tts-de-older');
  });

  it('filters latest feedback by language before selecting by recency', () => {
    const browserTtsDe = feedbackRecord({
      sessionId: 'browser-tts-de-older',
      inputMode: 'browser-tts',
      language: 'de',
      createdAt: '2026-05-20T08:00:00.000Z',
      completedAt: '2026-05-20T08:10:00.000Z',
    });
    const newerBrowserTtsEn = feedbackRecord({
      sessionId: 'browser-tts-en-newer',
      inputMode: 'browser-tts',
      language: 'en',
      createdAt: '2026-05-21T08:00:00.000Z',
      completedAt: '2026-05-21T08:10:00.000Z',
    });

    const selected = selectLatestAdaptiveSessionFeedback([newerBrowserTtsEn, browserTtsDe], 'browser-tts', 'de');

    expect(selected?.sessionId).toBe('browser-tts-de-older');
  });

  it('falls back to the latest available matching feedback instead of selecting unrelated newer records', () => {
    const olderBrowserTtsDe = feedbackRecord({
      sessionId: 'browser-tts-de-latest-available',
      inputMode: 'browser-tts',
      language: 'de',
      createdAt: '2026-05-17T08:00:00.000Z',
      completedAt: '2026-05-17T08:10:00.000Z',
    });
    const newerKokoroDe = feedbackRecord({
      sessionId: 'kokoro-de-newer',
      inputMode: 'kokoro',
      language: 'de',
      createdAt: '2026-05-21T08:00:00.000Z',
      completedAt: '2026-05-21T08:10:00.000Z',
    });

    const selected = selectLatestAdaptiveSessionFeedback([olderBrowserTtsDe, newerKokoroDe], 'browser-tts', 'de');

    expect(selected?.sessionId).toBe('browser-tts-de-latest-available');
  });

  it('returns null when no feedback matches the requested inputMode and language', () => {
    const unrelated = feedbackRecord({
      sessionId: 'browser-tts-en-only',
      inputMode: 'browser-tts',
      language: 'en',
      createdAt: '2026-05-21T08:00:00.000Z',
      completedAt: '2026-05-21T08:10:00.000Z',
    });

    expect(selectLatestAdaptiveSessionFeedback([unrelated], 'browser-tts', 'de')).toBeNull();
  });

  it('stores generated browser-tts DE feedback under the browser-tts/de bucket', () => {
    const feedback = feedbackRecord({
      sessionId: '4968d38d-ca63-4d6c-bc00-20b4013d94ad',
      inputMode: 'browser-tts',
      language: 'de',
      createdAt: '2026-05-21T08:16:36.500Z',
      completedAt: '2026-05-21T08:20:52.399Z',
    });

    const next = upsertAdaptiveSessionFeedbackByInputLanguage({}, 'browser-tts', 'de', feedback);

    expect(next['browser-tts']?.de?.[0]?.sessionId).toBe('4968d38d-ca63-4d6c-bc00-20b4013d94ad');
    expect(next.audio?.de).toBeUndefined();
    expect(next['browser-tts']?.en).toBeUndefined();
  });

  it('replaces stale browser-tts DE feedback with newer generated feedback and survives reload serialization', () => {
    const stale = feedbackRecord({
      sessionId: '324aa46a-f9cd-447f-abca-48fb64f2f7ee',
      inputMode: 'browser-tts',
      language: 'de',
      createdAt: '2026-05-17T23:08:39.293Z',
      completedAt: '2026-05-17T23:18:39.293Z',
    });
    const fresh = feedbackRecord({
      sessionId: '4968d38d-ca63-4d6c-bc00-20b4013d94ad',
      inputMode: 'browser-tts',
      language: 'de',
      createdAt: '2026-05-21T08:16:36.500Z',
      completedAt: '2026-05-21T08:20:52.399Z',
    });
    const withStale = upsertAdaptiveSessionFeedbackByInputLanguage({}, 'browser-tts', 'de', stale);
    const withFresh = upsertAdaptiveSessionFeedbackByInputLanguage(withStale, 'browser-tts', 'de', fresh);
    const restored = JSON.parse(JSON.stringify(withFresh)) as typeof withFresh;

    const selected = selectLatestAdaptiveSessionFeedback(restored['browser-tts']?.de, 'browser-tts', 'de');

    expect(restored['browser-tts']?.de).toHaveLength(2);
    expect(restored['browser-tts']?.de?.[0]?.sessionId).toBe('4968d38d-ca63-4d6c-bc00-20b4013d94ad');
    expect(selected?.sessionId).toBe('4968d38d-ca63-4d6c-bc00-20b4013d94ad');
  });

  it('adds benchmark count aliases to legacy feedback snapshots in exported packages', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const feedback = buildAdaptiveSessionFeedback({
      sessionId: 'session-legacy',
      inputMode: 'browser-tts',
      language: 'de',
      sourceType: 'dictation_script',
      createdAt: '2026-05-16T08:00:00.000Z',
      benchmarkBefore: { ...profile, sessionCount: 3, sampleCount: 30 },
      benchmarkAfter: { ...profile, sessionCount: 3, sampleCount: 43 },
      phraseEvents: [phraseEvent(0, 'p00', 'phrase_started', 1)],
      totalPhrases: 1,
    });
    const legacyFeedback = {
      ...feedback,
      benchmarkBefore: {
        inputMode: 'browser-tts' as const,
        language: 'de' as const,
        sessionCount: 3,
        sampleCount: 30,
      },
      benchmarkAfter: {
        inputMode: 'browser-tts' as const,
        language: 'de' as const,
        sessionCount: 3,
        sampleCount: 43,
      },
    };

    const payload = buildBenchmarkFeedbackPackage(profile, legacyFeedback) as {
      latestSessionFeedback?: {
        benchmarkBefore?: {
          benchmarkSessionCount?: number;
          acceptedTelemetrySamples?: number;
          countSemantics?: string;
        };
        benchmarkAfter?: {
          benchmarkSessionCount?: number;
          acceptedTelemetrySamples?: number;
          countSemantics?: string;
        };
      };
    };

    expect(payload.latestSessionFeedback?.benchmarkBefore?.benchmarkSessionCount).toBe(3);
    expect(payload.latestSessionFeedback?.benchmarkBefore?.acceptedTelemetrySamples).toBe(30);
    expect(payload.latestSessionFeedback?.benchmarkBefore?.countSemantics).toContain('not all saved sessions');
    expect(payload.latestSessionFeedback?.benchmarkAfter?.benchmarkSessionCount).toBe(3);
    expect(payload.latestSessionFeedback?.benchmarkAfter?.acceptedTelemetrySamples).toBe(43);
    expect(payload.latestSessionFeedback?.benchmarkAfter?.countSemantics).toContain('not all saved sessions');
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

  it('marks completed feedback as stale when a newer finished session exists for the export scope', () => {
    const profile = {
      ...createEmptyInputLanguageBenchmark('browser-tts', 'de'),
      timeline: [timelinePoint(0, 'phrase_completed', 1)],
    };
    const staleFeedback = {
      ...feedbackRecord({
        sessionId: '324aa46a-f9cd-447f-abca-48fb64f2f7ee',
        inputMode: 'browser-tts',
        language: 'de',
        createdAt: '2026-05-17T23:08:39.293Z',
        completedAt: '2026-05-17T23:18:39.293Z',
      }),
      scriptId: '324aa46a-f9cd-447f-abca-48fb64f2f7ee:Alltagsbeobachtungen im Stadtpark bei leichtem Regen',
      scriptTitle: 'Alltagsbeobachtungen im Stadtpark bei leichtem Regen',
    };

    const payload = buildBenchmarkFeedbackPackage(profile, staleFeedback, {
      latestFinishedSession: {
        sessionId: '48c16590-52cc-4738-b441-1c831e4cb646',
        updatedAt: '2026-05-21T07:57:33.023Z',
        finishedAt: '2026-05-21T07:57:33.023Z',
        scriptTitle: 'Alltägliche Szenen im Park und zu Hause',
      },
    }) as {
      sessionFeedbackStatus?: string;
      latestSessionFeedback?: { status?: string; staleFeedback?: { sessionId?: string | null } };
      staleSessionFeedback?: { sessionId?: string | null; scriptTitle?: string | null };
      sessionFeedbackRecency?: { status?: string; latestFinishedSession?: { sessionId?: string } };
      dictationScript?: { status?: string; scriptTitle?: string; latestFinishedSessionId?: string | null } | null;
      playbackDiagnostics?: { source?: string };
    };

    expect(payload.sessionFeedbackStatus).toBe('stale_completed_feedback_for_latest_finished_session');
    expect(payload.sessionFeedbackRecency?.status).toBe('stale_for_latest_finished_session');
    expect(payload.sessionFeedbackRecency?.latestFinishedSession?.sessionId).toBe('48c16590-52cc-4738-b441-1c831e4cb646');
    expect(payload.latestSessionFeedback?.status).toBe('stale_completed_feedback_for_latest_finished_session');
    expect(payload.latestSessionFeedback?.staleFeedback?.sessionId).toBe('324aa46a-f9cd-447f-abca-48fb64f2f7ee');
    expect(payload.staleSessionFeedback?.sessionId).toBe('324aa46a-f9cd-447f-abca-48fb64f2f7ee');
    expect(payload.dictationScript?.status).toBe('stale_feedback_script');
    expect(payload.dictationScript?.latestFinishedSessionId).toBe('48c16590-52cc-4738-b441-1c831e4cb646');
    expect(payload.playbackDiagnostics?.source).toBe('timeline_fallback');
  });

  it('keeps completed feedback current when it matches the latest finished session', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const feedback = {
      ...feedbackRecord({
        sessionId: '48c16590-52cc-4738-b441-1c831e4cb646',
        inputMode: 'browser-tts',
        language: 'de',
        createdAt: '2026-05-21T07:50:00.000Z',
        completedAt: '2026-05-21T07:57:33.023Z',
      }),
      scriptId: '48c16590-52cc-4738-b441-1c831e4cb646:Alltägliche Szenen im Park und zu Hause',
      scriptTitle: 'Alltägliche Szenen im Park und zu Hause',
    };

    const payload = buildBenchmarkFeedbackPackage(profile, feedback, {
      latestFinishedSession: {
        sessionId: '48c16590-52cc-4738-b441-1c831e4cb646',
        updatedAt: '2026-05-21T07:57:33.023Z',
        finishedAt: '2026-05-21T07:57:33.023Z',
      },
    }) as {
      sessionFeedbackStatus?: string;
      latestSessionFeedback?: { sessionId?: string };
      staleSessionFeedback?: unknown;
      dictationScript?: { status?: string; scriptTitle?: string } | null;
    };

    expect(payload.sessionFeedbackStatus).toBe('completed_feedback_available');
    expect(payload.latestSessionFeedback?.sessionId).toBe('48c16590-52cc-4738-b441-1c831e4cb646');
    expect(payload.staleSessionFeedback).toBeNull();
    expect(payload.dictationScript?.status).toBe('current_feedback_script');
    expect(payload.dictationScript?.scriptTitle).toBe('Alltägliche Szenen im Park und zu Hause');
  });

  it('reports missing feedback for the latest finished session without selecting stale script metadata', () => {
    const profile = {
      ...createEmptyInputLanguageBenchmark('browser-tts', 'de'),
      timeline: [timelinePoint(0, 'phrase_completed', 1)],
    };

    const payload = buildBenchmarkFeedbackPackage(profile, null, {
      latestFinishedSession: {
        sessionId: '48c16590-52cc-4738-b441-1c831e4cb646',
        updatedAt: '2026-05-21T07:57:33.023Z',
        finishedAt: '2026-05-21T07:57:33.023Z',
        scriptTitle: 'Alltägliche Szenen im Park und zu Hause',
      },
    }) as {
      sessionFeedbackStatus?: string;
      latestSessionFeedback?: { status?: string; latestFinishedSession?: { sessionId?: string } };
      staleSessionFeedback?: unknown;
      dictationScript?: unknown;
      playbackDiagnostics?: { source?: string };
    };

    expect(payload.sessionFeedbackStatus).toBe('latest_finished_session_no_completed_feedback_yet');
    expect(payload.latestSessionFeedback?.status).toBe('latest_finished_session_no_completed_feedback_yet');
    expect(payload.latestSessionFeedback?.latestFinishedSession?.sessionId).toBe('48c16590-52cc-4738-b441-1c831e4cb646');
    expect(payload.staleSessionFeedback).toBeNull();
    expect(payload.dictationScript).toBeNull();
    expect(payload.playbackDiagnostics?.source).toBe('timeline_fallback');
  });

  it('exports up to the latest 120 timeline points in full feedback packages', () => {
    const profile = {
      ...createEmptyInputLanguageBenchmark('browser-tts', 'en'),
      timeline: Array.from({ length: 140 }, (_, index) => timelinePoint(index, 'sample', index + 1)),
    };

    const payload = buildBenchmarkFeedbackPackage(profile, null) as {
      recentTimelinePoints?: AdaptiveTimelinePoint[];
    };

    expect(payload.recentTimelinePoints).toHaveLength(120);
    expect(payload.recentTimelinePoints?.[0]?.phraseIndex).toBe(20);
    expect(payload.recentTimelinePoints?.[119]?.phraseIndex).toBe(139);
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

    expect(payload.recommendation?.targetRateRange).toEqual([0.8, 0.85]);
    expect(payload.recommendation?.targetPauseMs).toBe(1200);
    expect(payload.recommendation?.summary).not.toContain('medium-length semantic phrases');
    expect(payload.weakAreas).toEqual(
      expect.arrayContaining(['support_dependency', 'unsafe_boundary_pressure', 'lag_instability', 'accuracy_instability']),
    );
    expect(payload.benchmarkProfile?.flowStabilityScore).toBeLessThan(1);
    expect(payload.benchmarkProfile?.recommendation?.targetRateRange).toEqual([0.8, 0.85]);
  });

  it('includes browser-tts DE diagnostics in feedback packages when runtime recovery pause exceeds the target', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    profile.recommendation = {
      ...profile.recommendation,
      targetPauseMs: 1200,
    };
    profile.timeline = [
      {
        timestampMs: Date.now(),
        inputMode: 'browser-tts',
        language: 'de',
        mode: 'support',
        playbackRate: 0.8,
        accuracy: 0.74,
        lagSec: 3.2,
        rawLagSec: 3.2,
        stableLagSec: 3.2,
        wpm: 44,
        pauseMs: 2600,
        phraseBoundaryType: 'clause',
        semanticCompleteness: 0.86,
        decisionReason: 'mode=support, browser-tts-de-recovery-severe',
        event: 'phrase_completed',
      },
    ];

    const payload = buildBenchmarkFeedbackPackage(profile, null) as {
      browserTtsDeDiagnostics?: {
        targetPauseMs?: number;
        runtimeRecoveryPauseMs?: number | null;
        pauseGapMs?: number;
        note?: string;
      };
    };

    expect(payload.browserTtsDeDiagnostics?.targetPauseMs).toBe(1200);
    expect(payload.browserTtsDeDiagnostics?.runtimeRecoveryPauseMs).toBe(2600);
    expect(payload.browserTtsDeDiagnostics?.pauseGapMs).toBe(1400);
    expect(payload.browserTtsDeDiagnostics?.note).toContain('benchmark target');
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
