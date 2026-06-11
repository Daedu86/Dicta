import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type { BrowserTtsEnvironmentFingerprint, SessionTelemetry } from '../types/dictation';
import { AdaptiveDictationController } from '../core/adaptive/AdaptiveDictationController';
import {
  createEmptyInputLanguageBenchmark,
  normalizeBenchmarkLanguage,
  updateInputLanguageBenchmark,
} from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import {
  buildAdaptiveSessionFeedback,
  hasAdaptiveSessionFeedbackForSession,
  upsertAdaptiveSessionFeedbackByInputLanguage,
} from '../core/adaptive/sessionFeedback';
import type {
  AdaptiveTimelinePoint,
  HistoricalPerformanceProfile,
  InputLanguageBenchmarkMetrics,
  InputMode,
  LanguageCode,
  LiveTelemetryFrame,
  PacingDecision,
  PhraseBoundaryType,
  PhrasePlaybackEvent,
} from '../core/adaptive/types';
import { HistoricalPerformanceService } from '../core/history/HistoricalPerformanceService';
import { estimateSessionVoiceDurationSec } from '../core/sessionDuration';
import { perfDiagnostics } from '../core/perfDiagnostics';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
  BenchmarkLanguageButton,
} from '../components/openrouter/types';
import type { SemanticPhrase } from '../core/adaptive/SemanticPhrasePlanner';

export type AdaptiveRuntimeSessionInputMode = string;
export type AdaptiveRuntimeSessionStatus = 'ready' | 'running' | 'paused' | 'finished' | 'error' | string;
export type AdaptiveRuntimeSessionSource = 'plainText' | 'dictationScript' | string;

export type AdaptiveRuntimeSessionInput = {
  id: string;
  createdAt: string;
  updatedAt: string;
  inputMode: AdaptiveRuntimeSessionInputMode;
  status: AdaptiveRuntimeSessionStatus;
  ttsText?: string;
  ttsLanguage?: LanguageCode | null;
  metrics: {
    rate: number;
    wpm: number;
    accuracy: number;
    lagSec: number;
    trend: 'improving' | 'stable' | 'declining';
    score: number;
    points: number;
  };
  telemetry: Partial<SessionTelemetry> & { finishedAt?: string };
  sessionSource: AdaptiveRuntimeSessionSource;
  dictationScript?: { title: string; phrases?: unknown[] } | null;
  ttsEnvironment?: BrowserTtsEnvironmentFingerprint | null;
  voiceDurationSec?: number | null;
};

export type AdaptiveRuntimeRecordBenchmarkOptions = {
  actualPlaybackRate?: number;
  actualPauseMs?: number;
  replayExecuted?: boolean;
  actualBoundaryType?: PhraseBoundaryType;
  ttsEnvironment?: BrowserTtsEnvironmentFingerprint | null;
  event?: AdaptiveTimelinePoint['event'];
  phraseIndex?: number;
  totalSemanticPhrases?: number;
  throttleMs?: number;
};

type AdaptiveRuntimeOptions = {
  activeSession: AdaptiveRuntimeSessionInput | null;
  activeSessionId: string;
  sessions: AdaptiveRuntimeSessionInput[];
  setAdaptiveBenchmarks: Dispatch<SetStateAction<AdaptiveBenchmarksByInputLanguage>>;
  adaptiveBenchmarksRef: MutableRefObject<AdaptiveBenchmarksByInputLanguage>;
  adaptiveSessionFeedback: AdaptiveSessionFeedbackByInputLanguage;
  setAdaptiveSessionFeedback: Dispatch<SetStateAction<AdaptiveSessionFeedbackByInputLanguage>>;
  adaptiveSessionFeedbackRef: MutableRefObject<AdaptiveSessionFeedbackByInputLanguage>;
  persistAdaptiveSessionFeedbackNow: (feedback: AdaptiveSessionFeedbackByInputLanguage) => void;
  selectedBenchmarkLanguage: BenchmarkLanguageButton;
  setSelectedBenchmarkLanguage: (language: BenchmarkLanguageButton) => void;
};

