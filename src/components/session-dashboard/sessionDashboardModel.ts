import type { Transcript } from '../../types/dictation';
import {
  buildListeningCycleInsightReportV3,
  type ListeningCycleInsightReportV3Frame,
} from '../../core/adaptive/types';
import { alignWordPairs } from '../../core/evaluation';
import { normalizeWord } from '../../core/normalization';
import type { DashboardGoals, SessionDashboardSession, TranscriptReview } from './sessionDashboardTypes';

export function buildTranscriptReview(session: SessionDashboardSession): TranscriptReview {
  const typedSource = session.ttsPracticeText;
  const targetTranscript = buildTextTranscript(session.ttsText);
  const rawTypedWords = typedSource.split(/\s+/).filter(Boolean);
  const typedWords = rawTypedWords.map((word) => normalizeWord(word)).filter(Boolean);
  const targetWords = targetTranscript ? targetTranscript.words.map((word) => normalizeWord(word.word)).filter(Boolean) : [];

  if (typedWords.length === 0 || targetWords.length === 0) {
    return {
      tokens: [],
      correct: 0,
      fuzzy: 0,
      extra: typedWords.length,
      missed: targetWords.length,
    };
  }

  const pairs = alignWordPairs(typedWords, targetWords);
  const pairByTypedIndex = new Map(pairs.map((pair) => [pair.typedIndex, pair]));
  let correct = 0;
  let fuzzy = 0;
  let extra = 0;

  const tokens = typedWords.map((word, typedIndex) => {
    const pair = pairByTypedIndex.get(typedIndex);
    if (!pair) {
      extra += 1;
      return {
        typedIndex,
        word: rawTypedWords[typedIndex] ?? word,
        expected: targetWords[Math.min(typedIndex, targetWords.length - 1)] ?? '',
        status: 'extra' as const,
        points: 0,
      };
    }

    if (pair.exact) {
      correct += 1;
    } else {
      fuzzy += 1;
    }

    return {
      typedIndex,
      word: rawTypedWords[typedIndex] ?? word,
      expected: pair.exact ? '' : targetWords[pair.targetIndex] ?? '',
      status: pair.exact ? ('correct' as const) : ('fuzzy' as const),
      points: 1,
    };
  });

  return {
    tokens,
    correct,
    fuzzy,
    extra,
    missed: Math.max(targetWords.length - pairs.length, 0),
  };
}

export function buildAdaptiveGoals(sessions: SessionDashboardSession[], currentSession: SessionDashboardSession): DashboardGoals {
  const finishedSessions = sessions.filter(
    (session) => session.id !== currentSession.id && session.status === 'finished' && session.metrics.points > 0,
  );
  const history = finishedSessions.length > 0
    ? finishedSessions
    : sessions.filter((session) => session.id !== currentSession.id && session.metrics.points > 0);

  if (history.length === 0) {
    return {
      accuracy: 85,
      wpmMin: 45,
      wpmMax: 75,
      lagMin: 1,
      lagMax: 3,
      repeatsMax: 3,
    };
  }

  const recent = history.slice(0, 5);
  const avgAccuracy = average(recent.map((session) => session.metrics.accuracy));
  const avgWpm = average(recent.map((session) => session.metrics.wpm));
  const avgRepeats = average(recent.map((session) => session.telemetry.repeatCount));

  return {
    accuracy: Math.min(95, Math.max(85, avgAccuracy + 3)),
    wpmMin: Math.max(35, Math.round(avgWpm * 0.9)),
    wpmMax: Math.min(100, Math.max(55, Math.round(avgWpm * 1.15 + 5))),
    lagMin: 1,
    lagMax: 3,
    repeatsMax: Math.max(0, Math.floor(avgRepeats)),
  };
}

export function buildCoachingInsights(session: SessionDashboardSession, goals: DashboardGoals): string[] {
  const insights: string[] = [];
  const { metrics, telemetry } = session;

  insights.push(...buildListeningCycleV3DashboardInsights(session));

  if (metrics.lagSec > goals.lagMax && metrics.rate <= 0.82) {
    insights.push('Audio slowed down often; practice shorter phrase chunks before increasing speed.');
  }

  if (metrics.accuracy >= goals.accuracy && metrics.wpm < goals.wpmMin) {
    insights.push('Accuracy is strong; the next coaching target is pace.');
  }

  if (metrics.wpm > goals.wpmMax && metrics.accuracy < goals.accuracy) {
    insights.push('Typing speed is high, but accuracy is paying the cost. Slow down and capture cleaner words.');
  }

  if (telemetry.repeatCount > goals.repeatsMax) {
    insights.push('Repeated sections were frequent. Review the repeated passages before the next run.');
  }

  if (Math.abs(metrics.lagSec) > 4 && Math.abs(metrics.lagWords) <= 1) {
    insights.push('Timing and word lag disagree; use this session to review pacing alignment.');
  }

  if (insights.length === 0) {
    insights.push('This session is balanced. Keep the same pace and aim for a small accuracy gain next time.');
  }

  return insights.slice(0, 5);
}

export function buildListeningCycleV3DashboardInsights(session: SessionDashboardSession): string[] {
  const telemetryWithLiveFrames = session.telemetry as SessionDashboardSession['telemetry'] & { liveFrames?: unknown[] };
  const frames = Array.isArray(telemetryWithLiveFrames.liveFrames)
    ? telemetryWithLiveFrames.liveFrames.filter(isListeningCycleInsightFrame)
    : [];

  if (frames.length === 0) return [];

  const report = buildListeningCycleInsightReportV3(frames);
  if (report.evidence.totalFrames === 0 || report.confidence < 0.45) return [];

  const bullets = report.summaryBullets.slice(0, 3);
  const reasonCodeSummary = report.reasonCodes.length > 0
    ? `Reason codes: ${report.reasonCodes.slice(0, 4).join(', ')}.`
    : '';

  return [
    `Listening Cycle V3: ${report.headline}`,
    ...bullets,
    reasonCodeSummary,
  ].filter(Boolean).slice(0, 5);
}

function isListeningCycleInsightFrame(value: unknown): value is ListeningCycleInsightReportV3Frame {
  return Boolean(value && typeof value === 'object');
}

function buildTextTranscript(text: string): Transcript | null {
  const words = text
    .split(/\s+/)
    .map((word, index) => {
      const normalized = normalizeWord(word);
      return normalized
        ? { word: normalized, start: index, end: index + 1 }
        : null;
    })
    .filter((word): word is { word: string; start: number; end: number } => Boolean(word));

  return words.length > 0 ? { words } : null;
}

function average(values: number[]): number {
  const valid = values.filter((value) => Number.isFinite(value));
  if (valid.length === 0) {
    return 0;
  }

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}
