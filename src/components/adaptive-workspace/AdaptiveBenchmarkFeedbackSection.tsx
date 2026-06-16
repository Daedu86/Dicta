import { formatScore, formatSigned } from './adaptiveWorkspaceViewHelpers';
import type { AdaptiveBenchmarkCockpitProps, AdaptiveBenchmarkCockpitRuntime } from './AdaptiveBenchmarkCockpitTypes';
import { AdaptiveBenchmarkCollapsibleSection, Metric } from './AdaptiveBenchmarkCockpitWidgets';

export function AdaptiveBenchmarkFeedbackSection({
  sessionFeedback,
  sessionFeedbackMessage,
  fallbackDiagnostics,
  runtime,
}: Pick<AdaptiveBenchmarkCockpitProps, 'sessionFeedback' | 'sessionFeedbackMessage'> & {
  fallbackDiagnostics: AdaptiveBenchmarkCockpitRuntime['fallbackDiagnostics'];
  runtime: Pick<AdaptiveBenchmarkCockpitRuntime, 'workspaceSubsectionsExpanded' | 'setWorkspaceSubsectionsExpanded'>;
}) {
  return (
    <AdaptiveBenchmarkCollapsibleSection eyebrow="Latest Session" title="Playback issues and improvement deltas" sectionId="feedback" runtime={runtime}>
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
    </AdaptiveBenchmarkCollapsibleSection>
  );
}
