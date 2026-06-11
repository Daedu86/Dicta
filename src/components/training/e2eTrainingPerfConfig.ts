import { perfDiagnostics } from '../../core/perfDiagnostics';

export function configureE2ETrainingPerf(): void {
  perfDiagnostics.configure({ envDev: true, search: '?perf=1', storage: window.localStorage });
  perfDiagnostics.reset();
}
