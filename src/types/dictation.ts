export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface Transcript {
  words: WordTiming[];
}

export type ControlAction =
  | 'hold'
  | 'speed_up'
  | 'speed_down'
  | 'pause_repeat'
  | 'play'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'seek'
  | 'submit'
  | 'replay_phrase'
  | 'rewind_phrase'
  | 'manual_slow'
  | 'manual_fast'
  | 'reset_pace'
  | 'phrase_start'
  | 'phrase_end';

export type TtsPacingMode = 'slow' | 'balanced' | 'flow';
export type TtsEngine = 'browser';

export interface BrowserTtsEnvironmentFingerprint {
  engine: 'browser';
  browserUserAgentHash: string;
  platform: string;
  standalonePwa: boolean;
  voiceURI: string | null;
  voiceName: string | null;
  voiceLang: string | null;
  localService: boolean | null;
  availableVoiceCount: number;
  matchingVoiceCount: number;
}

export interface BrowserTtsEnvironmentHistoryEntry {
  environmentId: string;
  ttsEnvironment: BrowserTtsEnvironmentFingerprint;
  firstSeenAt: string;
  lastSeenAt: string;
  sampleCount: number;
  sessionCount: number;
}

export interface TtsChunkTelemetry {
  t: number;
  startWordIndex: number;
  wordCount: number;
  rate: number;
  pacingMode: TtsPacingMode;
  engine?: TtsEngine;
  cacheKey?: string;
  durationSec?: number;
}

export type BrowserTtsPracticeChunkResolution = 'submitted' | 'skipped' | 'timeout';

export interface BrowserTtsPracticeChunkTelemetry {
  id: string;
  index: number;
  startWordIndex: number;
  wordCount: number;
  typedWordStartIndex: number;
  typedWordCount: number;
  typedText: string;
  resolution: BrowserTtsPracticeChunkResolution;
}

export interface ControllerConfig {
  minRate: number;
  maxRate: number;
  tickMs: number;
  hysteresisMs: number;
  lagSoftSec: number;
  lagHardSec: number;
  aheadSoftSec: number;
  repeatWords: number;
  maxRepeatPerMinute: number;
  repeatCooldownSec: number;
}

export interface SessionTelemetry {
  startedAt: string;
  finishedAt?: string;
  lagSeries: number[];
  wpmSeries: number[];
  accuracySeries: number[];
  actions: Array<{ t: number; action: ControlAction; rate: number }>;
  ttsChunks: TtsChunkTelemetry[];
  practiceChunks?: BrowserTtsPracticeChunkTelemetry[];
  repeatCount: number;
  rateDistribution: Array<{ rate: number; seconds: number }>;
}
