import {
  sampleTtsPerformance,
  type TtsPerformanceSampleOptions,
} from './useTtsPerformanceSampler';
import type { TtsPerformanceSampleResult } from './sessionTypes';
import type { TtsPerformanceSamplerDependencies } from './ttsPerformanceSamplerTypes';

export type TtsPerformanceSampleRuntime = (
  options?: TtsPerformanceSampleOptions,
) => TtsPerformanceSampleResult;

export function createTtsPerformanceSampleRuntime(
  dependencies: TtsPerformanceSamplerDependencies,
): TtsPerformanceSampleRuntime {
  return (options: TtsPerformanceSampleOptions = {}) =>
    sampleTtsPerformance(dependencies, options);
}
