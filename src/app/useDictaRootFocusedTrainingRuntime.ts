import { perfDiagnostics } from '../core/perfDiagnostics';
import { useDictaFocusedTrainingRuntime } from './useDictaFocusedTrainingRuntime';

type DictaFocusedTrainingRuntimeOptions = Parameters<typeof useDictaFocusedTrainingRuntime>[0];

export type DictaRootFocusedTrainingRuntimeOptions = Omit<
  DictaFocusedTrainingRuntimeOptions,
  'perfDiagnostics'
>;

export function useDictaRootFocusedTrainingRuntime(options: DictaRootFocusedTrainingRuntimeOptions) {
  return useDictaFocusedTrainingRuntime({
    ...options,
    perfDiagnostics,
  });
}
