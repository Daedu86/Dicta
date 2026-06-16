import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ControlAction, SessionTelemetry, TtsPacingMode } from '../types/dictation';
import type { Difficulty } from '../core/config';
import type {
  PerformanceTrend,
  SessionStatus,
  StoredSession,
  TtsLanguage,
  TtsPublishedUiState,
  TtsStatus,
} from './sessionTypes';

export type TtsAccuracySnapshot = {
  typedWords: number;
  matchedWords: number;
};

export type UseActiveSessionStateSyncParams = {
  sessions: StoredSession[];
  setSessions: Dispatch<SetStateAction<StoredSession[]>>;
  activeSession: StoredSession | null;
  activeSessionId: string;
  activeVisibleAccuracy: number;
  activeVisibleScore: number;
  activePoints: number;
  difficulty: Difficulty;
  inputSettingsLocked: boolean;
  ttsText: string;
  ttsLanguage: TtsLanguage;
  ttsPracticeText: string;
  sessionStatus: SessionStatus;
  controllerState: ControlAction;
  running: boolean;
  rate: number;
  lagSec: number;
  lagWords: number;
  wpm: number;
  accuracy: number;
  trend: PerformanceTrend;
  hydratingSessionIdRef: MutableRefObject<string | null>;
  allowFinishedSessionResetRef: MutableRefObject<string | null>;
  ttsPracticeLiveTextRef: MutableRefObject<string>;
  ttsUiLastPublishedAtRef: MutableRefObject<number>;
  ttsPublishedUiRef: MutableRefObject<TtsPublishedUiState>;
  telemetryRef: MutableRefObject<SessionTelemetry | null>;
  previousLagRef: MutableRefObject<number>;
  previousAccuracyRef: MutableRefObject<number>;
  ttsStartedAtMsRef: MutableRefObject<number | null>;
  ttsChunkStartMsRef: MutableRefObject<number | null>;
  ttsChunkStartWordIndexRef: MutableRefObject<number>;
  ttsChunkWordCountRef: MutableRefObject<number>;
  ttsCompletedSourceWordsRef: MutableRefObject<number>;
  ttsLagOutlierCountRef: MutableRefObject<number>;
  ttsUnsafeChunkCountRef: MutableRefObject<number>;
  ttsChunkAccuracyWindowRef: MutableRefObject<number[]>;
  ttsLastAccuracySnapshotRef: MutableRefObject<TtsAccuracySnapshot>;
  ttsLastControllerActionRef: MutableRefObject<ControlAction>;
  setDifficulty: Dispatch<SetStateAction<Difficulty>>;
  setInputSettingsLocked: Dispatch<SetStateAction<boolean>>;
  setTtsLanguage: Dispatch<SetStateAction<TtsLanguage>>;
  setTtsPracticeText: Dispatch<SetStateAction<string>>;
  setSessionStatus: Dispatch<SetStateAction<SessionStatus>>;
  setTtsText: Dispatch<SetStateAction<string>>;
  setTtsStatus: Dispatch<SetStateAction<TtsStatus>>;
  setTtsCurrentChunk: Dispatch<SetStateAction<string>>;
  setTtsPacingMode: Dispatch<SetStateAction<TtsPacingMode>>;
  setTtsSpeechRate: Dispatch<SetStateAction<number>>;
  setRunning: Dispatch<SetStateAction<boolean>>;
  setRate: Dispatch<SetStateAction<number>>;
  setLagSec: Dispatch<SetStateAction<number>>;
  setLagWords: Dispatch<SetStateAction<number>>;
  setWpm: Dispatch<SetStateAction<number>>;
  setAccuracy: Dispatch<SetStateAction<number>>;
  setTrend: Dispatch<SetStateAction<PerformanceTrend>>;
  setControllerState: Dispatch<SetStateAction<ControlAction>>;
  setExportMessage: Dispatch<SetStateAction<string>>;
  setError: Dispatch<SetStateAction<string>>;
  setTrainingSubmitMessage: Dispatch<SetStateAction<string>>;
  resetAdaptiveSessionFeedbackTracking: (sessionId: string | undefined) => void;
};
