import type { BrowserTtsEnvironmentFingerprint, BrowserTtsEnvironmentHistoryEntry } from '../../types/dictation';
import {
  createEmptyInputLanguageBenchmark,
  normalizeInputLanguageBenchmarkForRecommendation,
} from './AdaptiveInputLanguageBenchmarkService';
import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics } from './types';

import type { AdaptiveReportSession, AdaptiveUserSystemReport } from './adaptiveUserSystemReportTypes';
import {
  buildPositiveSignals,
  buildNeedsImprovement,
  buildNextPracticeFocus,
} from './adaptiveUserSystemReportSignals';
import {
  buildHowYouDid,
  normalizePercent,
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

function buildTtsEnvironmentReport(
  profile: InputLanguageBenchmarkMetrics,
  feedback: AdaptiveSessionFeedback | null,
  latestSession: AdaptiveReportSession | null,
): {
  ttsEnvironment?: BrowserTtsEnvironmentFingerprint;
  ttsEnvironmentHistory?: BrowserTtsEnvironmentHistoryEntry[];
  environmentChanged?: boolean;
} {
  if (profile.inputMode !== 'browser-tts') return {};
  const ttsEnvironment = latestSession?.ttsEnvironment ?? feedback?.ttsEnvironment ?? profile.ttsEnvironment;
  const history = profile.ttsEnvironmentHistory;
  return {
    ...(ttsEnvironment ? { ttsEnvironment } : {}),
    ...(history && history.length > 0 ? { ttsEnvironmentHistory: history } : {}),
    ...(profile.environmentChanged || (history && history.length > 1) ? { environmentChanged: true } : {}),
  };
}

function buildRecommendedNextExercise(
  profile: InputLanguageBenchmarkMetrics,
  session: AdaptiveUserSystemReport['userProgressSummary']['latestSession'],
  repeatCount: number,
  focus: string[],
): AdaptiveUserSystemReport['userProgressSummary']['recommendedNextExercise'] {
  const accuracy = session ? Number.parseFloat(session.accuracy) : normalizePercent(profile.averageAccuracy);
  const lag = session ? Math.abs(Number.parseFloat(session.lag)) : Math.abs(profile.averageLagSec);
  const shouldLower = accuracy < 78 || lag > 4 || repeatCount > 5 || profile.weakAreas.includes('low_accuracy');
  const canRaise = accuracy >= 92 && lag <= 1.5 && repeatCount <= 1 && !profile.weakAreas.includes('lag') && !profile.weakAreas.includes('low_accuracy');
  const difficulty = shouldLower ? 'easy' : canRaise ? 'hard' : 'normal';
  const contentGuidance =
    difficulty === 'easy'
      ? ['Use everyday vocabulary.', 'Use shorter clauses.', 'Avoid dense sentence nesting.']
      : difficulty === 'hard'
        ? ['Increase vocabulary variety gradually.', 'Use richer grammar while preserving clear phrase boundaries.']
        : ['Use medium-complexity everyday content.', 'Keep phrases replayable and semantically complete.'];
  const pacingGuidance = [
    lag > 3 ? 'Slow playback or increase pause after phrase.' : 'Keep playback near the recommended target range.',
    repeatCount > 3 ? 'Prefer sentence/clause boundaries that can be replayed independently.' : 'Keep replay boundaries stable.',
  ];
  return {
    difficulty,
    why: shouldLower
      ? 'The learner needs more support before increasing difficulty.'
      : canRaise
        ? 'Accuracy and lag are strong enough to increase challenge gradually.'
        : 'The learner is best served by a stable medium challenge.',
    focus,
    contentGuidance,
    pacingGuidance,
  };
}

function buildSystemWorkingSignals(
  profile: InputLanguageBenchmarkMetrics,
  session: AdaptiveUserSystemReport['userProgressSummary']['latestSession'],
  feedback: AdaptiveSessionFeedback | null,
): string[] {
  const signals: string[] = [];
  if (profile.recommendation.confidence >= 0.45) signals.push('Recommendation confidence is usable for adaptive decisions.');
  if (profile.sampleCount > 0) signals.push(`Benchmark is receiving accepted telemetry for ${profile.inputMode}/${profile.language}.`);
  if (profile.controlFidelityScore >= 0.75) signals.push('Control fidelity indicates pacing decisions are mostly executable.');
  if (session && Number.parseFloat(session.accuracy) >= 82) signals.push('Latest session accuracy is high enough to keep adapting from user performance.');
  if (feedback && feedback.verdict !== 'regressed') signals.push('Latest feedback does not indicate a clear regression.');
  return signals.length > 0 ? signals : ['System has insufficient evidence; collect more completed sessions.'];
}

function buildSystemTuningSignals(
  profile: InputLanguageBenchmarkMetrics,
  needsImprovement: string[],
  feedback: AdaptiveSessionFeedback | null,
): string[] {
  const tuning = [...needsImprovement];
  if (profile.recommendation.confidence < 0.3) tuning.push('Recommendation confidence is low; avoid aggressive changes.');
  if (feedback?.verdict === 'regressed') tuning.push('Latest feedback regressed; reduce challenge and inspect playback behavior.');
  return tuning.length > 0 ? tuning.slice(0, 8) : ['No urgent tuning issue detected; continue gradual adaptation.'];
}

function buildSystemAdjustments(
  profile: InputLanguageBenchmarkMetrics,
  session: AdaptiveUserSystemReport['userProgressSummary']['latestSession'],
  repeatCount: number,
  recommended: AdaptiveUserSystemReport['userProgressSummary']['recommendedNextExercise'],
): AdaptiveUserSystemReport['adaptiveSystemSummary']['recommendedSystemAdjustments'] {
  const targetRate = profile.recommendation.targetRateRange;
  const lag = session ? Math.abs(Number.parseFloat(session.lag)) : Math.abs(profile.averageLagSec);
  return {
    playbackRate:
      lag > 3 || profile.weakAreas.includes('high_rate')
        ? `Prefer the lower end of ${targetRate[0].toFixed(2)}x-${targetRate[1].toFixed(2)}x until lag stabilizes.`
        : `Use the recommended ${targetRate[0].toFixed(2)}x-${targetRate[1].toFixed(2)}x range.`,
    pauseAfterPhraseMs:
      lag > 3 || repeatCount > 3
        ? `Increase pause above ${profile.recommendation.targetPauseMs}ms when phrases are dense or repeated.`
        : `Keep pause near ${profile.recommendation.targetPauseMs}ms.`,
    phraseLength:
      profile.weakAreas.includes('long_phrases') || repeatCount > 3
        ? 'Use shorter phrases with sentence or clause boundaries.'
        : `Use ${profile.recommendation.targetPhraseSize} phrases.`,
    difficulty: `Generate the next exercise at ${recommended.difficulty} difficulty.`,
    replayBoundaries:
      profile.weakAreas.includes('replay') || profile.weakAreas.includes('unsafe_boundaries') || repeatCount > 3
        ? 'Prioritize independently replayable sentence/clause boundaries and avoid unsafe mid-grammar cuts.'
        : 'Keep current replay-boundary strictness unless new repeats appear.',
  };
}

function estimateJsonBytes(value: unknown): number | null {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return null;
  }
}

