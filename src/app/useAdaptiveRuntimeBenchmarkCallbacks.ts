import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { normalizeBenchmarkLanguage } from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type { LiveTelemetryFrame, PacingDecision } from '../core/adaptive/types';
import { perfDiagnostics } from '../core/perfDiagnostics';
import type { AdaptiveBenchmarksByInputLanguage } from '../components/openrouter/types';
import { buildAdaptiveBenchmarkUpdate } from './adaptiveRuntimeBenchmarkUpdate';
import type { AdaptiveRuntimeRecordBenchmarkOptions } from './adaptiveRuntimeTypes';

export type UseAdaptiveRuntimeBenchmarkCallbacksOptions = {
  activeSessionId: string;
  setAdaptiveBenchmarks: Dispatch<SetStateAction<AdaptiveBenchmarksByInputLanguage>>;
  adaptiveBenchmarksRef: MutableRefObject<AdaptiveBenchmarksByInputLanguage>;
  adaptiveBenchmarkLastUpdateRef: MutableRefObject<Record<string, number>>;
};

export function useAdaptiveRuntimeBenchmarkCallbacks({
  activeSessionId,
  setAdaptiveBenchmarks,
  adaptiveBenchmarksRef,
  adaptiveBenchmarkLastUpdateRef,
}: UseAdaptiveRuntimeBenchmarkCallbacksOptions) {
  const recordAdaptiveBenchmark = useCallback(
    (
      live: LiveTelemetryFrame,
      decision: PacingDecision,
      options: AdaptiveRuntimeRecordBenchmarkOptions = {},
    ): void => {
      const endPerfSpan = perfDiagnostics.startSpan('adaptive.benchmark.update', {
        inputMode: live.inputMode,
        language: live.language,
      });
      const language = normalizeBenchmarkLanguage(live.language);
      const key = `${live.inputMode}:${language}`;
      const now = Date.now();
      const lastUpdate = adaptiveBenchmarkLastUpdateRef.current[key] ?? 0;
      if (options.throttleMs && now - lastUpdate < options.throttleMs) {
        endPerfSpan();
        return;
      }
      adaptiveBenchmarkLastUpdateRef.current[key] = now;

      try {
        setAdaptiveBenchmarks((current) => {
          const nextBenchmarks = buildAdaptiveBenchmarkUpdate({
            current,
            live,
            decision,
            sessionId: activeSessionId,
            language,
            now,
            options,
          });
          adaptiveBenchmarksRef.current = nextBenchmarks;
          return nextBenchmarks;
        });
      } finally {
        endPerfSpan();
      }
    },
    [activeSessionId, adaptiveBenchmarkLastUpdateRef, adaptiveBenchmarksRef, setAdaptiveBenchmarks],
  );

  return { recordAdaptiveBenchmark };
}
