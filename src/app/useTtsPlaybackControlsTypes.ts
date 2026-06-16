import type { ControlAction, TtsPacingMode } from '../types/dictation';
import type { SessionStatus, TtsStatus } from './sessionTypes';

export type WritableRef<T> = {
  current: T;
};

export type StateSetter<T> = (value: T | ((current: T) => T)) => void;

export type TtsPlaybackControls = {
  pauseTts: () => void;
  resumeTts: () => void;
  stopTtsPlayback: (action?: ControlAction) => void;
  seekTtsPlayback: (percent: number) => void;
};

export type TtsPlaybackControlsOptions = {
  activeInputMode: string;
  activeSessionFinished: boolean;
  ttsHasText: boolean;
  ttsStatus: TtsStatus;
  ttsText: string;
  ttsPracticeText: string;
  ttsTranscriptWordCount: number;
  isBrowserTtsSupported: () => boolean;
  cancelBrowserTts: () => void;
  resumeBrowserTts: () => void;
  estimateTtsSpokenWordIndex: () => number;
  playTtsFromWord: (startWordIndex: number) => void;
  recordTtsTelemetryAction: (action: ControlAction) => void;
  ttsStartedAtMsRef: WritableRef<number | null>;
  ttsUtteranceRef: WritableRef<SpeechSynthesisUtterance | null>;
  ttsChunkStartMsRef: WritableRef<number | null>;
  ttsCompletedSourceWordsRef: WritableRef<number>;
  ttsPausedAtWordIndexRef: WritableRef<number | null>;
  setTtsCurrentChunk: StateSetter<string>;
  setTtsPacingMode: StateSetter<TtsPacingMode>;
  setTtsSpeechRate: StateSetter<number>;
  setRunning: StateSetter<boolean>;
  setSessionStatus: StateSetter<SessionStatus>;
  setTtsStatus: StateSetter<TtsStatus>;
  setTtsPlayerProgressTick: StateSetter<number>;
  nowMs?: () => number;
};
