import { useCallback, useRef, useState } from 'react';
import { AdaptiveDictationController } from '../core/adaptive/AdaptiveDictationController';
import {
  createEmptyInputLanguageBenchmark,
  normalizeBenchmarkLanguage,
} from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import {
  buildAdaptiveSessionFeedback,
  hasAdaptiveSessionFeedbackForSession,
  upsertAdaptiveSessionFeedbackByInputLanguage,
} from '../core/adaptive/sessionFeedback';
import type {
  InputLanguageBenchmarkMetrics,
  InputMode,
  LanguageCode,
  LiveTelemetryFrame,
  PacingDecision,
  PhrasePlaybackEvent,
} from '../core/adaptive/types';
import { HistoricalPerformanceService } from '../core/history/HistoricalPerformanceService';
import {
  getAdaptiveControllerForScope,
  resetAdaptiveControllerForScope,
  type ScopedAdaptiveControllerRegistry,
} from './adaptiveControllerRegistry';
import { perfDiagnostics } from '../core/perfDiagnostics';
import type { SemanticPhrase } from '../core/adaptive/SemanticPhrasePlanner';
import { buildAdaptiveBenchmarkUpdate } from './adaptiveRuntimeBenchmarkUpdate';
import {
  buildHistoricalPerformanceProfile,
  findLatestFinishedBrowserTtsDeDictationScriptSession,
  mapRuntimeSessionInputMode,
  resolveRuntimeSessionLanguage,
} from './adaptiveRuntimeSessionUtils';
import type {
  AdaptiveRuntime,
  AdaptiveRuntimeOptions,
  AdaptiveRuntimeRecordBenchmarkOptions,
  AdaptiveRuntimeSessionInput,
} from './adaptiveRuntimeTypes';

export type {
  AdaptiveRuntime,
  AdaptiveRuntimeOptions,
  AdaptiveRuntimeRecordBenchmarkOptions,
  AdaptiveRuntimeSessionInput,
  AdaptiveRuntimeSessionInputMode,
  AdaptiveRuntimeSessionSource,
  AdaptiveRuntimeSessionStatus,
} from './adaptiveRuntimeTypes';

