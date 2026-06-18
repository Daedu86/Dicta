import type { ReactNode } from 'react';
import { formatScore, formatWeakAreaLabel, getBenchmarkHealth } from './adaptiveWorkspaceViewHelpers';
import type { AdaptiveBenchmarkCockpitProps, AdaptiveBenchmarkCockpitRuntime } from './AdaptiveBenchmarkCockpitTypes';

export function AdaptiveBenchmarkProfileCockpit({
  profile,
  inputTitle,
  languageLabel,
  recommendedRange,
  confidenceState,
  weakAreaSummary,
  repeatWordSummary,
  topRepeatWords,
  maxRepeatWordTotal,
  sequencingClean,
  feedbackIssueCount,
  sessionFeedback,
  formatSessionDate,
  exportPanel,
}: Pick<AdaptiveBenchmarkCockpitProps, 'profile' | 'inputTitle' | 'sessionFeedback' | 'formatSessionDate'> & {
  languageLabel: string;
  recommendedRange: string;
  confidenceState: string;
  weakAreaSummary: string[];
  repeatWordSummary: AdaptiveBenchmarkCockpitRuntime['repeatWordSummary'];
  topRepeatWords: AdaptiveBenchmarkCockpitRuntime['topRepeatWords'];
  maxRepeatWordTotal: number;
  sequencingClean: boolean;
  feedbackIssueCount: number;
  exportPanel: ReactNode;
}) {
  return (
    <section className="adaptive-benchmark-subpanel adaptive-cockpit-panel">
      <div className="adaptive-section-header adaptive-subsection-header">
        <div>
          <p className="dashboard-eyebrow">Profile Cockpit</p>
          <h4>{inputTitle} / {languageLabel}</h4>
        </div>
      </div>
      <div className="adaptive-cockpit-grid">
        <section className="adaptive-benchmark-subpanel adaptive-profile-hero-card">
          <div className="adaptive-profile-hero-top">
            <div>
              <span className={`adaptive-confidence-pill adaptive-confidence-${getBenchmarkHealth(profile)}`}>{confidenceState}</span>
              <h4>{formatScore(profile.sweetSpotScore)} sweet spot</h4>
            </div>
            <strong>{profile.sampleCount}</strong>
          </div>
          <div className="adaptive-profile-hero-metrics">
            <span><strong>{formatScore(profile.recommendation.confidence)}</strong> confidence</span>
            <span><strong>{profile.sessionCount}</strong> sessions</span>
            <span><strong>{profile.lastUpdatedAt ? formatSessionDate(profile.lastUpdatedAt) : 'n/a'}</strong> updated</span>
          </div>
        </section>

        <section className="adaptive-benchmark-subpanel adaptive-next-action-card">
          <h4>Next target</h4>
          <div className="adaptive-target-token-grid">
            <span><small>Rate</small><strong>{recommendedRange}</strong></span>
            <span><small>Phrase</small><strong>{profile.recommendation.targetPhraseSize}</strong></span>
            <span><small>Pause</small><strong>{Math.round(profile.recommendation.targetPauseMs)}ms</strong></span>
          </div>
          <div className="adaptive-weak-area-row">
            {weakAreaSummary.length === 0 ? (
              <span className="adaptive-weak-area-chip adaptive-weak-area-chip-good">stable</span>
            ) : (
              weakAreaSummary.map((area) => <span key={area} className="adaptive-weak-area-chip">{formatWeakAreaLabel(area)}</span>)
            )}
          </div>
        </section>

        <section className="adaptive-benchmark-subpanel adaptive-words-widget">
          <h4>Words to improve</h4>
          {repeatWordSummary.length === 0 ? (
            <p className="hint">No finished sessions for this input/language in the last 20 days.</p>
          ) : (
            <div className="adaptive-word-bars" aria-label="Words to improve">
              {topRepeatWords.map((entry) => (
                <div key={entry.word} className="adaptive-word-bar">
                  <div>
                    <strong>{entry.word}</strong>
                    <small>{entry.missed} missed · {entry.typos} typos</small>
                  </div>
                  <span style={{ width: `${Math.max(10, Math.round((entry.total / maxRepeatWordTotal) * 100))}%` }} />
                  <em>{entry.total}</em>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`adaptive-benchmark-subpanel adaptive-feedback-status-card ${sequencingClean ? 'adaptive-feedback-status-good' : 'adaptive-feedback-status-watch'}`}>
          <h4>Latest feedback</h4>
          <div className="adaptive-feedback-widget-grid">
            <span><small>Verdict</small><strong>{sessionFeedback?.verdict ?? 'n/a'}</strong></span>
            <span><small>Issues</small><strong>{feedbackIssueCount}</strong></span>
            <span><small>Improvement</small><strong>{sessionFeedback ? formatScore(sessionFeedback.improvementDelta.overallImprovementScore) : 'n/a'}</strong></span>
          </div>
        </section>

        {exportPanel}
      </div>
    </section>
  );
}
