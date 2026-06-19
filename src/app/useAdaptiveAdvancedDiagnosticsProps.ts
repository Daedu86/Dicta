import { useMemo, type ComponentProps, type Dispatch, type SetStateAction } from 'react';
import type { AdaptiveAdvancedDiagnostics } from '../components/adaptive-workspace/AdaptiveAdvancedDiagnostics';

type AdaptiveAdvancedDiagnosticsProps = ComponentProps<typeof AdaptiveAdvancedDiagnostics>;
type AdaptiveSectionExpandedState = AdaptiveAdvancedDiagnosticsProps['adaptiveSectionExpanded'] & {
  benchmarks: boolean;
};

type UseAdaptiveAdvancedDiagnosticsPropsArgs = Omit<
  AdaptiveAdvancedDiagnosticsProps,
  | 'adaptiveSectionExpanded'
  | 'onToggleDecisionArchitectureSections'
  | 'onToggleLatestSections'
  | 'onToggleTelemetrySection'
> & {
  adaptiveSectionExpanded: AdaptiveSectionExpandedState;
  setAdaptiveSectionExpanded: Dispatch<SetStateAction<AdaptiveSectionExpandedState>>;
};

export function useAdaptiveAdvancedDiagnosticsProps({
  adaptiveSectionExpanded,
  latestSession,
  latestInputAdapter,
  latestAdaptiveMode,
  adaptiveSemanticDebug,
  setAdaptiveSectionExpanded,
}: UseAdaptiveAdvancedDiagnosticsPropsArgs): AdaptiveAdvancedDiagnosticsProps {
  return useMemo(() => ({
    adaptiveSectionExpanded,
    latestSession,
    latestInputAdapter,
    latestAdaptiveMode,
    adaptiveSemanticDebug,
    onToggleDecisionArchitectureSections: () =>
      setAdaptiveSectionExpanded((prev) => ({
        ...prev,
        decision: !(prev.decision && prev.architecture),
        architecture: !(prev.decision && prev.architecture),
      })),
    onToggleLatestSections: () =>
      setAdaptiveSectionExpanded((prev) => ({
        ...prev,
        latest: !(prev.latest && prev.live),
        live: !(prev.latest && prev.live),
      })),
    onToggleTelemetrySection: () => setAdaptiveSectionExpanded((prev) => ({ ...prev, telemetry: !prev.telemetry })),
  }), [
    adaptiveSectionExpanded,
    latestSession,
    latestInputAdapter,
    latestAdaptiveMode,
    adaptiveSemanticDebug,
    setAdaptiveSectionExpanded,
  ]);
}
