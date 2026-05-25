import { computeSessionMaxPoints, formatSessionPointsLabel, type SessionPointsSource } from '../evaluation';
import {
  createEmptyInputLanguageBenchmark,
  normalizeInputLanguageBenchmarkForRecommendation,
} from './AdaptiveInputLanguageBenchmarkService';
import type { AdaptiveSessionFeedback, AdaptiveWeakArea, InputLanguageBenchmarkMetrics } from './types';

export type AdaptiveReportSessionMetrics = {
  score: number;
  points: number;
  accuracy: number;
  wpm: number;
  lagSec: number;
  rate?: number;
  trend?: 'improving' | 'stable' | 'declining' | string;
};

export type AdaptiveReportSession = SessionPointsSource & {
  id: string;
  name: string;
  status?: string;
  difficulty?: string;
  inputModeLabel?: string;
  language?: string;
  updatedAt?: string;
  createdAt?: string;
  durationLabel?: string;
  metrics: AdaptiveReportSessionMetrics;
  telemetry?: {
    repeatCount?: number;
    finishedAt?: string | null;
  };
  dictationScript?: {
    title?: string;
    difficulty?: string;
    estimatedDurationSec?: number;
    phrases?: unknown[];
  } | null;
};

export type AdaptiveUserSystemReport = {
  reportMetadata: {
    schemaVersion: 1;
    generatedAt: string;
    reportType: 'adaptive_user_system_report';
    inputMode: InputLanguageBenchmarkMetrics['inputMode'];
    inputModeLabel: string;
    language: string;
    languageLabel: string;
    intendedUse: string;
    estimatedTechnicalDebugDataBytes: number | null;
  };
  userProgressSummary: {
    status: 'available' | 'no_finished_session';
    howYouDid: string;
    latestSession: null | {
      id: string;
      name: string;
      status?: string;
      difficulty: string | null;
      inputMode: string | null;
      language: string | null;
      score: number;
      points: string;
      accuracy: string;
      wpm: string;
      lag: string;
      duration: string | null;
      updatedAt: string | null;
      finishedAt: string | null;
      trend: string | null;
      repeatCount: number | null;
    };
    positiveSignals: string[];
    needsImprovement: string[];
    nextPracticeFocus: string[];
    recommendedNextExercise: {
      difficulty: 'easy' | 'normal' | 'hard';
      why: string;
      focus: string[];
      contentGuidance: string[];
      pacingGuidance: string[];
    };
  };
  adaptiveSystemSummary: {
    benchmarkHealth: {
      sessionCount: number;
      sampleCount: number;
      confidence: number;
      weakAreas: AdaptiveWeakArea[];
      recommendationSummary: string;
    };
    whatIsWorking: string[];
    whatNeedsTuning: string[];
    recommendedSystemAdjustments: {
      playbackRate: string;
      pauseAfterPhraseMs: string;
      phraseLength: string;
      difficulty: string;
      replayBoundaries: string;
    };
    feedbackStatus: string;
  };
  technicalDebugData: unknown;
};

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

function summarizeLatestSession(session: AdaptiveReportSession): AdaptiveUserSystemReport['userProgressSummary']['latestSession'] {
  const maxPoints = computeSessionMaxPoints(session);
  const pointsLabel = formatSessionPointsLabel(session.metrics.points, maxPoints);
  return {
    id: session.id,
    name: session.name,
    status: session.status,
    difficulty: session.difficulty ?? session.dictationScript?.difficulty ?? null,
    inputMode: session.inputModeLabel ?? session.inputMode ?? null,
    language: session.language ?? null,
    score: session.metrics.score,
    points: pointsLabel,
    accuracy: `${normalizePercent(session.metrics.accuracy).toFixed(1)}%`,
    wpm: session.metrics.wpm.toFixed(1),
    lag: `${session.metrics.lagSec.toFixed(2)}s`,
    duration: session.durationLabel ?? null,
    updatedAt: session.updatedAt ?? null,
    finishedAt: session.telemetry?.finishedAt ?? null,
    trend: session.metrics.trend ?? null,
    repeatCount: typeof session.telemetry?.repeatCount === 'number' ? session.telemetry.repeatCount : null,
  };
}

function buildHowYouDid(session: AdaptiveUserSystemReport['userProgressSummary']['latestSession']): string {
  if (!session) {
    return 'No finished session is available for this selected input/language yet, so the learner summary is based on benchmark data only.';
  }
  return `${session.name} finished with ${session.accuracy} accuracy, ${session.points} points, ${session.wpm} WPM, ${session.lag} lag, and score ${session.score}.`;
}

