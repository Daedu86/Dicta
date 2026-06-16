import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics } from './types';
import type { buildTtsEnvironmentReport } from './adaptiveUserSystemReportEnvironment';
import type { AdaptiveUserSystemReport } from './adaptiveUserSystemReportTypes';
import { buildExpectedControllerBehavior } from './adaptiveUserSystemReportController';
import { asRecord, countBy, readString, topCounts } from './adaptiveUserSystemReportUtils';

const RECENT_TIMELINE_SUMMARY_WINDOW = 60;

export function buildComponentDiagnostics({
  profile,
  feedback,
  feedbackStatus,
  recommendedNextExercise,
  ttsEnvironmentReport,
  technicalDebugData,
}: {
  profile: InputLanguageBenchmarkMetrics;
  feedback: AdaptiveSessionFeedback | null;
  feedbackStatus: string;
  recommendedNextExercise: AdaptiveUserSystemReport['userProgressSummary']['recommendedNextExercise'];
  ttsEnvironmentReport: ReturnType<typeof buildTtsEnvironmentReport>;
  technicalDebugData: unknown;
}): AdaptiveUserSystemReport['componentDiagnostics'] {
  const recentTimeline = profile.timeline.slice(-RECENT_TIMELINE_SUMMARY_WINDOW);
  const debugRecord = asRecord(technicalDebugData);
  const browserTtsDeDiagnostics = asRecord(debugRecord?.browserTtsDeDiagnostics);

  return {
    generationAndPrescription: {
      promptMode: 'compact-adaptive-v2',
      llmRole: 'The LLM should generate session content only; the controller/runtime own live pacing and chunk execution.',
      targetDifficulty: recommendedNextExercise.difficulty,
      targetRateRange: profile.recommendation.targetRateRange,
      targetPhraseSize: profile.recommendation.targetPhraseSize,
      targetPauseMs: profile.recommendation.targetPauseMs,
      nextTrainingFocus: profile.recommendation.nextTrainingFocus,
      complianceAudit: {
        status: 'not_recorded_in_this_report_yet',
        recommendation: 'Persist a generationCompliance object after session generation to compare LLM output against the training prescription.',
      },
    },
    plannerAndChunking: {
      role: 'Pre-TTS planner/chunk planner summary. This is the layer that turns generated text into playable chunks.',
      targetPhraseSize: profile.recommendation.targetPhraseSize,
      targetPauseMs: profile.recommendation.targetPauseMs,
      targetRateRange: profile.recommendation.targetRateRange,
      averageSemanticCompleteness: profile.averageSemanticCompleteness,
      averagePhraseDifficulty: profile.averagePhraseDifficulty,
      semanticCutPenalty: profile.semanticCutPenalty,
      safePauseCount: profile.safePauseCount,
      unsafePauseCount: profile.unsafePauseCount,
      deferredPauseCount: profile.deferredPauseCount,
      replayDeniedByBoundaryCount: profile.replayDeniedByBoundaryCount,
      boundaryDistribution: topCounts(countBy(recentTimeline, (point) => point.phraseBoundaryType ?? 'unknown'), 8),
      recentTimelineSampleCount: recentTimeline.length,
      notes: buildPlannerNotes(profile),
    },
    controllerAndPacing: {
      role: 'Runtime controller summary. This layer adapts the live experience from telemetry and planner signals.',
      controlFidelityScore: profile.controlFidelityScore,
      flowStabilityScore: profile.flowStabilityScore,
      inputExecutionFidelityScore: profile.inputExecutionFidelityScore,
      preferredPlaybackRate: profile.preferredPlaybackRate,
      preferredPhraseSize: profile.preferredPhraseSize,
      preferredPauseAfterPhraseMs: profile.preferredPauseAfterPhraseMs,
      modeSwitchFrequency: profile.modeSwitchFrequency,
      rateVariance: profile.rateVariance,
      pauseVariance: profile.pauseVariance,
      modeDistribution: topCounts(countBy(recentTimeline, (point) => point.mode), 8),
      eventDistribution: topCounts(countBy(recentTimeline, (point) => point.event ?? 'sample'), 8),
      topDecisionReasons: topCounts(countBy(recentTimeline, (point) => point.decisionReason ?? 'not_recorded'), 8),
      expectedControllerBehavior: buildExpectedControllerBehavior(profile),
    },
    browserTtsEnvironment: buildBrowserTtsEnvironmentDiagnostics(profile, ttsEnvironmentReport, browserTtsDeDiagnostics),
    benchmarkAndFeedback: {
      sessionCount: profile.sessionCount,
      sampleCount: profile.sampleCount,
      lastUpdatedAt: profile.lastUpdatedAt,
      confidence: profile.recommendation.confidence,
      weakAreas: profile.weakAreas,
      recommendationSummary: profile.recommendation.summary,
      sessionFeedbackStatus: readString(debugRecord, 'sessionFeedbackStatus') ?? feedbackStatus,
      feedbackCreatedAt: feedback?.createdAt ?? null,
      feedbackCompletedAt: feedback?.completedAt ?? null,
      listeningPrecisionAverages: profile.listeningPrecisionAverages ?? null,
      latestFeedbackVerdict: feedback?.verdict ?? null,
    },
  };
}

