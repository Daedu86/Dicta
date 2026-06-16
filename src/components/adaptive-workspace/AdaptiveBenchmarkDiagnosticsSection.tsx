import {
  formatPercent,
  formatScore,
  normalizeAccuracyForDisplay,
} from './adaptiveWorkspaceViewHelpers';
import type { AdaptiveBenchmarkCockpitProps, AdaptiveBenchmarkCockpitRuntime } from './AdaptiveBenchmarkCockpitTypes';
import { AdaptiveBenchmarkCollapsibleSection, Metric } from './AdaptiveBenchmarkCockpitWidgets';

export function AdaptiveBenchmarkDiagnosticsSection({
  profile,
  recommendedRange,
  browserTtsDePauseNote,
  browserTtsDeSemanticNote,
  runtime,
}: Pick<AdaptiveBenchmarkCockpitProps, 'profile'> & {
  recommendedRange: string;
  browserTtsDePauseNote: string | null;
  browserTtsDeSemanticNote: string | null;
  runtime: Pick<AdaptiveBenchmarkCockpitRuntime, 'workspaceSubsectionsExpanded' | 'setWorkspaceSubsectionsExpanded'>;
}) {
  return (
    <AdaptiveBenchmarkCollapsibleSection eyebrow="Diagnostics" title="Semantic + recovery + recommendation" sectionId="deepMetrics" runtime={runtime}>
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
    </AdaptiveBenchmarkCollapsibleSection>
  );
}
