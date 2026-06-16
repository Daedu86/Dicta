import { lazy, Suspense } from 'react';
import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics } from '../../core/adaptive/types';
import {
  formatPercent,
  formatScore,
  formatSigned,
  formatWeakAreaLabel,
  getBenchmarkHealth,
  normalizeAccuracyForDisplay,
} from './adaptiveWorkspaceViewHelpers';
import { AdaptiveBenchmarkExportPanel } from './AdaptiveBenchmarkExportPanel';
import type { AdaptiveWorkspaceFocusAnchor, RepeatWordStat } from './types';
import { useAdaptiveBenchmarkCockpitRuntime } from './useAdaptiveBenchmarkCockpitRuntime';

const SweetSpotGauge = lazy(() =>
  import('../AdaptiveBenchmarkCharts').then((module) => ({ default: module.SweetSpotGauge })),
);
const TargetZoneChart = lazy(() =>
  import('../AdaptiveBenchmarkCharts').then((module) => ({ default: module.TargetZoneChart })),
);
const MiniTrends = lazy(() =>
  import('../AdaptiveBenchmarkCharts').then((module) => ({ default: module.MiniTrends })),
);
const RateAccuracyStrip = lazy(() =>
  import('../AdaptiveBenchmarkCharts').then((module) => ({ default: module.RateAccuracyStrip })),
);
const LagDistributionChart = lazy(() =>
  import('../AdaptiveBenchmarkCharts').then((module) => ({ default: module.LagDistributionChart })),
);

function AdaptiveChartLoadingState() {
  return <div className="dashboard-empty-wrap"><p className="dashboard-empty">Loading benchmark chart...</p></div>;
}

