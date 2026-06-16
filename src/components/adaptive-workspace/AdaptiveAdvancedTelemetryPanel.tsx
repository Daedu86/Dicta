import type { AdaptiveLatestSession, AdaptiveSemanticDebug } from './AdaptiveAdvancedDiagnosticsTypes';
import { countTelemetrySamples, getRateDistributionPercentage } from './AdaptiveAdvancedDiagnosticsHelpers';
import { AdaptiveAdvancedChartBar, AdaptiveAdvancedMetric, AdaptiveAdvancedSectionHeader } from './AdaptiveAdvancedDiagnosticsWidgets';

export function AdaptiveAdvancedTelemetryPanel({
  expanded,
  latestSession,
  adaptiveSemanticDebug,
  onToggle,
}: {
  expanded: boolean;
  latestSession: AdaptiveLatestSession | null;
  adaptiveSemanticDebug: AdaptiveSemanticDebug;
  onToggle: () => void;
}) {
  if (!latestSession) return null;

  return (
    <section className="panel workspace-panel adaptive-telemetry-panel">
      <AdaptiveAdvancedSectionHeader
        eyebrow="Diagnostics"
        title="Debug counters"
        meta="Most recent live debug counters, semantic pacing signals, and rate distribution."
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded ? (
        <>
          <div className="today-summary-grid">
            <AdaptiveAdvancedMetric label="Samples" value={String(countTelemetrySamples(latestSession.telemetry))} ariaLabel={`Samples: ${String(countTelemetrySamples(latestSession.telemetry))}`} />
            <AdaptiveAdvancedMetric label="Actions" value={String(latestSession.telemetry.actions.length)} ariaLabel={`Actions: ${String(latestSession.telemetry.actions.length)}`} />
            <AdaptiveAdvancedMetric label="Rate buckets" value={String(latestSession.telemetry.rateDistribution.length)} ariaLabel={`Rate buckets: ${String(latestSession.telemetry.rateDistribution.length)}`} />
            <AdaptiveAdvancedMetric label="Repeat count" value={String(latestSession.telemetry.repeatCount)} ariaLabel={`Repeat count: ${String(latestSession.telemetry.repeatCount)}`} />
            <AdaptiveAdvancedMetric label="TTS chunks" value={String(latestSession.telemetry.ttsChunks.length)} ariaLabel={`TTS chunks: ${String(latestSession.telemetry.ttsChunks.length)}`} />
          </div>
          <div className="today-summary-grid">
            <AdaptiveAdvancedMetric label="Semantic cut penalty" value={adaptiveSemanticDebug.semanticCutPenalty.toFixed(2)} ariaLabel={`Semantic cut penalty: ${adaptiveSemanticDebug.semanticCutPenalty.toFixed(2)}`} />
            <AdaptiveAdvancedMetric label="Unsafe pauses" value={String(adaptiveSemanticDebug.unsafePauseCount)} ariaLabel={`Unsafe pauses: ${String(adaptiveSemanticDebug.unsafePauseCount)}`} />
            <AdaptiveAdvancedMetric label="Safe pauses" value={String(adaptiveSemanticDebug.safePauseCount)} ariaLabel={`Safe pauses: ${String(adaptiveSemanticDebug.safePauseCount)}`} />
            <AdaptiveAdvancedMetric label="Deferred pauses" value={String(adaptiveSemanticDebug.deferredPauseCount)} ariaLabel={`Deferred pauses: ${String(adaptiveSemanticDebug.deferredPauseCount)}`} />
            <AdaptiveAdvancedMetric label="Replay denied" value={String(adaptiveSemanticDebug.replayDeniedByBoundaryCount)} ariaLabel={`Replay denied: ${String(adaptiveSemanticDebug.replayDeniedByBoundaryCount)}`} />
            <AdaptiveAdvancedMetric label="Avg completeness" value={adaptiveSemanticDebug.averageSemanticCompleteness.toFixed(2)} ariaLabel={`Avg completeness: ${adaptiveSemanticDebug.averageSemanticCompleteness.toFixed(2)}`} />
            <AdaptiveAdvancedMetric label="Avg difficulty" value={adaptiveSemanticDebug.averagePhraseDifficulty.toFixed(2)} ariaLabel={`Avg difficulty: ${adaptiveSemanticDebug.averagePhraseDifficulty.toFixed(2)}`} />
            <AdaptiveAdvancedMetric label="Execution fidelity" value={adaptiveSemanticDebug.inputExecutionFidelityScore.toFixed(2)} ariaLabel={`Execution fidelity: ${adaptiveSemanticDebug.inputExecutionFidelityScore.toFixed(2)}`} />
            <AdaptiveAdvancedMetric label="Phrase index" value={`${adaptiveSemanticDebug.currentPhraseIndex}/${adaptiveSemanticDebug.totalSemanticPhrases}`} ariaLabel={`Phrase index: ${adaptiveSemanticDebug.currentPhraseIndex}/${adaptiveSemanticDebug.totalSemanticPhrases}`} />
            <AdaptiveAdvancedMetric label="Phrase id" value={adaptiveSemanticDebug.currentPhraseId} ariaLabel={`Phrase id: ${adaptiveSemanticDebug.currentPhraseId}`} />
            <AdaptiveAdvancedMetric label="Phrase preview" value={adaptiveSemanticDebug.currentPhraseTextPreview || 'n/a'} ariaLabel={`Phrase preview: ${adaptiveSemanticDebug.currentPhraseTextPreview || 'n/a'}`} />
            <AdaptiveAdvancedMetric label="Phrase advances" value={String(adaptiveSemanticDebug.phraseAdvanceCount)} ariaLabel={`Phrase advances: ${String(adaptiveSemanticDebug.phraseAdvanceCount)}`} />
            <AdaptiveAdvancedMetric label="Phrase replays" value={String(adaptiveSemanticDebug.phraseReplayCount)} ariaLabel={`Phrase replays: ${String(adaptiveSemanticDebug.phraseReplayCount)}`} />
            <AdaptiveAdvancedMetric label="Last phrase reason" value={adaptiveSemanticDebug.lastPhraseAdvanceReason} ariaLabel={`Last phrase reason: ${adaptiveSemanticDebug.lastPhraseAdvanceReason}`} />
          </div>
          <div className="today-chart-row">
            {latestSession.telemetry.rateDistribution.map((entry) => (
              <AdaptiveAdvancedChartBar
                key={entry.rate}
                label={`${entry.rate.toFixed(2)}x`}
                widthPercent={getRateDistributionPercentage(entry.seconds, latestSession.telemetry.rateDistribution)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