function buildPositiveSignals(
  profile: InputLanguageBenchmarkMetrics,
  session: AdaptiveUserSystemReport['userProgressSummary']['latestSession'],
  feedback: AdaptiveSessionFeedback | null,
): string[] {
  const signals: string[] = [];
  if (session) {
    const accuracy = Number.parseFloat(session.accuracy);
    const lag = Math.abs(Number.parseFloat(session.lag));
    const wpm = Number.parseFloat(session.wpm);
    const pointsRatio = parsePointsRatio(session.points);
    if (accuracy >= 88) signals.push(`Strong latest-session accuracy at ${session.accuracy}.`);
    if (lag <= 1.5) signals.push(`Timing lag is controlled at ${session.lag}.`);
    if (wpm >= 35) signals.push(`Typing pace is usable at ${session.wpm} WPM.`);
    if (pointsRatio !== null && pointsRatio >= 0.75) signals.push(`Matched-word coverage is solid at ${session.points} points.`);
    if (session.trend === 'improving') signals.push('Latest session trend is improving.');
  }
  if (profile.sampleCount >= 8) signals.push(`Adaptive benchmark has ${profile.sampleCount} accepted telemetry samples.`);
  if (profile.flowStabilityScore >= 0.78) signals.push('Flow stability is currently healthy.');
  if (feedback && feedback.verdict === 'improved') signals.push('Latest formal session feedback marked the run as improved.');
  return signals.length > 0 ? signals : ['No strong positive signal is available yet; collect more finished sessions for a clearer trend.'];
}

function buildNeedsImprovement(
  profile: InputLanguageBenchmarkMetrics,
  session: AdaptiveUserSystemReport['userProgressSummary']['latestSession'],
  feedback: AdaptiveSessionFeedback | null,
): string[] {
  const needs: string[] = [];
  if (session) {
    const accuracy = Number.parseFloat(session.accuracy);
    const lag = Math.abs(Number.parseFloat(session.lag));
    const repeats = session.repeatCount ?? 0;
    if (accuracy < 82) needs.push(`Accuracy needs work: latest session was ${session.accuracy}.`);
    if (lag > 3) needs.push(`Timing lag needs attention: latest session lag was ${session.lag}.`);
    if (repeats > 3) needs.push(`Replay/repeat load is high: ${repeats} repeat(s) in the latest session.`);
  }
  if (feedback?.playbackIssues.repeatedPhraseCount) {
    needs.push(`Playback feedback found ${feedback.playbackIssues.repeatedPhraseCount} repeated phrase event(s).`);
  }
  if (feedback?.playbackIssues.skippedPhraseCount) {
    needs.push(`Playback feedback found ${feedback.playbackIssues.skippedPhraseCount} skipped phrase event(s).`);
  }
  for (const weakArea of profile.weakAreas) {
    needs.push(formatWeakAreaNeed(weakArea));
  }
  if (profile.flowStabilityScore < 0.65) needs.push('Flow stability is low; pacing may be changing too much or too often.');
  return [...new Set(needs)].slice(0, 8);
}

function buildNextPracticeFocus(profile: InputLanguageBenchmarkMetrics, needsImprovement: string[]): string[] {
  const focus = [...profile.recommendation.nextTrainingFocus];
  if (profile.weakAreas.includes('lag')) focus.push('reduce lag with slower rate or longer pauses');
  if (profile.weakAreas.includes('low_accuracy')) focus.push('rebuild accuracy before increasing difficulty');
  if (profile.weakAreas.includes('replay')) focus.push('make phrases easier to replay independently');
  if (profile.weakAreas.includes('long_phrases')) focus.push('shorten phrase length');
  if (needsImprovement.length === 0) focus.push('continue gradual difficulty increase');
  return [...new Set(focus)].slice(0, 6);
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

function formatWeakAreaNeed(weakArea: AdaptiveWeakArea): string {
  const labels: Record<AdaptiveWeakArea, string> = {
    long_phrases: 'Long phrases are a weak area; shorten phrase length.',
    numbers: 'Numbers are a weak area; add focused number practice.',
    names: 'Names are a weak area; reduce unfamiliar names or practice them deliberately.',
    punctuation: 'Punctuation is a weak area; simplify punctuation load.',
    high_rate: 'High playback rate is hurting performance; slow down.',
    low_semantic_completeness: 'Phrase boundaries need clearer semantic completeness.',
    unsafe_boundaries: 'Unsafe pause boundaries need tuning.',
    replay: 'Replay behavior needs tuning.',
    lag: 'Lag is a weak area; tune rate and pauses.',
    lag_instability: 'Lag instability is a weak area; stabilize pacing.',
    corrections: 'Corrections are high; reduce density and reinforce accuracy.',
    low_accuracy: 'Accuracy is a weak area; lower challenge until accuracy recovers.',
    accuracy_instability: 'Accuracy instability is a weak area; keep the next session steadier.',
    support_dependency: 'Support dependency is high; reduce support gradually only after accuracy stabilizes.',
    unsafe_boundary_pressure: 'Runtime pressure is producing unsafe boundary risk; use safer phrase cuts.',
    flow_instability: 'Flow stability needs tuning; reduce abrupt rate/pause changes.',
  };
  return labels[weakArea] ?? `Weak area: ${weakArea}.`;
}

function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value <= 1 ? value * 100 : value;
}

function parsePointsRatio(pointsLabel: string): number | null {
  const [earnedText, totalText] = pointsLabel.split('/');
  const earned = Number(earnedText);
  const total = Number(totalText);
  if (!Number.isFinite(earned) || !Number.isFinite(total) || total <= 0) return null;
  return earned / total;
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
