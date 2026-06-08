import type { Difficulty } from './config';
import type { SupportedLanguage } from './languages';

export type MetricsLanguageView = SupportedLanguage;
export type MetricsRangeView = 'today' | 'week' | 'twoWeeks' | 'threeWeeks' | 'month';
export type SessionInputMode = string;

export type SessionLanguageLike = {
  inputMode: SessionInputMode;
  ttsLanguage?: SupportedLanguage | null;
};

export type SessionForMetrics = SessionLanguageLike & {
  id?: string;
  name?: string;
  difficulty?: Difficulty;
  updatedAt: string;
  voiceDurationSec?: number | null;
  metrics: {
    points: number;
    score: number;
    accuracy: number;
    wpm: number;
  };
  telemetry: {
    startedAt?: string | null;
    finishedAt?: string | null;
  };
};

export type LanguageRangeSummary = {
  sessionsInRange: SessionForMetrics[];
  durationSeconds: number;
  avgPoints: number | null;
  avgScore: number | null;
  avgAccuracy: number | null;
  avgWpm: number | null;
  days: Array<{ label: string; count: number }>;
  maxDayCount: number;
};

export function resolveSessionLanguage(session: SessionLanguageLike): MetricsLanguageView | null {
  if (session.inputMode === 'input2') {
    return session.ttsLanguage ?? null;
  }
  return null;
}

export function findLastSessionForLanguage(
  sessions: SessionForMetrics[],
  language: MetricsLanguageView,
): SessionForMetrics | null {
  const filtered = sessions.filter((session) => resolveSessionLanguage(session) === language);
  if (filtered.length === 0) return null;
  return [...filtered].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ?? null;
}

export function buildRangeSummaryForLanguage(
  sessions: SessionForMetrics[],
  language: MetricsLanguageView,
  range: MetricsRangeView,
  today = new Date(),
): LanguageRangeSummary {
  const filtered = sessions.filter((session) => resolveSessionLanguage(session) === language);
  const windowDays = rangeWindowDays(range);
  const isSameDay = (value: string, reference: Date): boolean => {
    const date = new Date(value);
    return (
      date.getFullYear() === reference.getFullYear() &&
      date.getMonth() === reference.getMonth() &&
      date.getDate() === reference.getDate()
    );
  };
  const startOfDay = (value: Date): Date => {
    const next = new Date(value);
    next.setHours(0, 0, 0, 0);
    return next;
  };
  const endOfDay = (value: Date): Date => {
    const next = new Date(value);
    next.setHours(23, 59, 59, 999);
    return next;
  };
  const rangeStart = startOfDay(new Date(today));
  rangeStart.setDate(rangeStart.getDate() - (windowDays - 1));
  const rangeEnd = endOfDay(today);
  const isWithinRange = (value: string): boolean => {
    const at = new Date(value).getTime();
    return at >= rangeStart.getTime() && at <= rangeEnd.getTime();
  };
  const average = (values: number[]): number | null =>
    values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const getSessionDurationSec = (session: SessionForMetrics): number | null => {
    if (typeof session.voiceDurationSec === 'number' && Number.isFinite(session.voiceDurationSec)) {
      return session.voiceDurationSec;
    }
    if (!session.telemetry.startedAt || !session.telemetry.finishedAt) return null;
    return (new Date(session.telemetry.finishedAt).getTime() - new Date(session.telemetry.startedAt).getTime()) / 1000;
  };

  const sessionsInRange = filtered.filter((session) => isWithinRange(session.updatedAt));
  const durationSeconds = sessionsInRange
    .map(getSessionDurationSec)
    .filter((value): value is number => value !== null)
    .reduce((sum, value) => sum + value, 0);

  const days = Array.from({ length: windowDays }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (windowDays - 1 - index));
    return {
      label: windowDays <= 7 ? date.toLocaleDateString(undefined, { weekday: 'short' }) : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: sessionsInRange.filter((session) => isSameDay(session.updatedAt, date)).length,
    };
  });

  return {
    sessionsInRange,
    durationSeconds,
    avgPoints: average(sessionsInRange.map((session) => session.metrics.points)),
    avgScore: average(sessionsInRange.map((session) => session.metrics.score)),
    avgAccuracy: average(sessionsInRange.map((session) => session.metrics.accuracy)),
    avgWpm: average(sessionsInRange.map((session) => session.metrics.wpm)),
    days,
    maxDayCount: Math.max(1, ...days.map((day) => day.count)),
  };
}

export function rangeLabel(range: MetricsRangeView): string {
  if (range === 'today') return 'Today';
  if (range === 'week') return 'Week';
  if (range === 'twoWeeks') return '2 Weeks';
  if (range === 'threeWeeks') return '3 Weeks';
  return 'Month';
}

function rangeWindowDays(range: MetricsRangeView): number {
  if (range === 'today') return 1;
  if (range === 'week') return 7;
  if (range === 'twoWeeks') return 14;
  if (range === 'threeWeeks') return 21;
  return 30;
}