export type AdaptiveRuntime = {
  adaptiveControllerRef: MutableRefObject<AdaptiveDictationController>;
  historyServiceRef: MutableRefObject<HistoricalPerformanceService>;
  phrasePlaybackEventsRef: MutableRefObject<PhrasePlaybackEvent[]>;
  phrasePlaybackTotalPhrasesRef: MutableRefObject<number>;
  selectedBenchmarkInputMode: InputMode;
  setSelectedBenchmarkInputMode: Dispatch<SetStateAction<InputMode>>;
  selectedBenchmarkLanguage: BenchmarkLanguageButton;
  setSelectedBenchmarkLanguage: (language: BenchmarkLanguageButton) => void;
  getHistoricalPerformanceProfile: (inputMode: InputMode, language?: string) => HistoricalPerformanceProfile;
  getBenchmarkSnapshot: (inputMode: InputMode, language: LanguageCode) => InputLanguageBenchmarkMetrics;
  recordAdaptiveBenchmark: (
    live: LiveTelemetryFrame,
    decision: PacingDecision,
    options?: AdaptiveRuntimeRecordBenchmarkOptions,
  ) => void;
  beginAdaptiveSessionFeedback: (inputMode: InputMode, language: LanguageCode, totalPhrases?: number) => void;
  recordPhrasePlaybackEvent: (
    event: PhrasePlaybackEvent['event'],
    inputMode: InputMode,
    language: LanguageCode,
    phrase: SemanticPhrase | null | undefined,
    phraseIndex: number,
  ) => void;
  completeAdaptiveSessionFeedback: (
    completedSession?: AdaptiveRuntimeSessionInput | null,
    options?: { phraseEvents?: PhrasePlaybackEvent[]; totalPhrases?: number },
  ) => void;
  ensureLatestBrowserTtsDeDictationScriptFeedback: (sourceSessions: AdaptiveRuntimeSessionInput[]) => void;
  resetAdaptiveSessionFeedbackTracking: (sessionId?: string | null) => void;
};

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
  const historyServiceRef = useRef(new HistoricalPerformanceService());
  const adaptiveBenchmarkLastUpdateRef = useRef<Record<string, number>>({});
  const sessionBenchmarkBeforeRef = useRef<Record<string, InputLanguageBenchmarkMetrics>>({});
  const sessionFeedbackContextRef = useRef<Record<string, { inputMode: InputMode; language: LanguageCode }>>({});
  const phrasePlaybackEventsRef = useRef<PhrasePlaybackEvent[]>([]);
  const phrasePlaybackTotalPhrasesRef = useRef(0);
  const [selectedBenchmarkInputMode, setSelectedBenchmarkInputMode] = useState<InputMode>('browser-tts');

  const getHistoricalPerformanceProfile = useCallback(
    (inputMode: InputMode, language?: string): HistoricalPerformanceProfile =>
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
          const inputBenchmarks = current[live.inputMode] ?? {};
          const existing = inputBenchmarks[language] ?? createEmptyInputLanguageBenchmark(live.inputMode, language);
          const updated = updateInputLanguageBenchmark({
            current: existing,
            live,
            decision,
            sessionId: activeSessionId,
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
          const nextBenchmarks = {
            ...current,
            [live.inputMode]: {
              ...inputBenchmarks,
              [language]: updated,
            },
          };
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

function buildHistoricalPerformanceProfile(
  sessions: AdaptiveRuntimeSessionInput[],
  historyService: HistoricalPerformanceService,
  inputMode: InputMode,
  language?: string,
): HistoricalPerformanceProfile {
  const records = sessions
    .filter((session) => session.status === 'finished' && session.metrics.points > 0)
    .map((session) => {
      const mode = mapRuntimeSessionInputMode(session.inputMode);
      return {
        inputMode: mode,
        language:
          (mode === 'browser-tts'
            ? session.ttsLanguage
            : session.ttsLanguage) ?? undefined,
        durationSec: Math.max(1, estimateSessionVoiceDurationSec(session) ?? session.metrics.points * 2),
        averagePlaybackRate: clamp(session.metrics.rate, 0.75, 1.15),
        averageWpm: session.metrics.wpm,
        averageAccuracy: clamp01(session.metrics.accuracy / 100),
        averageLagSec: Math.abs(session.metrics.lagSec),
        averagePauseMs: 700,
        replayCount: 0,
        phraseCount: 1,
        supportCount: session.metrics.trend === 'declining' ? 1 : 0,
        balancedCount: session.metrics.trend === 'stable' ? 1 : 0,
        flowCount: session.metrics.trend === 'improving' ? 1 : 0,
        backspaceRate: 0.03,
        correctionRate: 0.05,
        strugglesWithLongPhrases: session.metrics.wpm < 40,
        strugglesWithNumbers: false,
        strugglesWithNames: false,
        strugglesWithPunctuation: false,
        score: session.metrics.score,
        points: session.metrics.points,
        improvementTrend: session.metrics.trend,
        timestamp: session.updatedAt,
        sessionsCount: 1,
        profileConfidence: 0.5,
      };
    });

  if (records.length === 0) {
    return {
      language,
      inputMode,
      comfortablePlaybackRate: 1,
      averageWpm: 55,
      averageAccuracy: 0.92,
      averageLagSec: 1.2,
      averagePauseMs: 700,
      preferredPhraseSize: 'medium',
      preferredPauseAfterPhraseMs: 700,
      typicalBackspaceRate: 0.05,
      typicalCorrectionRate: 0.05,
      strugglesWithLongPhrases: false,
      strugglesWithNumbers: false,
      strugglesWithNames: false,
      strugglesWithPunctuation: false,
      improvementTrend: 'stable',
      sessionsCount: 0,
      profileConfidence: 0.2,
    };
  }

  return historyService.computeProfile(records, language, inputMode);
}

function findLatestFinishedBrowserTtsDeDictationScriptSession(
  sourceSessions: AdaptiveRuntimeSessionInput[],
): AdaptiveRuntimeSessionInput | null {
  return (
    sourceSessions
      .filter(isFinishedBrowserTtsDeDictationScriptSession)
      .sort((a, b) => getRuntimeSessionFinishedAtMs(b) - getRuntimeSessionFinishedAtMs(a))[0] ?? null
  );
}

function isFinishedBrowserTtsDeDictationScriptSession(session: AdaptiveRuntimeSessionInput): boolean {
  return (
    session.status === 'finished' &&
    session.sessionSource === 'dictationScript' &&
    mapRuntimeSessionInputMode(session.inputMode) === 'browser-tts' &&
    normalizeBenchmarkLanguage(resolveRuntimeSessionLanguage(session)) === 'de'
  );
}

function getRuntimeSessionFinishedAtMs(session: AdaptiveRuntimeSessionInput): number {
  const finishedAtMs = new Date(session.telemetry.finishedAt ?? session.updatedAt ?? session.createdAt).getTime();
  return Number.isFinite(finishedAtMs) ? finishedAtMs : 0;
}

function mapRuntimeSessionInputMode(mode: AdaptiveRuntimeSessionInputMode): InputMode {
  if (mode === 'browser-tts') return 'browser-tts';
  return 'browser-tts';
}

function resolveRuntimeSessionLanguage(session: AdaptiveRuntimeSessionInput): LanguageCode {
  return session.ttsLanguage ?? 'unknown';
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
