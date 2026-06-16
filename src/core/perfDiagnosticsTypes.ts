export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type PerfDiagnosticsConfig = {
  envDev: boolean;
  search: string;
  storage?: StorageLike | null;
  slowSpanThresholdMs?: number;
};

export type PerfMetricSummary = {
  count: number;
  latest: number;
  average: number;
  max: number;
  p95: number;
};

export type PerfInputEvent = {
  id: number;
  component: string;
  keydownAt?: number;
  inputAt: number;
  localSetAt: number;
  paintAt?: number;
  commitAt?: number;
  valueLength: number;
  renderCount: number;
  keydownToInputMs?: number;
  inputToLocalSetMs: number;
  inputToPaintMs?: number;
  inputToCommitMs?: number;
};

export type PerfLongTask = {
  name: string;
  startTime: number;
  duration: number;
};

export type PerfSlowSpan = {
  name: string;
  startedAt: number;
  duration: number;
  context?: Record<string, unknown>;
};

export type PerfTtsUtterance = {
  id: number;
  playId: number;
  chunkIndex: number;
  phraseLengthWords: number;
  phraseLengthChars: number;
  language: string;
  pacingMode: string;
  voiceName?: string;
  voiceURI?: string | null;
  voiceLang?: string;
  voiceResolved?: boolean;
  availableVoiceCount?: number;
  matchingVoiceCount?: number;
  playClickedAt: number;
  speakCalledAt?: number;
  onstartAt?: number;
  onendAt?: number;
  errorAt?: number;
  error?: string;
  playToSpeakMs?: number;
  playToStartMs?: number;
  startToEndMs?: number;
};

export type PerfTtsVoice = {
  lang: string;
  name: string;
  voiceURI: string;
  default: boolean;
  localService: boolean;
};

export type PerfDiagnosticsSnapshot = {
  enabled: boolean;
  generatedAt: string;
  input: {
    keydownToInput: PerfMetricSummary;
    inputToPaint: PerfMetricSummary;
    inputToCommit: PerfMetricSummary;
    latest?: PerfInputEvent;
  };
  longTasks: {
    count: number;
    maxDurationMs: number;
    latest?: PerfLongTask;
  };
  slowSpans: {
    count: number;
    latest?: PerfSlowSpan;
  };
  tts: {
    latest?: PerfTtsUtterance;
    voices: PerfTtsVoice[];
    voiceCounts: Record<'total' | 'en' | 'es' | 'de' | 'fr' | 'pt', number>;
  };
  renders: Record<string, number>;
  heap: {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
};

declare global {
  interface Window {
    __DICTA_PERF__?: {
      snapshot: () => PerfDiagnosticsSnapshot;
      reset: () => void;
      enabled: () => boolean;
    };
  }
}
