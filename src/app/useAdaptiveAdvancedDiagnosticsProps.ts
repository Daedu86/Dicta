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
  | 'onToggleAdaptersSection'
  | 'onToggleLatestSections'
  | 'onToggleTelemetrySection'
  | 'onOpenAdapter'
> & {
  adaptiveSectionExpanded: AdaptiveSectionExpandedState;
  setAdaptiveSectionExpanded: Dispatch<SetStateAction<AdaptiveSectionExpandedState>>;
  setSelectedBenchmarkInputMode: Dispatch<SetStateAction<AdaptiveAdvancedDiagnosticsProps['selectedBenchmarkInputMode']>>;
  setBenchmarkExportMessage: (message: string) => void;
  setSessionFeedbackMessage: (message: string) => void;
};

export function useAdaptiveAdvancedDiagnosticsProps({
  adaptiveSectionExpanded,
  adaptiveAdapters,
  latestSession,
  latestInputAdapter,
  latestAdaptiveMode,
  selectedBenchmarkInputMode,
  adaptiveSemanticDebug,
  mapSessionInputMode,
  setAdaptiveSectionExpanded,
  setSelectedBenchmarkInputMode,
  setBenchmarkExportMessage,
  setSessionFeedbackMessage,
}: UseAdaptiveAdvancedDiagnosticsPropsArgs): AdaptiveAdvancedDiagnosticsProps {
  return useMemo(() => ({
    adaptiveSectionExpanded,
    adaptiveAdapters,
    latestSession,
    latestInputAdapter,
    latestAdaptiveMode,
    selectedBenchmarkInputMode,
    adaptiveSemanticDebug,
    mapSessionInputMode,
    onToggleDecisionArchitectureSections: () =>
      setAdaptiveSectionExpanded((prev) => ({
        ...prev,
        decision: !(prev.decision && prev.architecture),
        architecture: !(prev.decision && prev.architecture),
      })),
    onToggleAdaptersSection: () => setAdaptiveSectionExpanded((prev) => ({ ...prev, adapters: !prev.adapters })),
    onToggleLatestSections: () =>
      setAdaptiveSectionExpanded((prev) => ({
        ...prev,
        latest: !(prev.latest && prev.live),
        live: !(prev.latest && prev.live),
      })),
    onToggleTelemetrySection: () => setAdaptiveSectionExpanded((prev) => ({ ...prev, telemetry: !prev.telemetry })),
    onOpenAdapter: (inputMode) => {
      setSelectedBenchmarkInputMode(mapSessionInputMode(inputMode));
      setBenchmarkExportMessage('');
      setSessionFeedbackMessage('');
      window.setTimeout(() => {
        document.getElementById('adaptive-benchmarks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    },
  }), [
    adaptiveSectionExpanded,
    adaptiveAdapters,
    latestSession,
    latestInputAdapter,
    latestAdaptiveMode,
    selectedBenchmarkInputMode,
    adaptiveSemanticDebug,
    mapSessionInputMode,
    setAdaptiveSectionExpanded,
    setSelectedBenchmarkInputMode,
    setBenchmarkExportMessage,
    setSessionFeedbackMessage,
  ]);
}
