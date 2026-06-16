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

  return {
    reportMetadata: {
      schemaVersion: 1,
      generatedAt,
      reportType: 'adaptive_user_system_report',
      inputMode: normalizedProfile.inputMode,
      inputModeLabel,
      language: String(normalizedProfile.language),
      languageLabel,
      intendedUse:
        'Debug Dicta behavior, understand user progress, tune adaptive pacing/content, and decide what the learner should practice next. This report is not the compact prompt used for direct session generation.',
      estimatedTechnicalDebugDataBytes: estimateJsonBytes(technicalDebugData),
      ...ttsEnvironmentReport,
    },
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
      feedbackStatus: feedback ? `Current feedback is available for session ${feedback.sessionId}.` : 'No current completed-session feedback is available for this input/language yet.',
    },
    technicalDebugData,
  };
}
