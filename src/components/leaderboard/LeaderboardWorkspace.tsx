import type { ComponentType, ReactElement } from 'react';

type LeaderboardLanguageCode = 'en' | 'es' | 'de' | 'fr' | 'pt';
type LeaderboardSectionId =
  | 'easy-express'
  | 'medium-express'
  | 'hard-express'
  | 'easy-standard'
  | 'medium-standard'
  | 'hard-standard';
type LeaderboardSession = any;
type LeaderboardSection = {
  id: LeaderboardSectionId;
  label: string;
  sessions: Array<{ rank: number; session: LeaderboardSession }>;
  rangeMetrics: Array<{
    range: string;
    label: string;
    sessionCount: number;
    durationLabel: string;
    avgPointsLabel: string;
    avgScoreLabel: string;
    avgAccuracyLabel: string;
    avgWpmLabel: string;
  }>;
};
type MetricComponentType = (props: { label: string; value: string; title?: string }) => ReactElement;
type SessionDeviceIconComponentType = ComponentType<{ session: any }>;

export type LeaderboardWorkspaceProps = {
  leaderboard: LeaderboardSession[];
  leaderboardSections: LeaderboardSection[];
  leaderboardLanguageView: LeaderboardLanguageCode;
  leaderboardExpanded: boolean;
  leaderboardSectionExpanded: Record<LeaderboardSectionId, boolean>;
  activeSessionId: string | null;
  supportedLanguages: readonly LeaderboardLanguageCode[];
  languageLabels: Record<LeaderboardLanguageCode, string>;
  onChangeLeaderboardLanguageView: (code: LeaderboardLanguageCode) => void;
  onToggleLeaderboardExpanded: () => void;
  onToggleLeaderboardSectionExpanded: (sectionId: LeaderboardSectionId) => void;
  onOpenWorkspaceForSession: (session: any) => void;
  onOpenDashboardForSession: (sessionId: string) => void;
  onDownloadSessionSnapshot: (session: any) => void;
  onCopySessionSnapshot: (session: any) => void;
  onDeleteSession: (sessionId: string) => void;
  onBackToTraining: () => void;
  formatLeaderboardSessionStatus: (session: any) => string;
  formatSessionGenerationOrigin: (generationOrigin: any) => string;
  formatSessionPlaybackDuration: (session: any) => string;
  formatSessionDate: (date: any) => string;
  formatSessionPointsForSession: (points: number, session: any) => string;
  buildSessionScoreHelpText: (metrics: any) => string;
  buildSessionPointsHelpText: (maxPoints: number) => string;
  computeSessionMaxPoints: (session: any) => number | null;
  getSessionDisplayTitle: (session: any) => string;
  isSessionReadyForTraining: (session: any) => boolean;
  MetricComponent: MetricComponentType;
  SessionDeviceIconComponent: SessionDeviceIconComponentType;
};

