import { lazy, Suspense } from 'react';
import type { AdaptiveBenchmarkCockpitProps, AdaptiveBenchmarkCockpitRuntime } from './AdaptiveBenchmarkCockpitTypes';
import { AdaptiveBenchmarkCollapsibleSection, AdaptiveChartLoadingState } from './AdaptiveBenchmarkCockpitWidgets';

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

export function AdaptiveBenchmarkCoachSection({
  profile,
  runtime,
}: Pick<AdaptiveBenchmarkCockpitProps, 'profile'> & {
  runtime: Pick<AdaptiveBenchmarkCockpitRuntime, 'workspaceSubsectionsExpanded' | 'setWorkspaceSubsectionsExpanded'>;
}) {
  return (
    <AdaptiveBenchmarkCollapsibleSection eyebrow="Next Training Targets" title="Target zone and trends" sectionId="coach" runtime={runtime}>
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
    </AdaptiveBenchmarkCollapsibleSection>
  );
}