function buildBrowserTtsEnvironmentDiagnostics(
  profile: InputLanguageBenchmarkMetrics,
  ttsEnvironmentReport: ReturnType<typeof buildTtsEnvironmentReport>,
  browserTtsDeDiagnostics: Record<string, unknown> | null,
): AdaptiveUserSystemReport['componentDiagnostics']['browserTtsEnvironment'] {
  if (profile.inputMode !== 'browser-tts') {
    return {
      status: 'not_browser_tts',
      selectedVoice: null,
      availableVoicesSummary: null,
      platformSummary: null,
      environmentChanged: false,
      historyCount: 0,
      diagnostics: null,
      notes: ['This report input mode does not execute through Browser TTS.'],
    };
  }

  const env = ttsEnvironmentReport.ttsEnvironment;
  const historyCount = ttsEnvironmentReport.ttsEnvironmentHistory?.length ?? 0;
  return {
    status: env ? 'available' : 'missing',
    selectedVoice: env
      ? {
          engine: env.engine,
          voiceName: env.voiceName,
          voiceLang: env.voiceLang,
          voiceURI: env.voiceURI,
          localService: env.localService,
        }
      : null,
    availableVoicesSummary: env
      ? {
          availableVoiceCount: env.availableVoiceCount,
          matchingVoiceCount: env.matchingVoiceCount,
        }
      : null,
    platformSummary: env
      ? {
          platform: env.platform,
          standalonePwa: env.standalonePwa,
          browserUserAgentHash: env.browserUserAgentHash,
        }
      : null,
    environmentChanged: Boolean(ttsEnvironmentReport.environmentChanged),
    historyCount,
    diagnostics: browserTtsDeDiagnostics,
    notes: [
      env ? 'Browser TTS voice/runtime metadata is preserved because voices and platforms can change pacing behavior.' : 'No Browser TTS environment fingerprint was available.',
      historyCount > 1 ? 'Multiple Browser TTS environment entries exist; compare environment changes before tuning aggressively.' : 'No multi-environment history pressure detected.',
      browserTtsDeDiagnostics ? 'Language-specific Browser TTS diagnostics are included.' : 'No language-specific Browser TTS diagnostics were attached.',
    ],
  };
}

function buildPlannerNotes(profile: InputLanguageBenchmarkMetrics): string[] {
  const notes: string[] = [];
  if (profile.averageSemanticCompleteness < 0.75) notes.push('Average semantic completeness is low; favor safer clause/sentence boundaries.');
  if (profile.unsafePauseCount > profile.safePauseCount) notes.push('Unsafe pause pressure is higher than safe pause evidence.');
  if (profile.deferredPauseCount > 0) notes.push('Deferred pauses indicate the runtime is waiting for safer boundaries.');
  if (profile.weakAreas.includes('long_phrases')) notes.push('Long phrase pressure is present; keep chunks short.');
  if (profile.weakAreas.includes('unsafe_boundary_pressure') || profile.weakAreas.includes('unsafe_boundaries')) notes.push('Unsafe boundary pressure is present; prioritize semantically complete chunks.');
  return notes.length > 0 ? notes : ['Planner signals do not show urgent chunking pressure.'];
}
