import type { Dispatch, SetStateAction } from 'react';
import type { AsyncOrSyncBenchmarkHandler } from './adaptiveBenchmarkSectionPropsTypes';

export function toggleAdaptiveBenchmarkExpanded<TAdaptiveSectionExpanded extends { benchmarks: boolean }>(
  setAdaptiveSectionExpanded: Dispatch<SetStateAction<TAdaptiveSectionExpanded>>,
): void {
  setAdaptiveSectionExpanded((prev) => ({ ...prev, benchmarks: !prev.benchmarks }));
}

export function invokeBenchmarkHandler<TArgs extends unknown[]>(
  handler: AsyncOrSyncBenchmarkHandler<TArgs>,
  ...args: TArgs
): void {
  void handler(...args);
}
