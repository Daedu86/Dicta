import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics } from './types';

import {
  buildTtsEnvironmentReport,
  estimateJsonBytes,
  normalizeReportProfile,
} from './adaptiveUserSystemReportEnvironment';
import {
  buildRecommendedNextExercise,
  buildSystemAdjustments,
  buildSystemTuningSignals,
  buildSystemWorkingSignals,
} from './adaptiveUserSystemReportRecommendations';
import type { AdaptiveReportSession, AdaptiveUserSystemReport } from './adaptiveUserSystemReportTypes';
import {
  buildPositiveSignals,
  buildNeedsImprovement,
  buildNextPracticeFocus,
} from './adaptiveUserSystemReportSignals';
import {
  buildHowYouDid,
  summarizeLatestSession,
} from './adaptiveUserSystemReportSessionSummary';
export type { AdaptiveReportSession, AdaptiveReportSessionMetrics, AdaptiveUserSystemReport } from './adaptiveUserSystemReportTypes';

const RECENT_TIMELINE_SUMMARY_WINDOW = 60;

export function buildAdaptiveUserSystemReport({
  profile,
  feedback,
  technicalDebugData,
  latestSession,
  generatedAt = new Date().toISOString(),
  inputModeLabel = profile.inputMode,
  languageLabel = String(profile.language).toUpperCase(),
}: {
  profile: InputLanguageBenchmarkMetrics;
  feedback: AdaptiveSessionFeedback | null;
  technicalDebugData: unknown;
  latestSession?: AdaptiveReportSession | null;
  generatedAt?: string;
  inputModeLabel?: string;
  languageLabel?: string;
}): AdaptiveUserSystemReport {
  const normalizedProfile = normalizeReportProfile(profile);
  const sessionSummary = latestSession ? summarizeLatestSession(latestSession) : null;
  const playbackIssues = feedback?.playbackIssues ?? null;
  const repeatCount = playbackIssues?.repeatedPhraseCount ?? latestSession?.telemetry?.repeatCount ?? 0;
  const positiveSignals = buildPositiveSignals(normalizedProfile, sessionSummary, feedback);
  const needsImprovement = buildNeedsImprovement(normalizedProfile, sessionSummary, feedback);
  const nextPracticeFocus = buildNextPracticeFocus(normalizedProfile, needsImprovement);
  const recommendedNextExercise = buildRecommendedNextExercise(normalizedProfile, sessionSummary, repeatCount, nextPracticeFocus);
  const whatIsWorking = buildSystemWorkingSignals(normalizedProfile, sessionSummary, feedback);
  const whatNeedsTuning = buildSystemTuningSignals(normalizedProfile, needsImprovement, feedback);
  const ttsEnvironmentReport = buildTtsEnvironmentReport(normalizedProfile, feedback, latestSession ?? null);
  const feedbackStatus = feedback ? `Current feedback is available for session ${feedback.sessionId}.` : 'No current completed-session feedback is available for this input/language yet.';
  const estimatedTechnicalDebugDataBytes = estimateJsonBytes(technicalDebugData);

  return {
    reportMetadata: {
      schemaVersion: 2,
      generatedAt,
      reportType: 'adaptive_user_system_report',
      inputMode: normalizedProfile.inputMode,
      inputModeLabel,
      language: String(normalizedProfile.language),
      languageLabel,
      intendedUse:
        'Explain the full Dicta adaptive listening loop for this input/language: learner progress, benchmark memory, feedback recency, LLM generation context, planner/chunking behavior, controller pacing, Browser TTS runtime metadata, and compact technical debug. This report is not the compact prompt used for direct session generation.',
      reportLayers: [
        'executiveSummary',
        'adaptiveLoopBreakdown',
        'componentDiagnostics',
        'userProgressSummary',
        'adaptiveSystemSummary',
        'compactTechnicalDebugSummary',
        'technicalDebugData',
      ],
      rawDebugDataPolicy:
        'Keep one button and one report: summarized diagnostics appear first; raw technical debug remains at technicalDebugData for deep troubleshooting.',
      estimatedTechnicalDebugDataBytes,
      ...ttsEnvironmentReport,
    },
    executiveSummary: buildExecutiveSummary({
      profile: normalizedProfile,
      sessionSummary,
      positiveSignals,
      needsImprovement,
      recommendedNextExercise,
    }),
    adaptiveLoopBreakdown: buildAdaptiveLoopBreakdown({
      profile: normalizedProfile,
      feedback,
      feedbackStatus,
      recommendedNextExercise,
      ttsEnvironmentReport,
    }),
    componentDiagnostics: buildComponentDiagnostics({
      profile: normalizedProfile,
      feedback,
      feedbackStatus,
      recommendedNextExercise,
      ttsEnvironmentReport,
      technicalDebugData,
    }),
    compactTechnicalDebugSummary: buildCompactTechnicalDebugSummary(technicalDebugData, estimatedTechnicalDebugDataBytes),
    userProgressSummary: {
      status: sessionSummary ? 'available' : 'no_finished_session',
      howYouDid: buildHowYouDid(sessionSummary),
      latestSession: sessionSummary,
      positiveSignals,
      needsImprovement,
      nextPracticeFocus,
      recommendedNextExercise,
    },
    adaptiveSystemSummary: {
      benchmarkHealth: {
        sessionCount: normalizedProfile.sessionCount,
        sampleCount: normalizedProfile.sampleCount,
        confidence: normalizedProfile.recommendation.confidence,
        weakAreas: normalizedProfile.weakAreas,
        recommendationSummary: normalizedProfile.recommendation.summary,
      },
      whatIsWorking,
      whatNeedsTuning,
      recommendedSystemAdjustments: buildSystemAdjustments(normalizedProfile, sessionSummary, repeatCount, recommendedNextExercise),
      feedbackStatus,
    },
    technicalDebugData,
  };
}

