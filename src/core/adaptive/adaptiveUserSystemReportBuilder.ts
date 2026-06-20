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
import { buildExecutiveSummary } from './adaptiveUserSystemReportExecutiveSummary';
import { buildAdaptiveLoopBreakdown } from './adaptiveUserSystemReportLoopBreakdown';
import { buildComponentDiagnostics } from './adaptiveUserSystemReportComponentDiagnostics';
import {
  buildCompactTechnicalDebugSummary,
  compactTechnicalDebugData,
} from './adaptiveUserSystemReportDebugSummary';
import { buildAdaptiveUserSystemReportListeningCycleV3 } from './adaptiveUserSystemReportListeningCycleV3';

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
  const listeningCycleV3 = buildAdaptiveUserSystemReportListeningCycleV3({
    profile: normalizedProfile,
    latestSession: sessionSummary,
  });
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
  const reportTechnicalDebugData = compactTechnicalDebugData(technicalDebugData);
  const estimatedTechnicalDebugDataBytes = estimateJsonBytes(reportTechnicalDebugData);

  return {
    reportMetadata: {
      schemaVersion: 3,
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
        'listeningCycleV3',
        'userProgressSummary',
        'adaptiveSystemSummary',
        'compactTechnicalDebugSummary',
        'technicalDebugData',
      ],
      rawDebugDataPolicy:
        'Keep one button and one report: summarized diagnostics appear first; technicalDebugData is compacted for export and keeps raw detail only where it is diagnostically useful.',
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
    listeningCycleV3,
    compactTechnicalDebugSummary: buildCompactTechnicalDebugSummary(reportTechnicalDebugData, estimatedTechnicalDebugDataBytes),
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
    technicalDebugData: reportTechnicalDebugData,
  };
}
