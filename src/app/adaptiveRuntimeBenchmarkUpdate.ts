import {
  createEmptyInputLanguageBenchmark,
  updateInputLanguageBenchmark,
} from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type { LanguageCode, LiveTelemetryFrame, PacingDecision } from '../core/adaptive/types';
import type { AdaptiveBenchmarksByInputLanguage } from '../components/openrouter/types';
import type { AdaptiveRuntimeRecordBenchmarkOptions } from './adaptiveRuntimeTypes';

type BuildAdaptiveBenchmarkUpdateArgs = {
  current: AdaptiveBenchmarksByInputLanguage;
  live: LiveTelemetryFrame;
  decision: PacingDecision;
  sessionId: string;
  language: LanguageCode;
  now: number;
  options: AdaptiveRuntimeRecordBenchmarkOptions;
};

export function buildAdaptiveBenchmarkUpdate({
  current,
  live,
  decision,
  sessionId,
  language,
  now,
  options,
}: BuildAdaptiveBenchmarkUpdateArgs): AdaptiveBenchmarksByInputLanguage {
  const inputBenchmarks = current[live.inputMode] ?? {};
  const existing = inputBenchmarks[language] ?? createEmptyInputLanguageBenchmark(live.inputMode, language);
  const updated = updateInputLanguageBenchmark({
    current: existing,
    live,
    decision,
    sessionId,
    ttsEnvironment: options.ttsEnvironment,
    phraseIndex: options.phraseIndex,
    totalSemanticPhrases: options.totalSemanticPhrases,
    event: options.event,
    execution: {
      requestedPlaybackRate: decision.playbackRate,
      actualPlaybackRate: options.actualPlaybackRate ?? live.currentPlaybackRate,
      requestedPauseMs: decision.pauseAfterPhraseMs,
      actualPauseMs: options.actualPauseMs,
      requestedReplay: decision.shouldReplayPhrase,
      replayExecuted: options.replayExecuted,
      requestedBoundaryType: live.phraseBoundaryType,
      actualBoundaryType: options.actualBoundaryType ?? live.phraseBoundaryType,
      decisionAppliedAtMs: now,
      executionStartedAtMs: now,
    },
  });

  return {
    ...current,
    [live.inputMode]: {
      ...inputBenchmarks,
      [language]: updated,
    },
  };
}
