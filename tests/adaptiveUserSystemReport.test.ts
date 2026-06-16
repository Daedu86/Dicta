import { describe, expect, it } from 'vitest';
import { buildAdaptiveUserSystemReport } from '../src/core/adaptive/adaptiveUserSystemReport';
import {
  REPORT_GENERATED_AT,
  browserEnvironment,
  createBrowserTtsBenchmarkProfile,
  createLegacyBenchmarkProfile,
  createPoorAdaptiveFeedback,
  createPoorBenchmarkProfile,
  createRecoveryBenchmarkProfile,
  createStrongPerformanceBenchmarkProfile,
} from './helpers/adaptiveUserSystemReportHarness';

describe('adaptiveUserSystemReport', () => {
  it('wraps the technical debug package with human and system summaries', () => {
    const technicalDebugData = { benchmarkProfile: { sampleCount: 12 }, recentTimelinePoints: [{ event: 'rate_change' }] };

    const report = buildAdaptiveUserSystemReport({
      profile: createRecoveryBenchmarkProfile(),
      feedback: null,
      technicalDebugData,
      generatedAt: REPORT_GENERATED_AT,
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
        ttsEnvironment: browserEnvironment,
        durationLabel: '1m 20s',
        updatedAt: REPORT_GENERATED_AT,
      },
    });

    expect(report.reportMetadata).toMatchObject({
      schemaVersion: 2,
      reportType: 'adaptive_user_system_report',
      inputMode: 'browser-tts',
      inputModeLabel: 'Browser TTS',
      language: 'de',
      languageLabel: 'DE',
    });
    expect(report.reportMetadata.reportLayers).toContain('executiveSummary');
    expect(report.reportMetadata.ttsEnvironment).toEqual(browserEnvironment);
    expect(report.executiveSummary.status).toBe('recovery_recommended');
    expect(report.adaptiveLoopBreakdown.sourceOfTruth.insightReport).toContain('not the direct LLM prompt');
    expect(report.componentDiagnostics.generationAndPrescription.promptMode).toBe('compact-adaptive-v2');
    expect(report.componentDiagnostics.plannerAndChunking.targetPhraseSize).toBe('short');
    expect(report.componentDiagnostics.plannerAndChunking.boundaryDistribution).toContainEqual({ name: 'clause', count: 1 });
    expect(report.componentDiagnostics.controllerAndPacing.topDecisionReasons).toContainEqual({ name: 'lag-pressure', count: 1 });
    expect(report.componentDiagnostics.browserTtsEnvironment.selectedVoice?.voiceName).toBe('German Local');
    expect(report.compactTechnicalDebugSummary.debugTopLevelKeys).toContain('benchmarkProfile');
    expect(report.userProgressSummary.latestSession?.points).toBe('3/4');
    expect(report.userProgressSummary.howYouDid).toContain('3/4 points');
    expect(report.userProgressSummary.needsImprovement.join(' ')).toContain('Accuracy needs work');
    expect(report.userProgressSummary.needsImprovement.join(' ')).toContain('Lag is a weak area');
    expect(report.adaptiveSystemSummary.recommendedSystemAdjustments.playbackRate).toContain('lower end');
    expect(report.technicalDebugData).toBe(technicalDebugData);
  });

  it('falls back cleanly when no finished session or feedback exists', () => {
    const report = buildAdaptiveUserSystemReport({
      profile: createBrowserTtsBenchmarkProfile('en'),
      feedback: null,
      technicalDebugData: { status: 'debug' },
      generatedAt: REPORT_GENERATED_AT,
    });

    expect(report.executiveSummary.status).toBe('needs_more_data');
    expect(report.userProgressSummary.status).toBe('no_finished_session');
    expect(report.userProgressSummary.latestSession).toBeNull();
    expect(report.userProgressSummary.howYouDid).toContain('No finished session');
    expect(report.adaptiveSystemSummary.feedbackStatus).toContain('No current completed-session feedback');
    expect(report.componentDiagnostics.browserTtsEnvironment.status).toBe('missing');
    expect(report.technicalDebugData).toEqual({ status: 'debug' });
    expect(report.reportMetadata.ttsEnvironment).toBeUndefined();
  });

  it('normalizes legacy benchmark profiles that are missing recommendation fields', () => {
    const report = buildAdaptiveUserSystemReport({
      profile: createLegacyBenchmarkProfile(),
      feedback: null,
      technicalDebugData: { legacy: true },
      generatedAt: REPORT_GENERATED_AT,
    });

    expect(report.reportMetadata.reportType).toBe('adaptive_user_system_report');
    expect(report.adaptiveSystemSummary.benchmarkHealth.recommendationSummary).toBeTruthy();
    expect(report.componentDiagnostics.benchmarkAndFeedback.recommendationSummary).toBeTruthy();
    expect(report.userProgressSummary.needsImprovement.join(' ')).toContain('Lag is a weak area');
  });

  it('recommends easier support when accuracy, lag, and repeats are poor', () => {
    const report = buildAdaptiveUserSystemReport({
      profile: createPoorBenchmarkProfile(),
      feedback: createPoorAdaptiveFeedback(),
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
    expect(report.componentDiagnostics.generationAndPrescription.targetDifficulty).toBe('easy');
    expect(report.userProgressSummary.needsImprovement.join(' ')).toContain('Accuracy needs work');
    expect(report.userProgressSummary.needsImprovement.join(' ')).toContain('Replay behavior needs tuning');
    expect(report.adaptiveSystemSummary.recommendedSystemAdjustments.pauseAfterPhraseMs).toContain('Increase pause');
    expect(report.adaptiveSystemSummary.recommendedSystemAdjustments.replayBoundaries).toContain('independently replayable');
  });

  it('recommends a harder next exercise when latest performance is strong', () => {
    const report = buildAdaptiveUserSystemReport({
      profile: createStrongPerformanceBenchmarkProfile(),
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
    expect(report.executiveSummary.status).toBe('challenge_ready');
    expect(report.userProgressSummary.positiveSignals.join(' ')).toContain('Strong latest-session accuracy');
    expect(report.adaptiveSystemSummary.recommendedSystemAdjustments.playbackRate).toContain('0.95x-1.05x');
  });
});
