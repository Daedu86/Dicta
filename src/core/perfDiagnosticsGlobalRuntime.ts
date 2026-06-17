import type { PerfDiagnosticsSnapshot } from './perfDiagnosticsTypes';

type InstallPerfDiagnosticsGlobalArgs = {
  snapshot: () => PerfDiagnosticsSnapshot;
  reset: () => void;
  enabled: () => boolean;
};

export function installPerfDiagnosticsGlobal({
  snapshot,
  reset,
  enabled,
}: InstallPerfDiagnosticsGlobalArgs): void {
  if (typeof window === 'undefined') return;
  window.__DICTA_PERF__ = { snapshot, reset, enabled };
}