export function LeaderboardWorkspace({
  leaderboard,
  leaderboardSections,
  leaderboardLanguageView,
  leaderboardExpanded,
  leaderboardSectionExpanded,
  activeSessionId,
  supportedLanguages,
  languageLabels,
  onChangeLeaderboardLanguageView,
  onToggleLeaderboardExpanded,
  onToggleLeaderboardSectionExpanded,
  onOpenWorkspaceForSession,
  onOpenDashboardForSession,
  onDownloadSessionSnapshot,
  onCopySessionSnapshot,
  onDeleteSession,
  onBackToTraining,
  formatLeaderboardSessionStatus,
  formatSessionGenerationOrigin,
  formatSessionPlaybackDuration,
  formatSessionDate,
  formatSessionPointsForSession,
  buildSessionScoreHelpText,
  buildSessionPointsHelpText,
  computeSessionMaxPoints,
  getSessionDisplayTitle,
  isSessionReadyForTraining,
  MetricComponent,
  SessionDeviceIconComponent,
}: LeaderboardWorkspaceProps) {
  return (
    <section className="panel workspace-panel leaderboard-workspace">
      <div className="metrics-header">
        <div>
          <h2>Leaderboard</h2>
          <p className="dashboard-meta">
            {leaderboard.length} {leaderboard.length === 1 ? 'session' : 'sessions'} for {leaderboardLanguageView.toUpperCase()}.
          </p>
        </div>
        <div className="live-metrics-language-tabs leaderboard-language-tabs" role="tablist" aria-label="Leaderboard language">
          {supportedLanguages.map((code) => (
            <button
              key={code}
              type="button"
              className={`live-metrics-language-tab ${leaderboardLanguageView === code ? 'live-metrics-language-tab-active' : ''}`}
              onClick={() => onChangeLeaderboardLanguageView(code)}
              aria-pressed={leaderboardLanguageView === code}
              title={`Leaderboard for ${languageLabels[code]}`}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="secondary-button leaderboard-collapse-button"
          onClick={onToggleLeaderboardExpanded}
          aria-expanded={leaderboardExpanded}
          aria-label={leaderboardExpanded ? 'Minimize leaderboard' : 'Expand leaderboard'}
          title={leaderboardExpanded ? 'Minimize' : 'Expand'}
        >
          <span className={`leaderboard-collapse-icon ${leaderboardExpanded ? 'leaderboard-collapse-icon-open' : ''}`} aria-hidden="true">
            ⌃
          </span>
        </button>
        <button type="button" className="secondary-button" onClick={onBackToTraining}>
          Back
        </button>
      </div>
      {leaderboardExpanded ? (
        <div className="leaderboard-sections">
          {leaderboard.length === 0 ? (
            <div className="leaderboard-empty">
              No sessions yet for {leaderboardLanguageView.toUpperCase()}. Finish a session in that language to populate this leaderboard.
            </div>
          ) : null}
          {leaderboardSections.map((section) => {
            const sectionExpanded = Boolean(leaderboardSectionExpanded[section.id]);
            return (
              <section key={section.id} className="leaderboard-difficulty-section">
                <button
                  type="button"
                  className="leaderboard-section-header"
                  onClick={() => onToggleLeaderboardSectionExpanded(section.id)}
                  aria-expanded={sectionExpanded}
                >
                  <span>
                    <strong>{section.label}</strong>
                    <small>
                      {section.sessions.length} {section.sessions.length === 1 ? 'session' : 'sessions'}
                    </small>
                  </span>
                  <span className={`leaderboard-section-chevron ${sectionExpanded ? 'leaderboard-section-chevron-open' : ''}`} aria-hidden="true">
                    ⌄
                  </span>
                </button>
                {sectionExpanded ? (
                  <div className="leaderboard-section-body">
                    <div className="leaderboard-range-metrics" aria-label={`${section.label} average metrics`}>
                      {section.rangeMetrics.map((rangeMetric) => (
                        <section key={rangeMetric.range} className="leaderboard-range-panel">
                          <h4>{rangeMetric.label}</h4>
                          <div className="leaderboard-range-grid">
                            <MetricComponent label="Sessions" value={String(rangeMetric.sessionCount)} />
                            <MetricComponent label="Duration" value={rangeMetric.durationLabel} />
                            <MetricComponent label="Avg points" value={rangeMetric.avgPointsLabel} />
                            <MetricComponent label="Avg score" value={rangeMetric.avgScoreLabel} />
                            <MetricComponent label="Avg accuracy" value={rangeMetric.avgAccuracyLabel} />
                            <MetricComponent label="Avg WPM" value={rangeMetric.avgWpmLabel} />
                          </div>
                        </section>
                      ))}
                    </div>
                    <div className="leaderboard-table leaderboard-list-full">
                      <div className="leaderboard-table-header">
                        <span>Position</span>
                        <span>Name</span>
                        <span>Points</span>
                        <span>Score</span>
                        <span>Accuracy</span>
                        <span>WPM</span>
                        <span>Lag</span>
                        <span>Rate</span>
                        <span>Status</span>
                        <span>Duration</span>
                        <span>Updated</span>
                        <span>Action</span>
                      </div>
                      {section.sessions.length === 0 ? (
                        <div className="leaderboard-empty">
                          No {section.label.toLowerCase()} sessions yet for {leaderboardLanguageView.toUpperCase()}.
                        </div>
                      ) : null}
                      {section.sessions.map(({ rank, session }) => {
                        const readinessClass =
                          session.status === 'error'
                            ? 'leaderboard-table-row-error'
                            : isSessionReadyForTraining(session)
                              ? 'leaderboard-table-row-ready'
                              : 'leaderboard-table-row-not-ready';
                        const statusLabel = formatLeaderboardSessionStatus(session);
                        const statusTitle = session.generationError ? `${statusLabel}: ${session.generationError}` : statusLabel;
                        const scoreHelpText = buildSessionScoreHelpText(session.metrics);
                        return (
                          <div
                            key={session.id}
                            className={`leaderboard-table-row ${readinessClass} ${session.id === activeSessionId ? 'leaderboard-table-row-active' : ''}`}
                          >
                            <span className="leaderboard-cell leaderboard-cell-rank">#{rank}</span>
                            <span className="leaderboard-cell leaderboard-cell-name" title={getSessionDisplayTitle(session)}>
                              <SessionDeviceIconComponent session={session} />
                              <span>{getSessionDisplayTitle(session)}</span>
                            </span>
                            <span
                              className="leaderboard-cell leaderboard-cell-points"
                              title={buildSessionPointsHelpText(computeSessionMaxPoints(session) ?? 0)}
                            >
                              {formatSessionPointsForSession(session.metrics.points, session)}
                            </span>
                            <span className="leaderboard-cell leaderboard-cell-score" title={scoreHelpText} aria-label={`Score ${session.metrics.score}. ${scoreHelpText}`}>
                              {session.metrics.score}
                            </span>
                            <span className="leaderboard-cell leaderboard-cell-accuracy">{session.metrics.accuracy.toFixed(1)}%</span>
                            <span className="leaderboard-cell leaderboard-cell-wpm">{session.metrics.wpm.toFixed(1)}</span>
                            <span className="leaderboard-cell leaderboard-cell-lag">{session.metrics.lagSec.toFixed(2)}s</span>
                            <span className="leaderboard-cell leaderboard-cell-rate">{session.metrics.rate.toFixed(2)}x</span>
                            <span className="leaderboard-cell leaderboard-cell-status" title={statusTitle}>
                              {statusLabel}
                              <small>{formatSessionGenerationOrigin(session.generationOrigin)}</small>
                              {session.generationError ? <small>{session.generationError}</small> : null}
                            </span>
                            <span className="leaderboard-cell leaderboard-cell-duration">{formatSessionPlaybackDuration(session)}</span>
                            <span className="leaderboard-cell leaderboard-cell-date">{formatSessionDate(session.updatedAt)}</span>
                            <span className="leaderboard-cell leaderboard-cell-action">
                              <div className="leaderboard-action-buttons" aria-label={`Actions for ${getSessionDisplayTitle(session)}`}>
                                <button
                                  type="button"
                                  className="secondary-button leaderboard-action-button"
                                  onClick={() => onOpenWorkspaceForSession(session)}
                                  aria-label={`Open training workspace for ${getSessionDisplayTitle(session)}`}
                                  title="Open in input workspace"
                                >
                                  <span aria-hidden="true">⟵</span>
                                </button>
                                <button
                                  type="button"
                                  className="secondary-button leaderboard-action-button"
                                  onClick={() => onOpenDashboardForSession(session.id)}
                                  aria-label={`Open dashboard for ${getSessionDisplayTitle(session)}`}
                                  title="Dashboard"
                                >
                                  <span aria-hidden="true">◫</span>
                                </button>
                                <button
                                  type="button"
                                  className="secondary-button leaderboard-action-button"
                                  onClick={() => onDownloadSessionSnapshot(session)}
                                  aria-label={`Export JSON for ${getSessionDisplayTitle(session)}`}
                                  title="Export JSON"
                                >
                                  <span aria-hidden="true">⇩</span>
                                </button>
                                <button
                                  type="button"
                                  className="secondary-button leaderboard-action-button"
                                  onClick={() => onCopySessionSnapshot(session)}
                                  aria-label={`Copy JSON for ${getSessionDisplayTitle(session)}`}
                                  title="Copy JSON"
                                >
                                  <span aria-hidden="true">⧉</span>
                                </button>
                                <button
                                  type="button"
                                  className="danger-button leaderboard-action-button leaderboard-action-button-danger"
                                  onClick={() => onDeleteSession(session.id)}
                                  aria-label={`Delete ${getSessionDisplayTitle(session)}`}
                                  title="Delete session"
                                >
                                  <span aria-hidden="true">✕</span>
                                </button>
                              </div>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