function normalizeReportProfile(profile: InputLanguageBenchmarkMetrics): InputLanguageBenchmarkMetrics {
  const base = createEmptyInputLanguageBenchmark(profile.inputMode, profile.language);
  const candidate = profile as Partial<InputLanguageBenchmarkMetrics>;
  return normalizeInputLanguageBenchmarkForRecommendation({
    ...base,
    ...candidate,
    inputMode: profile.inputMode,
    language: profile.language,
    rollingWindowDays: 30,
    weakAreas: Array.isArray(candidate.weakAreas) ? candidate.weakAreas : base.weakAreas,
    rateAccuracyBuckets: Array.isArray(candidate.rateAccuracyBuckets) ? candidate.rateAccuracyBuckets : base.rateAccuracyBuckets,
    timeline: Array.isArray(candidate.timeline) ? candidate.timeline : base.timeline,
    recommendation: {
      ...base.recommendation,
      ...(candidate.recommendation ?? {}),
      targetRateRange: Array.isArray(candidate.recommendation?.targetRateRange)
        ? candidate.recommendation.targetRateRange
        : base.recommendation.targetRateRange,
      nextTrainingFocus: Array.isArray(candidate.recommendation?.nextTrainingFocus)
        ? candidate.recommendation.nextTrainingFocus
        : base.recommendation.nextTrainingFocus,
    },
  } as InputLanguageBenchmarkMetrics);
}