export function useAdaptiveRuntime({
  activeSession,
  activeSessionId,
  sessions,
  setAdaptiveBenchmarks,
  adaptiveBenchmarksRef,
  adaptiveSessionFeedback,
  setAdaptiveSessionFeedback,
  adaptiveSessionFeedbackRef,
  persistAdaptiveSessionFeedbackNow,
  selectedBenchmarkLanguage,
  setSelectedBenchmarkLanguage,
}: AdaptiveRuntimeOptions): AdaptiveRuntime {
  const adaptiveControllerRef = useRef(new AdaptiveDictationController());
  const adaptiveControllersByInputLanguageRef = useRef<ScopedAdaptiveControllerRegistry>({});
  const historyServiceRef = useRef(new HistoricalPerformanceService());
  const adaptiveBenchmarkLastUpdateRef = useRef<Record<string, number>>({});
  const sessionBenchmarkBeforeRef = useRef<Record<string, InputLanguageBenchmarkMetrics>>({});
  const sessionFeedbackContextRef = useRef<Record<string, { inputMode: InputMode; language: LanguageCode }>>({});
  const phrasePlaybackEventsRef = useRef<PhrasePlaybackEvent[]>([]);
  const phrasePlaybackTotalPhrasesRef = useRef(0);
  const [selectedBenchmarkInputMode, setSelectedBenchmarkInputMode] = useState<InputMode>('browser-tts');

  const getAdaptiveController = useCallback(
    (inputMode: InputMode, language: LanguageCode): AdaptiveDictationController =>
      getAdaptiveControllerForScope(adaptiveControllersByInputLanguageRef.current, inputMode, language),
    [],
  );

  const getHistoricalPerformanceProfile = useCallback(
    (inputMode: InputMode, language?: string) =>
      buildHistoricalPerformanceProfile(sessions, historyServiceRef.current, inputMode, language),
    [sessions],
  );

  const getBenchmarkSnapshot = useCallback(
    (inputMode: InputMode, language: LanguageCode): InputLanguageBenchmarkMetrics =>
      adaptiveBenchmarksRef.current[inputMode]?.[language] ?? createEmptyInputLanguageBenchmark(inputMode, language),
    [adaptiveBenchmarksRef],
  );

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
    [activeSessionId, adaptiveBenchmarksRef, setAdaptiveBenchmarks],
  );

  const beginAdaptiveSessionFeedback = useCallback(
    (inputMode: InputMode, language: LanguageCode, totalPhrases = 0): void => {
      if (!activeSession) return;
      const normalizedLanguage = normalizeBenchmarkLanguage(language);
      resetAdaptiveControllerForScope(adaptiveControllersByInputLanguageRef.current, inputMode, normalizedLanguage);
      sessionFeedbackContextRef.current[activeSession.id] = {
        inputMode,
        language: normalizedLanguage,
      };
      sessionBenchmarkBeforeRef.current[activeSession.id] = JSON.parse(
        JSON.stringify(getBenchmarkSnapshot(inputMode, normalizedLanguage)),
      );
      phrasePlaybackEventsRef.current = [];
      phrasePlaybackTotalPhrasesRef.current = totalPhrases;
    },
    [activeSession, getBenchmarkSnapshot],
  );

  const recordPhrasePlaybackEvent = useCallback(
    (
      event: PhrasePlaybackEvent['event'],
      inputMode: InputMode,
      language: LanguageCode,
      phrase: SemanticPhrase | null | undefined,
      phraseIndex: number,
    ): void => {
      if (!activeSession || phraseIndex < 0) return;
      phrasePlaybackEventsRef.current = [
        ...phrasePlaybackEventsRef.current,
        {
          sessionId: activeSession.id,
          phraseId: phrase?.id ?? `phrase-${phraseIndex}`,
          phraseIndex,
          textPreview: phrase?.text.slice(0, 120) ?? '',
          event,
          timestampMs: Date.now(),
          inputMode,
          language: normalizeBenchmarkLanguage(language),
        },
      ].slice(-500);
    },
    [activeSession],
  );

  const completeAdaptiveSessionFeedback = useCallback(
    (
      completedSession = activeSession,
      options: { phraseEvents?: PhrasePlaybackEvent[]; totalPhrases?: number } = {},
    ): void => {
      if (!completedSession) return;
      const context = sessionFeedbackContextRef.current[completedSession.id];
      const inputMode = context?.inputMode ?? mapRuntimeSessionInputMode(completedSession.inputMode);
      const language = normalizeBenchmarkLanguage(context?.language ?? resolveRuntimeSessionLanguage(completedSession));
      if (
        inputMode === 'browser-tts' &&
        language === 'de' &&
        hasAdaptiveSessionFeedbackForSession(
          adaptiveSessionFeedbackRef.current[inputMode]?.[language],
          inputMode,
          language,
          completedSession.id,
        )
      ) {
        delete sessionBenchmarkBeforeRef.current[completedSession.id];
        delete sessionFeedbackContextRef.current[completedSession.id];
        return;
      }
      const before = sessionBenchmarkBeforeRef.current[completedSession.id] ?? getBenchmarkSnapshot(inputMode, language);
      const after = getBenchmarkSnapshot(inputMode, language);
      const feedback = buildAdaptiveSessionFeedback({
        sessionId: completedSession.id,
        inputMode,
        language,
        sourceType: completedSession.sessionSource === 'dictationScript' ? 'dictation_script' : 'plain_text',
        createdAt: completedSession.createdAt,
        completedAt: completedSession.telemetry.finishedAt ?? completedSession.updatedAt ?? new Date().toISOString(),
        scriptId: completedSession.dictationScript
          ? `${completedSession.id}:${completedSession.dictationScript.title}`
          : undefined,
        scriptTitle: completedSession.dictationScript?.title,
        benchmarkBefore: before,
        benchmarkAfter: after,
        ttsEnvironment: inputMode === 'browser-tts' ? completedSession.ttsEnvironment ?? null : null,
        phraseEvents: options.phraseEvents ?? phrasePlaybackEventsRef.current,
        totalPhrases: options.totalPhrases ?? (phrasePlaybackTotalPhrasesRef.current || undefined),
      });
      const nextFeedbackState = upsertAdaptiveSessionFeedbackByInputLanguage(
        adaptiveSessionFeedbackRef.current,
        inputMode,
        language,
        feedback,
      );
      adaptiveSessionFeedbackRef.current = nextFeedbackState;
      setAdaptiveSessionFeedback(nextFeedbackState);
      persistAdaptiveSessionFeedbackNow(nextFeedbackState);
      delete sessionBenchmarkBeforeRef.current[completedSession.id];
      delete sessionFeedbackContextRef.current[completedSession.id];
    },
    [
      activeSession,
      adaptiveSessionFeedbackRef,
      getBenchmarkSnapshot,
      persistAdaptiveSessionFeedbackNow,
      setAdaptiveSessionFeedback,
    ],
  );

  const ensureLatestBrowserTtsDeDictationScriptFeedback = useCallback(
    (sourceSessions: AdaptiveRuntimeSessionInput[]): void => {
      const latestSession = findLatestFinishedBrowserTtsDeDictationScriptSession(sourceSessions);
      if (!latestSession) return;
      const inputMode: InputMode = 'browser-tts';
      const language: LanguageCode = 'de';
      if (
        hasAdaptiveSessionFeedbackForSession(
          adaptiveSessionFeedbackRef.current[inputMode]?.[language],
          inputMode,
          language,
          latestSession.id,
        )
      ) {
        return;
      }
      completeAdaptiveSessionFeedback(latestSession, {
        phraseEvents: activeSessionId === latestSession.id ? phrasePlaybackEventsRef.current : [],
        totalPhrases:
          activeSessionId === latestSession.id && phrasePlaybackTotalPhrasesRef.current > 0
            ? phrasePlaybackTotalPhrasesRef.current
            : latestSession.dictationScript?.phrases?.length,
      });
    },
    [activeSessionId, adaptiveSessionFeedback, adaptiveSessionFeedbackRef, completeAdaptiveSessionFeedback],
  );

  const resetAdaptiveSessionFeedbackTracking = useCallback((sessionId?: string | null): void => {
    phrasePlaybackEventsRef.current = [];
    phrasePlaybackTotalPhrasesRef.current = 0;
    if (sessionId) {
      delete sessionFeedbackContextRef.current[sessionId];
    }
  }, []);

  return {
    adaptiveControllerRef,
    getAdaptiveController,
    historyServiceRef,
    phrasePlaybackEventsRef,
    phrasePlaybackTotalPhrasesRef,
    selectedBenchmarkInputMode,
    setSelectedBenchmarkInputMode,
    selectedBenchmarkLanguage,
    setSelectedBenchmarkLanguage,
    getHistoricalPerformanceProfile,
    getBenchmarkSnapshot,
    recordAdaptiveBenchmark,
    beginAdaptiveSessionFeedback,
    recordPhrasePlaybackEvent,
    completeAdaptiveSessionFeedback,
    ensureLatestBrowserTtsDeDictationScriptFeedback,
    resetAdaptiveSessionFeedbackTracking,
  };
}
