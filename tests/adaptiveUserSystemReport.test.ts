import { describe, expect, it } from 'vitest';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildAdaptiveUserSystemReport } from '../src/core/adaptive/adaptiveUserSystemReport';
import { buildAdaptiveSessionFeedback } from '../src/core/adaptive/sessionFeedback';
import type { PhrasePlaybackEvent } from '../src/core/adaptive/types';

function phraseEvent(
  phraseIndex: number,
  event: PhrasePlaybackEvent['event'],
  timestampMs: number,
): PhrasePlaybackEvent {
  return {
    sessionId: 'session-1',
    phraseId: `phrase-${phraseIndex}`,
    phraseIndex,
    textPreview: `Phrase ${phraseIndex}`,
    event,
    timestampMs,
    inputMode: 'browser-tts',
    language: 'de',
  };
}

describe('adaptiveUserSystemReport', () => {
  it('wraps the technical debug package with human and system summaries', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    profile.sessionCount = 4;
    profile.sampleCount = 12;
    profile.recommendation = {
      targetRateRange: [0.9, 1],
      targetPhraseSize: 'medium',
      targetPauseMs: 850,
      nextTrainingFocus: ['steady timing'],
      confidence: 0.62,
      summary: 'Keep steady Browser TTS pacing.',
    };
    profile.weakAreas = ['lag'];
    const technicalDebugData = { benchmarkProfile: { sampleCount: 12 }, recentTimelinePoints: [{ event: 'rate_change' }] };

    const report = buildAdaptiveUserSystemReport({
      profile,
      feedback: null,
      technicalDebugData,
      generatedAt: '2026-05-24T20:00:00.000Z',
      inputModeLabel: 'Browser TTS',
      languageLabel: 'DE',
      latestSession: {
        id: 'session-1',
        name: 'German park practice',
        inputMode: 'input2',
        inputModeLabel: 'Browser TTS',
        language: 'de',
        difficulty: 'normal',
        ttsText: 'eins zwei drei vier',
        metrics: {
          score: 221,
          points: 3,
          accuracy: 75,
          wpm: 34,
          lagSec: 4.2,
          rate: 0.9,
          trend: 'stable',
        },
        telemetry: {
          repeatCount: 4,
          finishedAt: '2026-05-24T19:59:00.000Z',
        },
        durationLabel: '1m 20s',
        updatedAt: '2026-05-24T20:00:00.000Z',
      },
    });

    expect(report.reportMetadata).toMatchObject({
      schemaVersion: 1,
      reportType: 'adaptive_user_system_report',
      inputMode: 'browser-tts',
      inputModeLabel: 'Browser TTS',
      language: 'de',
      languageLabel: 'DE',
    });
    expect(report.userProgressSummary.latestSession?.points).toBe('3/4');
    expect(report.userProgressSummary.howYouDid).toContain('3/4 points');
    expect(report.userProgressSummary.needsImprovement.join(' ')).toContain('Accuracy needs work');
    expect(report.userProgressSummary.needsImprovement.join(' ')).toContain('Lag is a weak area');
    expect(report.adaptiveSystemSummary.recommendedSystemAdjustments.playbackRate).toContain('lower end');
    expect(report.technicalDebugData).toBe(technicalDebugData);
  });

  it('falls back cleanly when no finished session or feedback exists', () => {
    const profile = createEmptyInputLanguageBenchmark('audio', 'en');
    const report = buildAdaptiveUserSystemReport({
      profile,
      feedback: null,
      technicalDebugData: { status: 'debug' },
      generatedAt: '2026-05-24T20:00:00.000Z',
    });

    expect(report.userProgressSummary.status).toBe('no_finished_session');
    expect(report.userProgressSummary.latestSession).toBeNull();
    expect(report.userProgressSummary.howYouDid).toContain('No finished session');
    expect(report.adaptiveSystemSummary.feedbackStatus).toContain('No current completed-session feedback');
    expect(report.technicalDebugData).toEqual({ status: 'debug' });
  });

  it('normalizes legacy benchmark profiles that are missing recommendation fields', () => {
    const legacyProfile = {
      inputMode: 'browser-tts',
      language: 'de',
      rollingWindowDays: 30,
      sessionCount: 2,
      sampleCount: 4,
      weakAreas: ['lag'],
      averageAccuracy: 0.7,
      averageWpm: 30,
      averageLagSec: 4.5,
    } as unknown as ReturnType<typeof createEmptyInputLanguageBenchmark>;

    const report = buildAdaptiveUserSystemReport({
      profile: legacyProfile,
      feedback: null,
      technicalDebugData: { legacy: true },
      generatedAt: '2026-05-24T20:00:00.000Z',
    });

    expect(report.reportMetadata.reportType).toBe('adaptive_user_system_report');
    expect(report.adaptiveSystemSummary.benchmarkHealth.recommendationSummary).toBeTruthy();
    expect(report.userProgressSummary.needsImprovement.join(' ')).toContain('Lag is a weak area');
  });

  it('recommends easier support when accuracy, lag, and repeats are poor', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    profile.weakAreas = ['low_accuracy', 'replay', 'flow_instability'];
    const feedback = buildAdaptiveSessionFeedback({
      sessionId: 'session-1',
      inputMode: 'browser-tts',
      language: 'de',
      sourceType: 'dictation_script',
      createdAt: '2026-05-24T20:00:00.000Z',
      phraseEvents: [
        phraseEvent(0, 'phrase_started', 1),
        phraseEvent(0, 'phrase_replayed', 2),
        phraseEvent(0, 'phrase_started', 3),
        phraseEvent(1, 'phrase_skipped', 4),
      ],
      totalPhrases: 2,
    });

    const report = buildAdaptiveUserSystemReport({
      profile,
      feedback,
      technicalDebugData: {},
      latestSession: {
        id: 'session-1',
        name: 'Hard run',
        inputMode: 'input2',
        ttsText: 'eins zwei drei vier funf sechs',
        metrics: {
          score: 180,
          points: 2,
          accuracy: 64,
          wpm: 28,
          lagSec: 5.1,
          trend: 'declining',
        },
        telemetry: { repeatCount: 6 },
      },
    });

    expect(report.userProgressSummary.recommendedNextExercise.difficulty).toBe('easy');
    expect(report.userProgressSummary.needsImprovement.join(' ')).toContain('Accuracy needs work');
    expect(report.userProgressSummary.needsImprovement.join(' ')).toContain('Replay behavior needs tuning');
    expect(report.adaptiveSystemSummary.recommendedSystemAdjustments.pauseAfterPhraseMs).toContain('Increase pause');
    expect(report.adaptiveSystemSummary.recommendedSystemAdjustments.replayBoundaries).toContain('independently replayable');
  });

  it('recommends a harder next exercise when latest performance is strong', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    profile.recommendation = {
      ...profile.recommendation,
      targetRateRange: [0.95, 1.05],
      targetPhraseSize: 'medium',
      targetPauseMs: 700,
      confidence: 0.7,
    };

    const report = buildAdaptiveUserSystemReport({
      profile,
      feedback: null,
      technicalDebugData: {},
      latestSession: {
        id: 'session-2',
        name: 'Strong run',
        inputMode: 'input2',
        ttsText: 'eins zwei drei vier',
        metrics: {
          score: 480,
          points: 4,
          accuracy: 94,
          wpm: 48,
          lagSec: 0.8,
          trend: 'improving',
        },
        telemetry: { repeatCount: 0 },
      },
    });

    expect(report.userProgressSummary.recommendedNextExercise.difficulty).toBe('hard');
    expect(report.userProgressSummary.positiveSignals.join(' ')).toContain('Strong latest-session accuracy');
    expect(report.adaptiveSystemSummary.recommendedSystemAdjustments.playbackRate).toContain('0.95x-1.00x');
  });
});