function buildExecutiveSummary({
  profile,
  sessionSummary,
  positiveSignals,
  needsImprovement,
  recommendedNextExercise,
}: {
  profile: InputLanguageBenchmarkMetrics;
  sessionSummary: AdaptiveUserSystemReport['userProgressSummary']['latestSession'];
  positiveSignals: string[];
  needsImprovement: string[];
  recommendedNextExercise: AdaptiveUserSystemReport['userProgressSummary']['recommendedNextExercise'];
}): AdaptiveUserSystemReport['executiveSummary'] {
  const confidence = profile.recommendation.confidence;
  const latestAccuracy = sessionSummary ? Number.parseFloat(sessionSummary.accuracy) : null;
  const needsRecovery =
    confidence < 0.3 ||
    profile.weakAreas.includes('low_accuracy') ||
    profile.weakAreas.includes('lag') ||
    profile.weakAreas.includes('unsafe_boundary_pressure') ||
    profile.weakAreas.includes('unsafe_boundaries');
  const challengeReady =
    recommendedNextExercise.difficulty === 'hard' &&
    confidence >= 0.6 &&
    (latestAccuracy === null || latestAccuracy >= 90) &&
    !profile.weakAreas.includes('lag') &&
    !profile.weakAreas.includes('low_accuracy');
  const status: AdaptiveUserSystemReport['executiveSummary']['status'] = !sessionSummary
    ? 'needs_more_data'
    : needsRecovery
      ? 'recovery_recommended'
      : challengeReady
        ? 'challenge_ready'
        : 'stable';

  const headline =
    status === 'needs_more_data'
      ? `Collect more completed sessions for ${profile.inputMode}/${profile.language}.`
      : status === 'recovery_recommended'
        ? `Use safer listening recovery for ${profile.inputMode}/${profile.language}.`
        : status === 'challenge_ready'
          ? `The learner can cautiously increase challenge for ${profile.inputMode}/${profile.language}.`
          : `Keep a stable adaptive listening plan for ${profile.inputMode}/${profile.language}.`;

  return {
    status,
    headline,
    primaryFinding: needsImprovement[0] ?? positiveSignals[0] ?? profile.recommendation.summary,
    nextBestAction: `${recommendedNextExercise.difficulty.toUpperCase()} next exercise: ${recommendedNextExercise.why}`,
    reportReadingOrder: [
      'Read executiveSummary first.',
      'Use adaptiveLoopBreakdown to understand which component owns each decision.',
      'Use componentDiagnostics for summarized LLM/planner/controller/runtime/benchmark signals.',
      'Use technicalDebugData only when the summarized diagnostics are not enough.',
    ],
  };
}

