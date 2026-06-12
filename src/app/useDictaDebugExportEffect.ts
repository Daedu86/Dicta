import { useEffect } from 'react';
import type { InputMode, LanguageCode } from '../core/adaptive/types';
import { getBrowserTtsDeBenchmarkRejectionReason } from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { selectLatestAdaptiveSessionFeedback } from '../core/adaptive/sessionFeedback';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
} from '../components/openrouter/types';
import { buildAdaptiveEventCounts } from './adaptiveExportPackages';
import type { AdaptiveRuntime } from './useAdaptiveRuntime';
import type { DictaDebugSampleAudit } from './sessionTypes';

interface UseDictaDebugExportEffectOptions {
  activeSessionId: string;
  adaptiveBenchmarksByInputLanguage: AdaptiveBenchmarksByInputLanguage;
  adaptiveSessionFeedbackByInputLanguage: AdaptiveSessionFeedbackByInputLanguage;
  perfDiagnosticsEnabled: boolean;
  phrasePlaybackEventsRef: AdaptiveRuntime['phrasePlaybackEventsRef'];
}

export function useDictaDebugExportEffect({
  activeSessionId,
  adaptiveBenchmarksByInputLanguage,
  adaptiveSessionFeedbackByInputLanguage,
  perfDiagnosticsEnabled,
  phrasePlaybackEventsRef,
}: UseDictaDebugExportEffectOptions): void {
  useEffect(() => {
    if (!perfDiagnosticsEnabled && !import.meta.env.DEV) {
      delete window.__DICTA_DEBUG_EXPORT__;
      return;
    }

    window.__DICTA_DEBUG_EXPORT__ = () => {
      const inputMode: InputMode = 'browser-tts';
      const language: LanguageCode = 'de';
      const profile = adaptiveBenchmarksByInputLanguage[inputMode]?.[language] ?? null;
      const latestFeedback = selectLatestAdaptiveSessionFeedback(
        adaptiveSessionFeedbackByInputLanguage[inputMode]?.[language],
        inputMode,
        language,
      );
      const latestSessionId = latestFeedback?.sessionId ?? activeSessionId ?? null;
      const profileTimeline = profile?.timeline ?? [];
      const recentTimelinePoints = latestSessionId
        ? profileTimeline.filter((point) => point.sessionId === latestSessionId).slice(-120)
        : profileTimeline.slice(-120);
      const recentPhraseEvents = latestSessionId
        ? phrasePlaybackEventsRef.current.filter((event) => event.sessionId === latestSessionId).slice(-200)
        : phrasePlaybackEventsRef.current.slice(-200);
      const sampleAudit: DictaDebugSampleAudit[] = recentTimelinePoints.map((point) => {
        const rejectionReason = getBrowserTtsDeBenchmarkRejectionReason(point);
        return {
          acceptedForBenchmark: rejectionReason === null,
          rejectionReason,
          event: point.event,
          phraseId: point.phraseId,
          phraseIndex: point.phraseIndex,
          rawLagSec: point.rawLagSec,
          lagSec: point.lagSec,
          stableLagSec: point.stableLagSec,
          phraseBoundaryType: point.phraseBoundaryType,
          semanticCompleteness: point.semanticCompleteness,
          accuracy: point.accuracy,
          wpm: point.wpm,
          sessionId: point.sessionId,
          timestampMs: point.timestampMs,
        };
      });
      const placeholderStartSamples = sampleAudit.filter(
        (point) => point.wpm === 0 && point.accuracy === 1 && point.lagSec === 0 && point.rawLagSec === 0,
      );
      const benchmarkBefore = latestFeedback?.benchmarkBefore;
      const benchmarkAfter = latestFeedback?.benchmarkAfter;
      const benchmarkChanged =
        benchmarkBefore !== undefined && benchmarkAfter !== undefined
          ? JSON.stringify(benchmarkBefore) !== JSON.stringify(benchmarkAfter)
          : null;
      const output = {
        generatedAt: new Date().toISOString(),
        inputMode,
        language,
        latestSessionId,
        benchmarkProfile: profile,
        latestSessionFeedback: latestFeedback,
        recentAdaptiveTimelinePoints: recentTimelinePoints,
        recentPhrasePlaybackEvents: recentPhraseEvents,
        eventCounts: buildAdaptiveEventCounts(recentTimelinePoints, recentPhraseEvents),
        benchmarkSampleAudit: sampleAudit,
        placeholderStartSamples: {
          present: placeholderStartSamples.length > 0,
          count: placeholderStartSamples.length,
          samples: placeholderStartSamples.slice(0, 20),
        },
        benchmarkBeforeAfter: {
          available: benchmarkBefore !== undefined && benchmarkAfter !== undefined,
          changed: benchmarkChanged,
        },
        perfDiagnostics:
          typeof window.__DICTA_PERF__?.snapshot === 'function'
            ? window.__DICTA_PERF__.snapshot()
            : null,
      };
      console.info('[dicta][debug-export]', output);
      return output;
    };

    return () => {
      delete window.__DICTA_DEBUG_EXPORT__;
    };
  }, [
    activeSessionId,
    adaptiveBenchmarksByInputLanguage,
    adaptiveSessionFeedbackByInputLanguage,
    perfDiagnosticsEnabled,
    phrasePlaybackEventsRef,
  ]);
}
