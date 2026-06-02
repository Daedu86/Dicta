import { lazy, Suspense, type ReactNode } from 'react';
import type { SessionTelemetry, Transcript } from '../../types/dictation';
import {
  alignWordPairs,
  formatSessionPointsForSession,
  formatSessionPointsLabel,
} from '../../core/evaluation';
import { buildSessionScoreHelpText, type SessionScoreMetrics } from '../../core/sessionScore';
import { normalizeWord } from '../../core/normalization';
import { cloneTelemetry } from '../../core/sessionNormalization';

const DashboardLineChart = lazy(() =>
  import('../DashboardCharts').then((module) => ({ default: module.DashboardLineChart })),
);
const DashboardRateBars = lazy(() =>
  import('../DashboardCharts').then((module) => ({ default: module.DashboardRateBars })),
);
const DashboardActionTimeline = lazy(() =>
  import('../DashboardCharts').then((module) => ({ default: module.DashboardActionTimeline })),
);

type SessionDashboardStatus = 'ready' | 'running' | 'paused' | 'finished' | 'error';
type SessionDashboardInputMode = 'input1' | 'input2' | 'input3' | 'input4';

type SessionDashboardMetrics = SessionScoreMetrics & {
  lagWords: number;
};

export type SessionDashboardSession = {
  id: string;
  name: string;
  updatedAt: string;
  inputMode: SessionDashboardInputMode;
  transcript: Transcript | null;
  inputText: string;
  ttsText: string;
  ttsPracticeText: string;
  kokoroText: string;
  kokoroPracticeText: string;
  status: SessionDashboardStatus;
  metrics: SessionDashboardMetrics;
  telemetry: SessionTelemetry;
};

type DashboardGoals = {
  accuracy: number;
  wpmMin: number;
  wpmMax: number;
  lagMin: number;
  lagMax: number;
  repeatsMax: number;
};

type TranscriptReviewToken = {
  typedIndex: number;
  word: string;
  expected: string;
  status: 'correct' | 'fuzzy' | 'extra';
  points: number;
};

type TranscriptReview = {
  tokens: TranscriptReviewToken[];
  correct: number;
  fuzzy: number;
  extra: number;
  missed: number;
};