function buildAdaptiveLoopBreakdown({
  profile,
  feedback,
  feedbackStatus,
  recommendedNextExercise,
  ttsEnvironmentReport,
}: {
  profile: InputLanguageBenchmarkMetrics;
  feedback: AdaptiveSessionFeedback | null;
  feedbackStatus: string;
  recommendedNextExercise: AdaptiveUserSystemReport['userProgressSummary']['recommendedNextExercise'];
  ttsEnvironmentReport: ReturnType<typeof buildTtsEnvironmentReport>;
}): AdaptiveUserSystemReport['adaptiveLoopBreakdown'] {
  return {
    sourceOfTruth: {
      benchmark: 'Long-term adaptive memory scoped by inputMode + language. It stores accepted telemetry, weak areas, and pacing recommendations.',
      feedback: 'Completed-session diagnosis. It can be current, stale, or unavailable depending on the latest finished session.',
      insightReport: 'Human/debug export that explains benchmark + feedback + runtime evidence. It is not the direct LLM prompt.',
    },
    generation: {
      role: 'Generate structured dictation content from a compact adaptive prescription.',
      status: `Next content should be generated at ${recommendedNextExercise.difficulty} difficulty.`,
      evidence: [
        `Target focus: ${profile.recommendation.nextTrainingFocus.join(', ') || 'collect more evidence'}.`,
        `Recommendation confidence: ${formatDecimal(profile.recommendation.confidence)}.`,
      ],
      promptMode: 'compact-adaptive-v2',
      complianceAuditStatus: 'not_recorded_in_this_report_yet',
    },
    plannerAndChunking: {
      role: 'Convert generated macro phrases into safe playable chunks before Browser TTS speaks.',
      status: `Use ${profile.recommendation.targetPhraseSize} chunks with ${profile.recommendation.targetPauseMs}ms target pauses.`,
      evidence: [
        `Average semantic completeness: ${formatDecimal(profile.averageSemanticCompleteness)}.`,
        `Unsafe pauses: ${profile.unsafePauseCount}. Deferred pauses: ${profile.deferredPauseCount}.`,
      ],
    },
    controllerBrain: {
      role: 'Adapt the live listening experience: rate, pause, phrase size, boundary strictness, support/recovery/flow behavior.',
      status: buildControllerStatus(profile),
      evidence: buildExpectedControllerBehavior(profile),
    },
    runtimeExecution: {
      role: 'Apply final Browser TTS/mobile/language constraints so the controller decision can be executed safely.',
      status: profile.inputMode === 'browser-tts'
        ? ttsEnvironmentReport.ttsEnvironment
          ? 'Browser TTS environment metadata is available.'
          : 'Browser TTS environment metadata is missing for this report.'
        : 'This input mode does not use Browser TTS.',
      evidence: [
        profile.environmentChanged || Boolean(ttsEnvironmentReport.environmentChanged)
          ? 'Environment changed recently; interpret benchmark/runtime behavior carefully.'
          : 'No Browser TTS environment change is flagged.',
      ],
    },
    learningLoop: {
      role: 'Feed accepted telemetry and completed-session feedback back into the benchmark for future prescriptions.',
      status: feedbackStatus,
      evidence: [
        `Benchmark sessions: ${profile.sessionCount}. Samples: ${profile.sampleCount}.`,
        feedback ? `Latest feedback verdict: ${feedback.verdict}.` : 'No current feedback object is attached.',
      ],
    },
  };
}

function buildComponentDiagnostics({
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

function buildCompactTechnicalDebugSummary(
  technicalDebugData: unknown,
  estimatedTechnicalDebugDataBytes: number | null,
): AdaptiveUserSystemReport['compactTechnicalDebugSummary'] {
  const debugRecord = asRecord(technicalDebugData);
  const recentTimeline = Array.isArray(debugRecord?.recentTimelinePoints) ? debugRecord.recentTimelinePoints : null;
  return {
    estimatedTechnicalDebugDataBytes,
    rawDebugIncluded: true,
    rawDebugLocation: 'technicalDebugData',
    debugTopLevelKeys: debugRecord ? Object.keys(debugRecord).sort() : [],
    recentTimelinePointCount: recentTimeline ? recentTimeline.length : null,
    note: 'Use the summarized sections above first. The raw technicalDebugData payload is intentionally kept at the end for deep debugging and backward compatibility.',
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

function buildExpectedControllerBehavior(profile: InputLanguageBenchmarkMetrics): string[] {
  const behavior: string[] = [];
  if (profile.weakAreas.includes('lag') || profile.averageLagSec > 3) behavior.push('Prefer lower playback rate or longer pauses until lag stabilizes.');
  if (profile.weakAreas.includes('low_accuracy') || profile.averageAccuracy < 0.78) behavior.push('Enter support/recovery behavior before increasing challenge.');
  if (profile.weakAreas.includes('unsafe_boundary_pressure') || profile.unsafePauseCount > 0) behavior.push('Defer pauses until safe semantic boundaries when needed.');
  if (profile.flowStabilityScore < 0.5) behavior.push('Avoid aggressive mode switches and protect flow stability.');
  return behavior.length > 0 ? behavior : ['Maintain current adaptive pacing and allow gradual progression.'];
}

function buildControllerStatus(profile: InputLanguageBenchmarkMetrics): string {
  if (profile.recommendation.confidence < 0.3) return 'Low confidence: stay conservative and collect more reliable telemetry.';
  if (profile.weakAreas.includes('low_accuracy') || profile.weakAreas.includes('lag')) return 'Support/recovery behavior should be available during playback.';
  if (profile.learningEffectivenessScore >= 0.75 && profile.flowStabilityScore >= 0.75) return 'Stable enough for gradual progression.';
  return 'Use balanced adaptive pacing until more evidence accumulates.';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readString(record: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = record?.[key];
  return typeof value === 'string' ? value : null;
}

function countBy<T>(items: T[], getKey: (item: T) => string | undefined): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = getKey(item) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function topCounts(counts: Record<string, number>, limit: number): Array<{ name: string; count: number }> {
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function formatDecimal(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : 'n/a';
}
