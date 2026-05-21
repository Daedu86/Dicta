import type {
  AdaptiveSessionFeedback,
  AdaptiveTimelinePoint,
  InputLanguageBenchmarkMetrics,
  InputMode,
  LanguageCode,
  PhrasePlaybackEvent,
} from './types';
import {
  buildBrowserTtsDeDiagnostics,
  normalizeInputLanguageBenchmarkForRecommendation,
} from './AdaptiveInputLanguageBenchmarkService';

export type SessionFeedbackBuildArgs = {
  sessionId: string;
  inputMode: InputMode;
  language: LanguageCode;
  sourceType: AdaptiveSessionFeedback['sourceType'];
  createdAt: string;
  completedAt?: string;
  scriptId?: string;
  scriptTitle?: string;
  benchmarkBefore?: InputLanguageBenchmarkMetrics | null;
  benchmarkAfter?: InputLanguageBenchmarkMetrics | null;
  phraseEvents: PhrasePlaybackEvent[];
  totalPhrases?: number;
};

const FEEDBACK_EXPORT_TIMELINE_CAP = 120;

export function selectLatestAdaptiveSessionFeedback(
  feedbackList: readonly AdaptiveSessionFeedback[] | null | undefined,
  inputMode: InputMode,
  language: LanguageCode,
): AdaptiveSessionFeedback | null {
  const targetLanguage = normalizeFeedbackLanguage(language);
  let latest: AdaptiveSessionFeedback | null = null;
  let latestTimestamp = Number.NEGATIVE_INFINITY;

  for (const feedback of feedbackList ?? []) {
    if (feedback.inputMode !== inputMode) continue;
    if (normalizeFeedbackLanguage(feedback.language) !== targetLanguage) continue;

    const timestamp = getFeedbackRecencyTimestampMs(feedback);
    if (!latest || timestamp > latestTimestamp) {
      latest = feedback;
      latestTimestamp = timestamp;
    }
  }

  return latest;
}

export type TimelinePlaybackDiagnostics = {
  source: 'formal_feedback' | 'timeline_fallback';
  repeatedPhraseIndices: Array<{
    phraseIndex: number;
    phraseId?: string;
    textPreview?: string;
    repeatCount: number;
  }>;
  repeatedPhraseCount: number;
  maxRepeatCountForSinglePhrase: number;
  replayCount: number;
  deferPauseCount: number;
  phraseIndexJumpCount: number;
  repeatedPhrasePreviews: string[];
};

export function buildAdaptiveSessionFeedback(args: SessionFeedbackBuildArgs): AdaptiveSessionFeedback {
  const phraseEvents = shouldScopeFeedbackToSession(args.inputMode, args.language)
    ? args.phraseEvents.filter((event) => event.sessionId === args.sessionId)
    : args.phraseEvents;
  const playbackIssues = detectPlaybackIssues(phraseEvents);
  const phraseStats = buildPhraseStats(phraseEvents, args.totalPhrases);
  const improvementDelta = computeImprovementDelta(args.benchmarkBefore, args.benchmarkAfter, playbackIssues);
  const verdict = computeVerdict(improvementDelta.overallImprovementScore, phraseEvents.length);
  const notes = buildFeedbackNotes(playbackIssues, improvementDelta, verdict);
  const sessionCountDroppedReason = deriveSessionCountDroppedReason(args.benchmarkBefore, args.benchmarkAfter);

  return {
    sessionId: args.sessionId,
    inputMode: args.inputMode,
    language: args.language,
    scriptId: args.scriptId,
    scriptTitle: args.scriptTitle,
    createdAt: args.createdAt,
    completedAt: args.completedAt,
    sourceType: args.sourceType,
    benchmarkBefore: args.benchmarkBefore ? compactBenchmark(args.benchmarkBefore) : undefined,
    benchmarkAfter: args.benchmarkAfter ? compactBenchmark(args.benchmarkAfter) : undefined,
    sessionCountDroppedReason,
    improvementDelta,
    playbackIssues,
    phraseStats,
    verdict,
    notes,
  };
}

function shouldScopeFeedbackToSession(inputMode: InputMode, language: LanguageCode): boolean {
  return inputMode === 'browser-tts' && String(language).toLowerCase() === 'de';
}

function normalizeFeedbackLanguage(language: LanguageCode): string {
  return String(language).toLowerCase();
}