export function SessionDashboard({
  session,
  sessions,
  onBackToLeaderboard,
  onBackToTraining,
  formatSessionStatus,
  formatSessionDate,
  formatSessionPlaybackDuration,
}: {
  session: SessionDashboardSession;
  sessions: SessionDashboardSession[];
  onBackToLeaderboard: () => void;
  onBackToTraining: () => void;
  formatSessionStatus: (status: SessionDashboardStatus) => string;
  formatSessionDate: (value: string) => string;
  formatSessionPlaybackDuration: (session: SessionDashboardSession) => string;
}) {
  const telemetry = cloneTelemetry(session.telemetry);
  const goals = buildAdaptiveGoals(sessions, session);
  const insights = buildCoachingInsights(session, goals);
  const duration = formatSessionPlaybackDuration(session);
  const transcriptReview = buildTranscriptReview(session);
  const pointsLabel = formatSessionPointsForSession(session.metrics.points, session);
  const scoreHelpText = buildSessionScoreHelpText(session.metrics);
  const kpiSectionTooltip = 'Session KPI summary with score, points, accuracy, speed, lag, rate, repeats, and voice duration.';
  const kpiSectionCopyText =
    `Widget #0 - Session KPIs: ` +
    [
      `Score=${session.metrics.score}`,
      `Points=${pointsLabel}`,
      `Accuracy=${session.metrics.accuracy.toFixed(1)}%`,
      `WPM=${session.metrics.wpm.toFixed(1)}`,
      `Lag=${session.metrics.lagSec.toFixed(2)}s`,
      `Rate=${session.metrics.rate.toFixed(2)}x`,
      `Repeats=${telemetry.repeatCount}`,
      `Duration=${duration}`,
    ].join(', ');

  return (
    <section className="panel workspace-panel dashboard-workspace">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">Coaching dashboard</p>
          <h2>{session.name || 'Untitled session'}</h2>
          <span className="dashboard-meta">
            {formatSessionStatus(session.status)} · {formatSessionDate(session.updatedAt)}
          </span>
        </div>
        <div className="dashboard-header-actions">
          <button type="button" className="secondary-button" onClick={onBackToLeaderboard}>
            Back to leaderboard
          </button>
          <button type="button" className="secondary-button" onClick={onBackToTraining}>
            Back to training
          </button>
        </div>
      </div>

      <section className="dashboard-kpi-section">
        <div className="dashboard-card-header dashboard-kpi-section-header">
          <h3>Widget #0 - Session KPIs</h3>
          <WidgetTools tooltip={kpiSectionTooltip} copyText={kpiSectionCopyText} />
        </div>
        <div className="dashboard-kpis">
          <DashboardKpi label="Score" value={String(session.metrics.score)} helpText={scoreHelpText} />
          <DashboardKpi label="Points" value={pointsLabel} />
          <DashboardKpi label="Accuracy" value={`${session.metrics.accuracy.toFixed(1)}%`} target={`${goals.accuracy.toFixed(0)}% goal`} />
          <DashboardKpi label="WPM" value={session.metrics.wpm.toFixed(1)} target={`${goals.wpmMin}-${goals.wpmMax} goal`} />
          <DashboardKpi label="Lag" value={`${session.metrics.lagSec.toFixed(2)}s`} target={`${goals.lagMin}-${goals.lagMax}s goal`} />
          <DashboardKpi label="Rate" value={`${session.metrics.rate.toFixed(2)}x`} />
          <DashboardKpi label="Repeats" value={String(telemetry.repeatCount)} target={`<= ${goals.repeatsMax} goal`} />
          <DashboardKpi label="Duration" value={duration} />
        </div>
      </section>

      <TranscriptReviewWidget review={transcriptReview} />

      <div className="dashboard-grid">
        <DashboardChart
          widgetIndex={2}
          title="Accuracy over time"
          empty={telemetry.accuracySeries.length === 0}
          copyText={`Accuracy over time: ${telemetry.accuracySeries.length > 0 ? telemetry.accuracySeries.map((value) => value.toFixed(1)).join(', ') : 'No data'}`}
        >
          <Suspense fallback={<ChartLoadingState />}>
            <DashboardLineChart series={telemetry.accuracySeries} min={0} max={100} suffix="%" />
          </Suspense>
        </DashboardChart>
        <DashboardChart
          widgetIndex={3}
          title="WPM over time"
          empty={telemetry.wpmSeries.length === 0}
          copyText={`WPM over time: ${telemetry.wpmSeries.length > 0 ? telemetry.wpmSeries.map((value) => value.toFixed(1)).join(', ') : 'No data'}`}
        >
          <Suspense fallback={<ChartLoadingState />}>
            <DashboardLineChart series={telemetry.wpmSeries} min={0} max={Math.max(120, ...telemetry.wpmSeries)} />
          </Suspense>
        </DashboardChart>
        <DashboardChart
          widgetIndex={4}
          title="Lag over time"
          empty={telemetry.lagSeries.length === 0}
          copyText={`Lag over time: ${telemetry.lagSeries.length > 0 ? telemetry.lagSeries.map((value) => value.toFixed(2)).join(', ') : 'No data'}`}
        >
          <Suspense fallback={<ChartLoadingState />}>
            <DashboardLineChart series={telemetry.lagSeries} min={-10} max={10} suffix="s" />
          </Suspense>
        </DashboardChart>
        <DashboardChart
          widgetIndex={5}
          title="Playback rate distribution"
          empty={telemetry.rateDistribution.length === 0}
          copyText={`Playback rate distribution: ${telemetry.rateDistribution.length > 0 ? telemetry.rateDistribution.map((entry) => `${entry.rate.toFixed(2)}x=${Math.round(entry.seconds)}s`).join(', ') : 'No data'}`}
        >
          <Suspense fallback={<ChartLoadingState />}>
            <DashboardRateBars rateDistribution={telemetry.rateDistribution} />
          </Suspense>
        </DashboardChart>
        <DashboardChart
          widgetIndex={6}
          title="Controller action timeline"
          empty={telemetry.actions.length === 0}
          copyText={`Controller actions: ${telemetry.actions.length > 0 ? telemetry.actions.map((action) => `${action.action}@${action.t.toFixed(1)}s`).join(', ') : 'No data'}`}
        >
          <Suspense fallback={<ChartLoadingState />}>
            <DashboardActionTimeline actions={telemetry.actions} />
          </Suspense>
        </DashboardChart>
        <section className="dashboard-card dashboard-insights">
          <div className="dashboard-card-header">
            <h3>Widget #7 - Coaching insights</h3>
            <WidgetTools
              tooltip={chartHelpText('Coaching insights') ?? ''}
              copyText={`Coaching insights: ${insights.length > 0 ? insights.join(' | ') : 'No insights'}`}
            />
          </div>
          <div className="insight-list">
            {insights.map((insight) => (
              <p key={insight}>{insight}</p>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function DashboardKpi({ label, value, target, helpText }: { label: string; value: string; target?: string; helpText?: string }) {
  const tooltip = helpText ?? kpiHelpText(label);
  const copyText = `${label}: ${value}${target ? ` (${target})` : ''}`;
  return (
    <div className="dashboard-kpi" title={tooltip ?? undefined} aria-label={tooltip ? `${label}: ${value}. ${tooltip}` : undefined}>
      {tooltip ? <WidgetTools tooltip={tooltip} copyText={copyText} /> : null}
      <span>{label}</span>
      <strong>{value}</strong>
      {target ? <small>{target}</small> : null}
    </div>
  );
}

function TranscriptReviewWidget({ review }: { review: TranscriptReview }) {
  const tooltip =
    'Compares what you typed against the target text. Input 1 uses Whisper transcript, Input 2 uses pasted TTS text, and Input 3 uses Kokoro source text.';
  const typedWords = review.tokens.length;
  const totalPoints = review.tokens.reduce((sum, token) => sum + token.points, 0);
  const maxPoints = totalPoints + review.missed;
  const totalPointsLabel = formatSessionPointsLabel(totalPoints, maxPoints > 0 ? maxPoints : null);
  const exactPoints = review.tokens
    .filter((token) => token.status === 'correct')
    .reduce((sum, token) => sum + token.points, 0);
  const reviewPoints = review.tokens
    .filter((token) => token.status === 'fuzzy')
    .reduce((sum, token) => sum + token.points, 0);
  const zeroPointWords = review.tokens.filter((token) => token.points === 0).length;
  const copyText = [
    'Transcript review analytics',
    `Correct=${review.correct}`,
    `Review=${review.fuzzy}`,
    `Wrong/extra=${review.extra}`,
    `Missed=${review.missed}`,
    `Typed words=${typedWords}`,
    `Total points=${totalPointsLabel}`,
    `Exact-match points=${exactPoints}`,
    `Review points=${reviewPoints}`,
    `Zero-point words=${zeroPointWords}`,
  ].join(', ');
  return (
    <section className="dashboard-card transcript-review-card">
      <div className="transcript-review-header">
        <div className="transcript-review-title-row">
          <h3>Widget #1 - Transcript review</h3>
          <div className="transcript-review-tools">
            <WidgetTools tooltip={tooltip} copyText={copyText} />
          </div>
        </div>
        <p className="transcript-review-description">
          Green words earned points. Yellow words were accepted with a small typo. Red words did not match the transcript.
        </p>
        <div className="transcript-review-stats">
          <Metric label="Correct" value={String(review.correct)} />
          <Metric label="Review" value={String(review.fuzzy)} />
          <Metric label="Wrong / extra" value={String(review.extra)} />
          <Metric label="Missed" value={String(review.missed)} />
        </div>
        <div className="transcript-review-stats transcript-review-analytics">
          <Metric label="Typed words" value={String(typedWords)} />
          <Metric label="Total points" value={totalPointsLabel} />
          <Metric label="Exact points" value={String(exactPoints)} />
          <Metric label="Review points" value={String(reviewPoints)} />
          <Metric label="Zero-point words" value={String(zeroPointWords)} />
          <Metric label="Scored words" value={String(review.correct + review.fuzzy)} />
        </div>
      </div>

      {review.tokens.length === 0 ? (
        <div className="dashboard-empty-wrap">
          <p className="dashboard-empty">No typed transcription is saved for this session yet.</p>
        </div>
      ) : (
        <div className="word-review-flow" aria-label="Typed transcript word review">
          {review.tokens.map((token) => (
            <span key={`${token.typedIndex}-${token.word}`} className={`word-review-chip word-review-${token.status}`}>
              <small>{token.points > 0 ? `+${token.points}` : '0'}</small>
              <strong>{token.word}</strong>
              {token.expected ? <em>expected: {token.expected}</em> : null}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function DashboardChart({
  widgetIndex,
  title,
  empty,
  copyText,
  children,
}: {
  widgetIndex: number;
  title: string;
  empty: boolean;
  copyText: string;
  children: ReactNode;
}) {
  const tooltip = chartHelpText(title);
  return (
    <section className="dashboard-card">
      <div className="dashboard-card-header">
        <h3>{`Widget #${widgetIndex} - ${title}`}</h3>
        {tooltip ? <WidgetTools tooltip={tooltip} copyText={copyText} /> : null}
      </div>
      {empty ? <p className="dashboard-empty">No timeline data for this session yet.</p> : children}
    </section>
  );
}

function ChartLoadingState() {
  return <p className="dashboard-empty">Loading chart...</p>;
}

function WidgetTools({ tooltip, copyText }: { tooltip: string; copyText: string }) {
  return (
    <div className="widget-tools">
      <CopyHelpButton text={copyText} />
      <HelpIcon tooltip={tooltip} />
    </div>
  );
}

function HelpIcon({ tooltip, ariaLabel = 'Help' }: { tooltip: string; ariaLabel?: string }) {
  return (
    <button
      type="button"
      className="help-icon"
      aria-label={ariaLabel}
      data-tooltip={tooltip}
      onClick={(event) => event.preventDefault()}
    >
      ?
    </button>
  );
}

function CopyHelpButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="copy-help-icon"
      aria-label="Copy values"
      title="Copy values"
      onClick={() => void navigator.clipboard.writeText(text)}
    >
      ⧉
    </button>
  );
}

function kpiHelpText(label: string): string | null {
  const map: Record<string, string> = {
    Score: 'Overall performance score derived from accuracy, pace, lag, and points.',
    Points: 'Word-matching points earned from your typed attempt versus target words.',
    Accuracy: 'Percent of typed words matching target words, including fuzzy matches.',
    WPM: 'Typing speed estimate in words per minute during the attempt.',
    Lag: 'How far typing progress is behind or ahead of expected playback position in seconds.',
    Rate: 'Playback speed multiplier used during the session.',
    Repeats: 'How many times a segment or phrase was repeated during the attempt.',
    Duration: 'Voice/audio playback duration, aligned with the media player duration.',
  };
  return map[label] ?? null;
}

function chartHelpText(title: string): string | null {
  const map: Record<string, string> = {
    'Accuracy over time': 'Shows how accuracy changes across session samples.',
    'WPM over time': 'Shows how typing speed changes across session samples.',
    'Lag over time': 'Shows timing and position lag trend across session samples.',
    'Playback rate distribution': 'Shows how many seconds were spent at each playback rate.',
    'Controller action timeline': 'Shows when the controller chose hold, speed up, speed down, or pause repeat.',
    'Coaching insights': 'Heuristic coaching notes derived from metrics and telemetry versus goal ranges.',
  };
  return map[title] ?? null;
}

function Metric({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="metric" title={title} aria-label={title ? `${label}: ${value}. ${title}` : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildTranscriptReview(session: SessionDashboardSession): TranscriptReview {
  const typedSource = session.inputMode === 'input2' ? session.ttsPracticeText : session.inputMode === 'input3' ? session.kokoroPracticeText : session.inputText;
  const targetTranscript =
    session.inputMode === 'input2'
      ? buildTextTranscript(session.ttsText)
      : session.inputMode === 'input3'
        ? buildTextTranscript(session.kokoroText)
        : session.transcript;
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

function buildAdaptiveGoals(sessions: SessionDashboardSession[], currentSession: SessionDashboardSession): DashboardGoals {
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

function buildCoachingInsights(session: SessionDashboardSession, goals: DashboardGoals): string[] {
  const insights: string[] = [];
  const { metrics, telemetry } = session;

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

function average(values: number[]): number {
  const valid = values.filter((value) => Number.isFinite(value));
  if (valid.length === 0) {
    return 0;
  }

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