function Metric({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="metric" title={title} aria-label={title ? `${label}: ${value}. ${title}` : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function AdaptiveBenchmarkCockpit({
  profile,
  inputTitle,
  focusAnchor,
  repeatWordStats,
  formatSessionDate,
  benchmarkExportMessage,
  sessionFeedback,
  sessionFeedbackMessage,
  onCopyBenchmark,
  onExportBenchmark,
  onCopyScriptPrompt,
  onCopyBenchmarkWithScriptPrompt,
  onCopyScriptTemplate,
  onCopySessionFeedback,
  onCopyBenchmarkFeedback,
  onCopyBenchmarkFeedbackPrompt,
  onCopyBenchmarkFeedbackPromptWithHumanFeedback,
}: {
  profile: InputLanguageBenchmarkMetrics;
  inputTitle: string;
  focusAnchor?: AdaptiveWorkspaceFocusAnchor;
  repeatWordStats: RepeatWordStat[];
  formatSessionDate: (value: string) => string;
  benchmarkExportMessage: string;
  sessionFeedback: AdaptiveSessionFeedback | null;
  sessionFeedbackMessage: string;
  onCopyBenchmark: (profile: InputLanguageBenchmarkMetrics) => void;
  onExportBenchmark: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyScriptPrompt: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyBenchmarkWithScriptPrompt: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyScriptTemplate: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopySessionFeedback: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedback: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedbackPrompt: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedbackPromptWithHumanFeedback: (
    profile: InputLanguageBenchmarkMetrics,
    feedback: AdaptiveSessionFeedback | null,
    humanFeedback: string,
  ) => void;
}) {
  const {
    languageLabel,
    recommendedRange,
    debugLatest,
    fallbackDiagnostics,
    hasBenchmarkData,
    hasSessionFeedback,
    repeatWordSummary,
    topRepeatWords,
    maxRepeatWordTotal,
    confidenceState,
    weakAreaSummary,
    browserTtsDePauseNote,
    browserTtsDeSemanticNote,
    sequencingClean,
    feedbackIssueCount,
    workspaceSubsectionsExpanded,
    setWorkspaceSubsectionsExpanded,
    humanFeedbackEditorOpen,
    setHumanFeedbackEditorOpen,
    humanFeedbackDraft,
    setHumanFeedbackDraft,
    exportStatusMessage,
    setExportStatusMessage,
    exportPanelOpen,
    setExportPanelOpen,
    copyToClipboard,
    formatPromptSizeHint,
    exportPayloads,
  } = useAdaptiveBenchmarkCockpitRuntime({
    profile,
    focusAnchor,
    repeatWordStats,
    sessionFeedback,
  });
  return (
    <div className="adaptive-benchmark-workspace" id="adaptive-selected-profile-cockpit">
          <div className="dashboard-card-header">
            <div>
              <h3>{inputTitle} / {languageLabel}</h3>
              <p className="dashboard-meta">
                Profile key: {profile.inputMode}/{profile.language}
              </p>
            </div>
          </div>
          {benchmarkExportMessage ? (
            <p className={benchmarkExportMessage.toLowerCase().includes('could not') ? 'error' : 'success'}>{benchmarkExportMessage}</p>
          ) : null}
          {exportStatusMessage ? <p className="success">{exportStatusMessage}</p> : null}

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
              <p className="hint">No finished sessions for this input/language in the last 30 days.</p>
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

          <AdaptiveBenchmarkExportPanel
            profile={profile}
            sessionFeedback={sessionFeedback}
            exportPanelOpen={exportPanelOpen}
            setExportPanelOpen={setExportPanelOpen}
            exportPayloads={exportPayloads}
            hasBenchmarkData={hasBenchmarkData}
            hasSessionFeedback={hasSessionFeedback}
            humanFeedbackEditorOpen={humanFeedbackEditorOpen}
            setHumanFeedbackEditorOpen={setHumanFeedbackEditorOpen}
            humanFeedbackDraft={humanFeedbackDraft}
            setHumanFeedbackDraft={setHumanFeedbackDraft}
            setExportStatusMessage={setExportStatusMessage}
            copyToClipboard={copyToClipboard}
            formatPromptSizeHint={formatPromptSizeHint}
            onCopyBenchmark={onCopyBenchmark}
            onExportBenchmark={onExportBenchmark}
            onCopyScriptPrompt={onCopyScriptPrompt}
            onCopyBenchmarkWithScriptPrompt={onCopyBenchmarkWithScriptPrompt}
            onCopyScriptTemplate={onCopyScriptTemplate}
            onCopySessionFeedback={onCopySessionFeedback}
            onCopyBenchmarkFeedback={onCopyBenchmarkFeedback}
            onCopyBenchmarkFeedbackPrompt={onCopyBenchmarkFeedbackPrompt}
            onCopyBenchmarkFeedbackPromptWithHumanFeedback={onCopyBenchmarkFeedbackPromptWithHumanFeedback}
          />
        </div>
      </section>

      <div className="adaptive-section-header adaptive-subsection-header">
        <div>
          <p className="dashboard-eyebrow">Benchmarks</p>
          <h4>Aggregate benchmark metrics</h4>
        </div>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={() => setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, kpis: !prev.kpis }))}
          aria-expanded={workspaceSubsectionsExpanded.kpis}
          aria-label={workspaceSubsectionsExpanded.kpis ? 'Collapse section' : 'Expand section'}
          title={workspaceSubsectionsExpanded.kpis ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${workspaceSubsectionsExpanded.kpis ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>
      {workspaceSubsectionsExpanded.kpis ? (
        <div className="today-summary-grid">
          <Metric label="Sweet Spot Score" value={formatScore(profile.sweetSpotScore)} />
          <Metric label="Semantic Fidelity" value={formatScore(profile.semanticFidelityScore)} />
          <Metric label="Control Fidelity" value={formatScore(profile.controlFidelityScore)} />
          <Metric label="Learning Effectiveness" value={formatScore(profile.learningEffectivenessScore)} />
          <Metric label="Flow Stability" value={formatScore(profile.flowStabilityScore)} />
          <Metric label="Avg accuracy" value={`${formatPercent(profile.averageAccuracy)}`} />
          <Metric label="Avg WPM" value={profile.averageWpm.toFixed(1)} />
          <Metric label="Avg lag" value={`${profile.averageLagSec.toFixed(2)}s`} />
          <Metric label="Preferred rate" value={`${profile.preferredPlaybackRate.toFixed(2)}x`} />
          <Metric label="Preferred phrase" value={profile.preferredPhraseSize} />
        </div>
      ) : null}

      <div className="adaptive-section-header adaptive-subsection-header">
        <div>
          <p className="dashboard-eyebrow">Next Training Targets</p>
          <h4>Target zone and trends</h4>
        </div>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={() => setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, coach: !prev.coach }))}
          aria-expanded={workspaceSubsectionsExpanded.coach}
          aria-label={workspaceSubsectionsExpanded.coach ? 'Collapse section' : 'Expand section'}
          title={workspaceSubsectionsExpanded.coach ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${workspaceSubsectionsExpanded.coach ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>
      {workspaceSubsectionsExpanded.coach ? (
        <Suspense fallback={<AdaptiveChartLoadingState />}>
          <div className="adaptive-coach-grid" aria-label="Benchmark coach charts">
          <section className="dashboard-card adaptive-coach-card adaptive-coach-card-gauge">
            <SweetSpotGauge score={profile.sweetSpotScore} />
            <div className="adaptive-coach-card-meta">
              <div>
                <span>Target rate</span>
                <strong>
                  {profile.recommendation.targetRateRange[0].toFixed(2)}x-{profile.recommendation.targetRateRange[1].toFixed(2)}x
                </strong>
              </div>
              <div>
                <span>Target phrase</span>
                <strong>{profile.recommendation.targetPhraseSize}</strong>
              </div>
              <div>
                <span>Target pause</span>
                <strong>{Math.round(profile.recommendation.targetPauseMs)}ms</strong>
              </div>
            </div>
          </section>
          <section className="dashboard-card adaptive-coach-card adaptive-coach-card-zone">
            <TargetZoneChart profile={profile} />
          </section>
          <section className="dashboard-card adaptive-coach-card adaptive-coach-card-trends">
            <MiniTrends profile={profile} />
          </section>
          <section className="dashboard-card adaptive-coach-card adaptive-coach-card-rate">
            <RateAccuracyStrip profile={profile} />
          </section>
          <section className="dashboard-card adaptive-coach-card adaptive-coach-card-lag">
            <LagDistributionChart profile={profile} />
          </section>
        </div>
        </Suspense>
      ) : null}

      <div className="adaptive-section-header adaptive-subsection-header">
        <div>
          <p className="dashboard-eyebrow">Latest Session</p>
          <h4>Playback issues and improvement deltas</h4>
        </div>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={() => setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, feedback: !prev.feedback }))}
          aria-expanded={workspaceSubsectionsExpanded.feedback}
          aria-label={workspaceSubsectionsExpanded.feedback ? 'Collapse section' : 'Expand section'}
          title={workspaceSubsectionsExpanded.feedback ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${workspaceSubsectionsExpanded.feedback ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>
      {workspaceSubsectionsExpanded.feedback ? (
      <section className="adaptive-benchmark-subpanel adaptive-session-feedback-panel">
        <div id="adaptive-session-feedback" />
        <div className="dashboard-card-header">
          <div>
            <h4>Session Feedback</h4>
            <p className="dashboard-meta">Use Training Cockpit Export / Copy Actions for session-feedback exports and prompt packages.</p>
          </div>
        </div>
        {sessionFeedbackMessage ? (
          <p className={sessionFeedbackMessage.toLowerCase().includes('could not') ? 'error' : 'success'}>{sessionFeedbackMessage}</p>
        ) : null}
        {sessionFeedback ? (
          <>
            <div className="today-summary-grid">
              <Metric label="Verdict" value={sessionFeedback.verdict} />
              <Metric label="Improvement" value={formatScore(sessionFeedback.improvementDelta.overallImprovementScore)} />
              <Metric label="Accuracy delta" value={formatSigned(sessionFeedback.improvementDelta.accuracyDelta)} />
              <Metric label="Lag delta" value={`${formatSigned(sessionFeedback.improvementDelta.lagDelta)}s`} />
              <Metric label="WPM delta" value={formatSigned(sessionFeedback.improvementDelta.wpmDelta)} />
              <Metric label="Sweet spot delta" value={formatSigned(sessionFeedback.improvementDelta.sweetSpotScoreDelta)} />
              <Metric label="Semantic delta" value={formatSigned(sessionFeedback.improvementDelta.semanticFidelityDelta)} />
              <Metric label="Control delta" value={formatSigned(sessionFeedback.improvementDelta.controlFidelityDelta)} />
              <Metric label="Learning delta" value={formatSigned(sessionFeedback.improvementDelta.learningEffectivenessDelta)} />
              <Metric label="Flow delta" value={formatSigned(sessionFeedback.improvementDelta.flowStabilityDelta)} />
            </div>
            <div className="adaptive-benchmark-grid">
              <section className="adaptive-benchmark-subpanel">
                <h4>Playback Issues</h4>
                <div className="today-summary-grid">
                  <Metric label="Repeated phrases" value={String(sessionFeedback.playbackIssues.repeatedPhraseCount)} />
                  <Metric label="Max repeat" value={String(sessionFeedback.playbackIssues.maxRepeatCountForSinglePhrase)} />
                  <Metric label="Skipped phrases" value={String(sessionFeedback.playbackIssues.skippedPhraseCount)} />
                  <Metric label="Out-of-order" value={String(sessionFeedback.playbackIssues.outOfOrderAdvanceCount)} />
                  <Metric label="Replay advanced" value={String(sessionFeedback.playbackIssues.replayAdvancedPhraseCount)} />
                  <Metric label="Index jumps" value={String(sessionFeedback.playbackIssues.phraseIndexJumpCount)} />
                </div>
                {sessionFeedback.playbackIssues.repeatedPhrases.length > 0 ? (
                  <div className="script-phrase-preview">
                    {sessionFeedback.playbackIssues.repeatedPhrases.slice(0, 5).map((phrase) => (
                      <p key={phrase.phraseId} className="hint">
                        {phrase.phraseId}: repeated {phrase.repeatCount} time(s) · {phrase.textPreview}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="hint">No repeated phrases detected.</p>
                )}
              </section>
              <section className="adaptive-benchmark-subpanel">
                <h4>Phrase Stats</h4>
                <div className="today-summary-grid">
                  <Metric label="Total phrases" value={String(sessionFeedback.phraseStats.totalPhrases)} />
                  <Metric label="Completed" value={String(sessionFeedback.phraseStats.completedPhrases)} />
                  <Metric label="Replays" value={String(sessionFeedback.phraseStats.replayCount)} />
                  <Metric label="Advances" value={String(sessionFeedback.phraseStats.phraseAdvanceCount)} />
                  <Metric label="Avg repeats" value={sessionFeedback.phraseStats.averageRepeatsPerPhrase.toFixed(2)} />
                </div>
                {sessionFeedback.notes.map((note) => (
                  <p key={note} className="hint">{note}</p>
                ))}
              </section>
            </div>
          </>
        ) : (
          <div className="adaptive-benchmark-subpanel">
            <p className="hint">No completed session feedback for this input/language yet. Timeline fallback diagnostics are shown when available.</p>
            <div className="today-summary-grid">
              <Metric label="Fallback source" value={fallbackDiagnostics.source} />
              <Metric label="Replay events" value={String(fallbackDiagnostics.replayCount)} />
              <Metric label="Repeated phrases" value={String(fallbackDiagnostics.repeatedPhraseCount)} />
              <Metric label="Max repeat" value={String(fallbackDiagnostics.maxRepeatCountForSinglePhrase)} />
              <Metric label="Deferred pauses" value={String(fallbackDiagnostics.deferPauseCount)} />
              <Metric label="Index jumps" value={String(fallbackDiagnostics.phraseIndexJumpCount)} />
            </div>
            {fallbackDiagnostics.repeatedPhrasePreviews.length > 0 ? (
              <div className="script-phrase-preview">
                {fallbackDiagnostics.repeatedPhrasePreviews.slice(0, 5).map((preview) => (
                  <p key={preview} className="hint">{preview}</p>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>
      ) : null}

      <div className="adaptive-section-header adaptive-subsection-header">
        <div>
          <p className="dashboard-eyebrow">Diagnostics</p>
          <h4>Semantic + recovery + recommendation</h4>
        </div>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={() => setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, deepMetrics: !prev.deepMetrics }))}
          aria-expanded={workspaceSubsectionsExpanded.deepMetrics}
          aria-label={workspaceSubsectionsExpanded.deepMetrics ? 'Collapse section' : 'Expand section'}
          title={workspaceSubsectionsExpanded.deepMetrics ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${workspaceSubsectionsExpanded.deepMetrics ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>
      {workspaceSubsectionsExpanded.deepMetrics ? (
        <div className="adaptive-benchmark-grid">
          <section className="adaptive-benchmark-subpanel">
            <h4>Rate vs accuracy</h4>
            {profile.rateAccuracyBuckets.length === 0 ? (
              <p className="hint">No rate buckets collected yet.</p>
            ) : (
              <div className="adaptive-rate-bars">
                {profile.rateAccuracyBuckets.map((bucket) => (
                  <div key={bucket.rate} className="adaptive-rate-bar">
                    <span>{bucket.rate.toFixed(2)}x</span>
                    <div className="today-chart-track">
                      <div className="today-chart-fill" style={{ width: `${Math.round(normalizeAccuracyForDisplay(bucket.averageAccuracy) * 100)}%` }} />
                    </div>
                    <small>{formatPercent(bucket.averageAccuracy)} · lag {bucket.averageLagSec.toFixed(1)}s</small>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="adaptive-benchmark-subpanel">
            <h4>Semantic quality</h4>
            <div className="today-summary-grid">
              <Metric label="Cut penalty" value={profile.semanticCutPenalty.toFixed(2)} />
              <Metric label="Unsafe pauses" value={String(profile.unsafePauseCount)} />
              <Metric label="Safe pauses" value={String(profile.safePauseCount)} />
              <Metric label="Deferred pauses" value={String(profile.deferredPauseCount)} />
              <Metric label="Replay denied" value={String(profile.replayDeniedByBoundaryCount)} />
              <Metric label="Completeness" value={profile.averageSemanticCompleteness.toFixed(2)} />
              <Metric label="Difficulty" value={profile.averagePhraseDifficulty.toFixed(2)} />
            </div>
          </section>

          <section className="adaptive-benchmark-subpanel">
            <h4>Adaptation and recovery</h4>
            <div className="today-summary-grid">
              <Metric label="Recovery" value={formatScore(profile.recoveryScore)} />
              <Metric label="Recovery time" value={profile.timeToRecoveryMs === null ? 'n/a' : `${Math.round(profile.timeToRecoveryMs / 1000)}s`} />
              <Metric label="Error burst" value={String(profile.errorBurstLength)} />
              <Metric label="Mode switches" value={profile.modeSwitchFrequency.toFixed(2)} />
              <Metric label="Rate variance" value={profile.rateVariance.toFixed(3)} />
              <Metric label="Pause variance" value={profile.pauseVariance.toFixed(0)} />
            </div>
          </section>

          <section className="adaptive-benchmark-subpanel">
            <h4>Recommendation</h4>
            <div className="today-summary-grid">
              <Metric label="Target rate" value={recommendedRange} />
              <Metric label="Phrase size" value={profile.recommendation.targetPhraseSize} />
              <Metric label="Pause" value={`${profile.recommendation.targetPauseMs}ms`} />
              <Metric label="Confidence" value={formatScore(profile.recommendation.confidence)} />
            </div>
            <p className="dashboard-meta">{profile.recommendation.summary}</p>
            {browserTtsDePauseNote ? <p className="hint">{browserTtsDePauseNote}</p> : null}
            {browserTtsDeSemanticNote ? <p className="hint">{browserTtsDeSemanticNote}</p> : null}
            <p className="hint">Focus: {profile.recommendation.nextTrainingFocus.join(', ')}</p>
            <p className="hint">Weak areas: {profile.weakAreas.length > 0 ? profile.weakAreas.join(', ') : 'none detected'}</p>
          </section>
        </div>
      ) : null}

      <div className="adaptive-section-header adaptive-subsection-header">
        <div>
          <p className="dashboard-eyebrow">Diagnostics</p>
          <h4>Recent decisions</h4>
        </div>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={() => setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, timeline: !prev.timeline }))}
          aria-expanded={workspaceSubsectionsExpanded.timeline}
          aria-label={workspaceSubsectionsExpanded.timeline ? 'Collapse section' : 'Expand section'}
          title={workspaceSubsectionsExpanded.timeline ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${workspaceSubsectionsExpanded.timeline ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>

      {workspaceSubsectionsExpanded.timeline ? (
        <div className="adaptive-benchmark-grid">
          <section className="adaptive-benchmark-subpanel adaptive-benchmark-timeline">
            <h4>Timeline and debug</h4>
            <div className="today-summary-grid">
              <Metric label="Sessions" value={String(profile.sessionCount)} />
              <Metric label="Samples" value={String(profile.sampleCount)} />
              <Metric label="Window" value={`${profile.rollingWindowDays} days`} />
              <Metric label="Last update" value={profile.lastUpdatedAt ? formatSessionDate(profile.lastUpdatedAt) : 'n/a'} />
              <Metric label="Phrase index" value={debugLatest?.phraseIndex !== undefined ? `${debugLatest.phraseIndex}/${debugLatest.totalSemanticPhrases ?? 'n/a'}` : 'n/a'} />
              <Metric label="Pacing mode" value={debugLatest?.mode ?? 'n/a'} />
              <Metric label="Decision" value={debugLatest?.decisionReason ?? 'n/a'} />
              <Metric label="Hint" value={debugLatest?.executionHint ?? 'n/a'} />
            </div>
            <div className="adaptive-timeline-row">
              {profile.timeline.slice(-60).map((point, index) => (
                <span
                  key={`${point.timestampMs}-${index}`}
                  className={`adaptive-timeline-dot adaptive-timeline-dot-${point.event ?? point.mode}`}
                  title={`${point.event ?? point.mode} · ${point.playbackRate.toFixed(2)}x · ${formatPercent(point.accuracy)}`}
                />
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