function getFeedbackRecencyTimestampMs(feedback: AdaptiveSessionFeedback): number {
  const record = feedback as AdaptiveSessionFeedback & {
    finishedAt?: string;
    updatedAt?: string;
  };
  for (const timestamp of [record.completedAt, record.finishedAt, record.updatedAt, record.createdAt]) {
    const parsed = parseFeedbackTimestampMs(timestamp);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.NEGATIVE_INFINITY;
}

function parseFeedbackTimestampMs(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function deriveSessionCountDroppedReason(
  before: InputLanguageBenchmarkMetrics | null | undefined,
  after: InputLanguageBenchmarkMetrics | null | undefined,
): string | undefined {
  if (!before || !after) return undefined;
  if (after.sessionCount >= before.sessionCount) return undefined;
  if (after.sampleCount < before.sampleCount) {
    return 'sessionCount decreased after rolling-window pruning removed older timeline samples.';
  }
  return 'sessionCount decreased after sessionId-based unique-session recalculation on the current benchmark timeline.';
}

export function buildSessionFeedbackJsonPayload(
  inputMode: InputMode,
  language: LanguageCode,
  feedback: AdaptiveSessionFeedback | null,
  options: { activeSessionStatus?: string; fallbackDiagnostics?: TimelinePlaybackDiagnostics } = {},
): unknown {
  const sessionFeedbackStatus = buildSessionFeedbackStatus(feedback, options.activeSessionStatus);
  return {
    inputMode,
    language,
    sessionFeedbackStatus,
    latestSessionFeedback: feedback ?? buildFeedbackUnavailableSnapshot(sessionFeedbackStatus),
    playbackIssues: feedback?.playbackIssues ?? null,
    fallbackPlaybackDiagnostics: feedback ? null : (options.fallbackDiagnostics ?? null),
    improvementDelta: feedback?.improvementDelta ?? null,
    phraseStats: feedback?.phraseStats ?? null,
  };
}

export function buildBenchmarkFeedbackPackage(
  profile: InputLanguageBenchmarkMetrics,
  feedback: AdaptiveSessionFeedback | null,
  options: { activeSessionStatus?: string; activitySummary?: unknown } = {},
): unknown {
  const normalizedProfile = normalizeInputLanguageBenchmarkForRecommendation(profile);
  const recentTimelinePoints = normalizedProfile.timeline.slice(-FEEDBACK_EXPORT_TIMELINE_CAP);
  const fallbackDiagnostics = feedback ? null : derivePlaybackDiagnosticsFromTimeline(recentTimelinePoints);
  const sessionFeedbackStatus = buildSessionFeedbackStatus(feedback, options.activeSessionStatus);
  const browserTtsDeDiagnostics = buildBrowserTtsDeDiagnostics(normalizedProfile, FEEDBACK_EXPORT_TIMELINE_CAP) ?? undefined;
  return {
    inputMode: normalizedProfile.inputMode,
    language: normalizedProfile.language,
    sessionFeedbackStatus,
    benchmarkProfile: compactBenchmark(normalizedProfile),
    recommendation: normalizedProfile.recommendation,
    weakAreas: normalizedProfile.weakAreas,
    ...(browserTtsDeDiagnostics ? { browserTtsDeDiagnostics } : {}),
    activitySummary: options.activitySummary ?? null,
    recentTimelinePoints,
    latestSessionFeedback: feedback ? normalizeFeedbackBenchmarkSnapshots(feedback) : buildFeedbackUnavailableSnapshot(sessionFeedbackStatus),
    playbackDiagnostics: feedback?.playbackIssues ?? fallbackDiagnostics,
    dictationScript: feedback?.scriptTitle
      ? {
          scriptId: feedback.scriptId,
          scriptTitle: feedback.scriptTitle,
        }
      : null,
  };
}

function normalizeFeedbackBenchmarkSnapshots(feedback: AdaptiveSessionFeedback): AdaptiveSessionFeedback {
  return {
    ...feedback,
    benchmarkBefore: addBenchmarkCountSemantics(feedback.benchmarkBefore),
    benchmarkAfter: addBenchmarkCountSemantics(feedback.benchmarkAfter),
  };
}

function addBenchmarkCountSemantics<T extends Partial<InputLanguageBenchmarkMetrics> | undefined>(
  benchmark: T,
): T extends undefined
  ? undefined
  : Partial<InputLanguageBenchmarkMetrics> & {
      benchmarkSessionCount: number;
      acceptedTelemetrySamples: number;
      countSemantics: string;
    } {
  if (!benchmark) return undefined as never;
  return {
    ...benchmark,
    benchmarkSessionCount: benchmark.sessionCount ?? 0,
    acceptedTelemetrySamples: benchmark.sampleCount ?? 0,
    countSemantics:
      'sessionCount/benchmarkSessionCount count unique sessions represented by accepted adaptive telemetry samples; sampleCount/acceptedTelemetrySamples count accepted timeline samples, not all saved sessions.',
  } as never;
}

export function buildBenchmarkFeedbackPromptPackage(
  profile: InputLanguageBenchmarkMetrics,
  feedback: AdaptiveSessionFeedback | null,
  llmPrompt: string,
  options: { activeSessionStatus?: string; activitySummary?: unknown } = {},
): string {
  const packageJson = JSON.stringify(buildBenchmarkFeedbackPackage(profile, feedback, options), null, 2);
  return [
    'Benchmark + session feedback package:',
    packageJson,
    '',
    'Additional LLM instructions:',
    '- Use the session feedback to decide whether the generated DictationScript improved, stayed stable, or regressed.',
    '- Avoid repeating problematic phrases listed in playbackIssues.repeatedPhrases.',
    '- If repeatedPhraseCount is high, reduce phrase complexity and shorten replay-sensitive phrases.',
    '- Preserve phrase order. Replay must repeat the current phrase and must not advance to the next phrase.',
    '- Do not introduce unsafe mid-grammar splits.',
    '- Adjust the next DictationScript based on actual improvementDelta and verdict.',
    '',
    llmPrompt,
  ].join('\n');
}

export function derivePlaybackDiagnosticsFromTimeline(
  timeline: AdaptiveTimelinePoint[],
): TimelinePlaybackDiagnostics {
  const points = [...timeline]
    .filter((point) => typeof point.phraseIndex === 'number')
    .sort((a, b) => a.timestampMs - b.timestampMs);
  const replayCountsByIndex = new Map<number, { phraseId?: string; repeatCount: number }>();
  let replayCount = 0;
  let deferPauseCount = 0;
  let phraseIndexJumpCount = 0;
  let lastPhraseIndex: number | null = null;

  for (const point of points) {
    if (point.event === 'replay') {
      replayCount += 1;
      const phraseIndex = point.phraseIndex ?? -1;
      const current = replayCountsByIndex.get(phraseIndex) ?? { phraseId: point.phraseId, repeatCount: 0 };
      replayCountsByIndex.set(phraseIndex, {
        phraseId: current.phraseId ?? point.phraseId,
        repeatCount: current.repeatCount + 1,
      });
    }
    if (point.event === 'defer_pause') {
      deferPauseCount += 1;
    }
    if (point.event === 'phrase_advance' && typeof point.phraseIndex === 'number') {
      if (lastPhraseIndex !== null && point.phraseIndex > lastPhraseIndex + 1) {
        phraseIndexJumpCount += 1;
      }
      lastPhraseIndex = point.phraseIndex;
    }
  }

  const repeatedPhraseIndices = [...replayCountsByIndex.entries()]
    .map(([phraseIndex, entry]) => ({
      phraseIndex,
      phraseId: entry.phraseId,
      repeatCount: entry.repeatCount,
    }))
    .filter((entry) => entry.repeatCount > 0)
    .sort((a, b) => b.repeatCount - a.repeatCount);

  return {
    source: 'timeline_fallback',
    repeatedPhraseIndices,
    repeatedPhraseCount: repeatedPhraseIndices.reduce((sum, entry) => sum + entry.repeatCount, 0),
    maxRepeatCountForSinglePhrase: repeatedPhraseIndices.reduce((max, entry) => Math.max(max, entry.repeatCount), 0),
    replayCount,
    deferPauseCount,
    phraseIndexJumpCount,
    repeatedPhrasePreviews: repeatedPhraseIndices.map((entry) =>
      entry.phraseId ? `${entry.phraseId} / index ${entry.phraseIndex}` : `index ${entry.phraseIndex}`,
    ),
  };
}

export function detectPlaybackIssues(events: PhrasePlaybackEvent[]): AdaptiveSessionFeedback['playbackIssues'] {
  // Guardrail: phraseIndex is the canonical playback position.
  // phraseId is opaque metadata and must not drive ordering/jump logic.
  const startsByIndex = new Map<number, PhrasePlaybackEvent[]>();
  const startedByIndex = new Map<number, PhrasePlaybackEvent>();
  const skippedPhrases: AdaptiveSessionFeedback['playbackIssues']['skippedPhrases'] = [];
  let outOfOrderAdvanceCount = 0;
  let replayAdvancedPhraseCount = 0;
  let phraseIndexJumpCount = 0;
  let lastStartedIndex: number | null = null;
  let lastReplayIndex: number | null = null;

  for (const event of events) {
    if (event.event === 'phrase_started') {
      startsByIndex.set(event.phraseIndex, [...(startsByIndex.get(event.phraseIndex) ?? []), event]);
      startedByIndex.set(event.phraseIndex, event);
      if (lastStartedIndex !== null) {
        if (event.phraseIndex > lastStartedIndex + 1) {
          phraseIndexJumpCount += 1;
          for (let index = lastStartedIndex + 1; index < event.phraseIndex; index += 1) {
            skippedPhrases.push({
              phraseId: `index-${index}`,
              textPreview: startedByIndex.get(index)?.textPreview ?? '',
              expectedIndex: index,
            });
          }
        }
        if (event.phraseIndex < lastStartedIndex) {
          outOfOrderAdvanceCount += 1;
        }
      }
      if (lastReplayIndex !== null && event.phraseIndex !== lastReplayIndex) {
        replayAdvancedPhraseCount += 1;
      }
      lastStartedIndex = event.phraseIndex;
      lastReplayIndex = null;
    }

    if (event.event === 'phrase_replayed') {
      lastReplayIndex = event.phraseIndex;
    }

    if (event.event === 'phrase_advanced' && lastStartedIndex !== null && event.phraseIndex !== lastStartedIndex + 1) {
      outOfOrderAdvanceCount += 1;
    }
  }

  const repeatedPhrases = [...startsByIndex.entries()]
    .map(([phraseIndex, starts]) => ({
      phraseId: starts[0]?.phraseId ?? `index-${phraseIndex}`,
      textPreview: starts[0]?.textPreview ?? '',
      repeatCount: Math.max(0, starts.length - 1),
      timestampsMs: starts.map((event) => event.timestampMs),
    }))
    .filter((entry) => entry.repeatCount > 0)
    .sort((a, b) => b.repeatCount - a.repeatCount);

  return {
    repeatedPhraseCount: repeatedPhrases.reduce((sum, entry) => sum + entry.repeatCount, 0),
    maxRepeatCountForSinglePhrase: repeatedPhrases.reduce((max, entry) => Math.max(max, entry.repeatCount), 0),
    repeatedPhrases,
    skippedPhraseCount: skippedPhrases.length,
    skippedPhrases,
    outOfOrderAdvanceCount,
    replayAdvancedPhraseCount,
    phraseIndexJumpCount,
  };
}

export function computeImprovementDelta(
  before: InputLanguageBenchmarkMetrics | null | undefined,
  after: InputLanguageBenchmarkMetrics | null | undefined,
  playbackIssues: AdaptiveSessionFeedback['playbackIssues'],
): AdaptiveSessionFeedback['improvementDelta'] {
  const accuracyDelta = metricDelta(before?.averageAccuracy, after?.averageAccuracy);
  const lagDelta = Math.abs(before?.averageLagSec ?? 0) - Math.abs(after?.averageLagSec ?? 0);
  const wpmDelta = metricDelta(before?.averageWpm, after?.averageWpm);
  const sweetSpotScoreDelta = metricDelta(before?.sweetSpotScore, after?.sweetSpotScore);
  const semanticFidelityDelta = metricDelta(before?.semanticFidelityScore, after?.semanticFidelityScore);
  const controlFidelityDelta = metricDelta(before?.controlFidelityScore, after?.controlFidelityScore);
  const learningEffectivenessDelta = metricDelta(before?.learningEffectivenessScore, after?.learningEffectivenessScore);
  const flowStabilityDelta = metricDelta(before?.flowStabilityScore, after?.flowStabilityScore);
  const issuePenalty =
    playbackIssues.repeatedPhraseCount * 0.04 +
    playbackIssues.skippedPhraseCount * 0.08 +
    playbackIssues.phraseIndexJumpCount * 0.1 +
    playbackIssues.replayAdvancedPhraseCount * 0.12;
  const positiveSignal =
    normalizeDelta(accuracyDelta, 0.1) * 0.18 +
    normalizeDelta(lagDelta, 1) * 0.18 +
    normalizeDelta(wpmDelta, 8) * 0.08 +
    normalizeDelta(sweetSpotScoreDelta, 0.2) * 0.2 +
    normalizeDelta(semanticFidelityDelta, 0.2) * 0.12 +
    normalizeDelta(controlFidelityDelta, 0.2) * 0.1 +
    normalizeDelta(learningEffectivenessDelta, 0.2) * 0.1 +
    normalizeDelta(flowStabilityDelta, 0.2) * 0.04;
  const overallImprovementScore = clamp01(0.5 + positiveSignal - issuePenalty);

  return {
    accuracyDelta,
    lagDelta,
    wpmDelta,
    sweetSpotScoreDelta,
    semanticFidelityDelta,
    controlFidelityDelta,
    learningEffectivenessDelta,
    flowStabilityDelta,
    overallImprovementScore,
  };
}

function buildPhraseStats(events: PhrasePlaybackEvent[], totalPhrases?: number): AdaptiveSessionFeedback['phraseStats'] {
  const completed = new Set(events.filter((event) => event.event === 'phrase_completed').map((event) => event.phraseId));
  const replayCount = events.filter((event) => event.event === 'phrase_replayed').length;
  const phraseAdvanceCount = events.filter((event) => event.event === 'phrase_advanced').length;
  const starts = events.filter((event) => event.event === 'phrase_started').length;
  const uniqueStarted = new Set(events.filter((event) => event.event === 'phrase_started').map((event) => event.phraseId)).size;
  return {
    totalPhrases: totalPhrases ?? uniqueStarted,
    completedPhrases: completed.size,
    replayCount,
    phraseAdvanceCount,
    averageRepeatsPerPhrase: uniqueStarted > 0 ? Math.max(0, starts - uniqueStarted) / uniqueStarted : 0,
  };
}

function computeVerdict(score: number, eventCount: number): AdaptiveSessionFeedback['verdict'] {
  if (eventCount === 0) return 'inconclusive';
  if (score > 0.6) return 'improved';
  if (score >= 0.45) return 'stable';
  return 'regressed';
}

function buildFeedbackNotes(
  issues: AdaptiveSessionFeedback['playbackIssues'],
  delta: AdaptiveSessionFeedback['improvementDelta'],
  verdict: AdaptiveSessionFeedback['verdict'],
): string[] {
  const notes = [`Verdict: ${verdict}.`];
  if (issues.maxRepeatCountForSinglePhrase > 0) {
    notes.push(`A phrase repeated ${issues.maxRepeatCountForSinglePhrase} time(s).`);
  }
  if (issues.skippedPhraseCount > 0 || issues.phraseIndexJumpCount > 0) {
    notes.push('Phrase order issues were detected.');
  }
  if (delta.accuracyDelta < 0) {
    notes.push('Accuracy moved down after this session.');
  }
  if (delta.lagDelta < 0) {
    notes.push('Lag moved farther from zero after this session.');
  }
  return notes;
}

function buildSessionFeedbackStatus(
  feedback: AdaptiveSessionFeedback | null,
  activeSessionStatus?: string,
): string {
  if (feedback) return 'completed_feedback_available';
  if (activeSessionStatus === 'running' || activeSessionStatus === 'paused' || activeSessionStatus === 'ready') {
    return `session_${activeSessionStatus}_no_completed_feedback_yet`;
  }
  return 'no_completed_feedback_available';
}

function buildFeedbackUnavailableSnapshot(status: string): { status: string; message: string } {
  return {
    status,
    message: 'Formal completed-session feedback is not available for this selected input/language profile yet.',
  };
}

function compactBenchmark(profile: InputLanguageBenchmarkMetrics): Partial<InputLanguageBenchmarkMetrics> & {
  benchmarkSessionCount: number;
  acceptedTelemetrySamples: number;
  countSemantics: string;
} {
  const normalizedProfile = normalizeInputLanguageBenchmarkForRecommendation(profile);
  return {
    inputMode: normalizedProfile.inputMode,
    language: normalizedProfile.language,
    sessionCount: normalizedProfile.sessionCount,
    sampleCount: normalizedProfile.sampleCount,
    benchmarkSessionCount: normalizedProfile.sessionCount,
    acceptedTelemetrySamples: normalizedProfile.sampleCount,
    countSemantics:
      'sessionCount/benchmarkSessionCount count unique sessions represented by accepted adaptive telemetry samples; sampleCount/acceptedTelemetrySamples count accepted timeline samples, not all saved sessions.',
    lastUpdatedAt: normalizedProfile.lastUpdatedAt,
    sweetSpotScore: normalizedProfile.sweetSpotScore,
    semanticFidelityScore: normalizedProfile.semanticFidelityScore,
    controlFidelityScore: normalizedProfile.controlFidelityScore,
    learningEffectivenessScore: normalizedProfile.learningEffectivenessScore,
    flowStabilityScore: normalizedProfile.flowStabilityScore,
    averageAccuracy: normalizedProfile.averageAccuracy,
    averageWpm: normalizedProfile.averageWpm,
    averageLagSec: normalizedProfile.averageLagSec,
    weakAreas: normalizedProfile.weakAreas,
    recommendation: normalizedProfile.recommendation,
  };
}

function metricDelta(before = 0, after = 0): number {
  return after - before;
}

function normalizeDelta(value: number, scale: number): number {
  return clamp(value / Math.max(scale, 0.0001), -1, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}
