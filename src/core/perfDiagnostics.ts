export const PERF_DIAGNOSTICS_STORAGE_KEY = 'dicta.perfDiagnostics.v1';

const DEFAULT_SLOW_SPAN_THRESHOLD_MS = 50;
const MAX_RECENT_ITEMS = 80;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

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
    voiceCounts: Record<'total' | 'en' | 'es' | 'de' | 'fr', number>;
  };
  renders: Record<string, number>;
  heap: {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
};

export type PerfTtsVoice = {
  lang: string;
  name: string;
  voiceURI: string;
  default: boolean;
  localService: boolean;
};

export function isPerfDiagnosticsEnabled(config: PerfDiagnosticsConfig): boolean {
  const params = new URLSearchParams(config.search.startsWith('?') ? config.search.slice(1) : config.search);
  const queryValue = params.get('perf');
  if (queryValue === '0' || queryValue === 'false' || queryValue === 'off') {
    config.storage?.removeItem(PERF_DIAGNOSTICS_STORAGE_KEY);
    return config.envDev;
  }
  if (queryValue === '1' || queryValue === 'true' || queryValue === 'on') {
    config.storage?.setItem(PERF_DIAGNOSTICS_STORAGE_KEY, '1');
    return true;
  }
  return config.envDev || config.storage?.getItem(PERF_DIAGNOSTICS_STORAGE_KEY) === '1';
}

export function summarizeMetric(values: Array<number | undefined>): PerfMetricSummary {
  const finite = values.filter((value): value is number => Number.isFinite(value));
  if (finite.length === 0) {
    return { count: 0, latest: 0, average: 0, max: 0, p95: 0 };
  }
  const sorted = [...finite].sort((a, b) => a - b);
  const p95Index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * 0.95) - 1));
  return {
    count: finite.length,
    latest: roundMs(finite[finite.length - 1] ?? 0),
    average: roundMs(finite.reduce((sum, value) => sum + value, 0) / finite.length),
    max: roundMs(sorted[sorted.length - 1] ?? 0),
    p95: roundMs(sorted[p95Index] ?? 0),
  };
}

export class PerfDiagnostics {
  private enabled = false;
  private slowSpanThresholdMs = DEFAULT_SLOW_SPAN_THRESHOLD_MS;
  private nextInputId = 1;
  private nextTtsPlayId = 1;
  private nextTtsUtteranceId = 1;
  private inputEvents: PerfInputEvent[] = [];
  private inputEventsById = new Map<number, PerfInputEvent>();
  private longTasks: PerfLongTask[] = [];
  private slowSpans: PerfSlowSpan[] = [];
  private ttsPlays = new Map<number, { id: number; clickedAt: number; source: string }>();
  private ttsUtterances: PerfTtsUtterance[] = [];
  private ttsUtterancesById = new Map<number, PerfTtsUtterance>();
  private ttsVoices: PerfTtsVoice[] = [];
  private renderCounts: Record<string, number> = {};
  private observer: PerformanceObserver | null = null;

  configure(config: PerfDiagnosticsConfig): boolean {
    this.enabled = isPerfDiagnosticsEnabled(config);
    this.slowSpanThresholdMs = config.slowSpanThresholdMs ?? DEFAULT_SLOW_SPAN_THRESHOLD_MS;
    if (this.enabled) {
      this.installGlobal();
      this.startLongTaskObserver();
      this.log('enabled', { userAgent: getUserAgent(), standalone: getStandaloneMode() });
    }
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  reset(): void {
    this.nextInputId = 1;
    this.nextTtsPlayId = 1;
    this.nextTtsUtteranceId = 1;
    this.inputEvents = [];
    this.inputEventsById.clear();
    this.longTasks = [];
    this.slowSpans = [];
    this.ttsPlays.clear();
    this.ttsUtterances = [];
    this.ttsUtterancesById.clear();
    this.ttsVoices = [];
    this.renderCounts = {};
  }

  dispose(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  recordRender(component: string, count: number): void {
    if (!this.enabled) return;
    this.renderCounts[component] = count;
  }

  recordInputChange(args: {
    component: string;
    keydownAt?: number;
    inputAt: number;
    localSetAt: number;
    valueLength: number;
    renderCount: number;
  }): number {
    if (!this.enabled) return 0;
    const id = this.nextInputId;
    this.nextInputId += 1;
    const event: PerfInputEvent = {
      id,
      component: args.component,
      keydownAt: args.keydownAt,
      inputAt: args.inputAt,
      localSetAt: args.localSetAt,
      valueLength: args.valueLength,
      renderCount: args.renderCount,
      keydownToInputMs: args.keydownAt === undefined ? undefined : args.inputAt - args.keydownAt,
      inputToLocalSetMs: args.localSetAt - args.inputAt,
    };
    this.inputEventsById.set(id, event);
    this.inputEvents.push(event);
    trimArray(this.inputEvents, MAX_RECENT_ITEMS);
    return id;
  }

  recordInputPaint(id: number, paintAt: number): void {
    if (!this.enabled || id <= 0) return;
    const event = this.inputEventsById.get(id);
    if (!event) return;
    event.paintAt = paintAt;
    event.inputToPaintMs = paintAt - event.inputAt;
  }

  recordInputCommit(id: number, commitAt: number): void {
    if (!this.enabled || id <= 0) return;
    const event = this.inputEventsById.get(id);
    if (!event) return;
    event.commitAt = commitAt;
    event.inputToCommitMs = commitAt - event.inputAt;
  }

  beginTtsPlay(source: string): number {
    if (!this.enabled) return 0;
    const id = this.nextTtsPlayId;
    this.nextTtsPlayId += 1;
    this.ttsPlays.set(id, { id, clickedAt: now(), source });
    return id;
  }

  beginTtsUtterance(args: {
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
  }): number {
    if (!this.enabled) return 0;
    const play = this.ttsPlays.get(args.playId);
    const id = this.nextTtsUtteranceId;
    this.nextTtsUtteranceId += 1;
    const utterance: PerfTtsUtterance = {
      id,
      playId: args.playId,
      chunkIndex: args.chunkIndex,
      phraseLengthWords: args.phraseLengthWords,
      phraseLengthChars: args.phraseLengthChars,
      language: args.language,
      pacingMode: args.pacingMode,
      voiceName: args.voiceName,
      voiceURI: args.voiceURI,
      voiceLang: args.voiceLang,
      voiceResolved: args.voiceResolved,
      availableVoiceCount: args.availableVoiceCount,
      matchingVoiceCount: args.matchingVoiceCount,
      playClickedAt: play?.clickedAt ?? now(),
    };
    this.ttsUtterancesById.set(id, utterance);
    this.ttsUtterances.push(utterance);
    trimArray(this.ttsUtterances, MAX_RECENT_ITEMS);
    return id;
  }

  recordTtsVoices(voices: PerfTtsVoice[]): void {
    this.ttsVoices = voices;
    if (!this.enabled) return;
    this.log('tts-voices', {
      count: voices.length,
      voices: voices.map((voice) => `${voice.lang} ${voice.name} (${voice.voiceURI})`),
    });
  }

  recordTtsSpeak(utteranceId: number): void {
    const utterance = this.ttsUtterancesById.get(utteranceId);
    if (!this.enabled || !utterance) return;
    utterance.speakCalledAt = now();
    utterance.playToSpeakMs = utterance.speakCalledAt - utterance.playClickedAt;
  }

  recordTtsStart(utteranceId: number): void {
    const utterance = this.ttsUtterancesById.get(utteranceId);
    if (!this.enabled || !utterance) return;
    utterance.onstartAt = now();
    utterance.playToStartMs = utterance.onstartAt - utterance.playClickedAt;
  }

  recordTtsEnd(utteranceId: number): void {
    const utterance = this.ttsUtterancesById.get(utteranceId);
    if (!this.enabled || !utterance) return;
    utterance.onendAt = now();
    if (utterance.onstartAt !== undefined) {
      utterance.startToEndMs = utterance.onendAt - utterance.onstartAt;
    }
  }

  recordTtsError(utteranceId: number, error: string): void {
    const utterance = this.ttsUtterancesById.get(utteranceId);
    if (!this.enabled || !utterance) return;
    utterance.errorAt = now();
    utterance.error = error;
    this.log('tts-error', utterance);
  }

  recordLongTask(task: PerfLongTask): void {
    if (!this.enabled) return;
    this.longTasks.push({
      name: task.name,
      startTime: roundMs(task.startTime),
      duration: roundMs(task.duration),
    });
    trimArray(this.longTasks, MAX_RECENT_ITEMS);
  }

  recordSpan(name: string, startedAt: number, context?: Record<string, unknown>): void {
    if (!this.enabled) return;
    const duration = now() - startedAt;
    if (duration < this.slowSpanThresholdMs) return;
    const span = {
      name,
      startedAt: roundMs(startedAt),
      duration: roundMs(duration),
      context,
    };
    this.slowSpans.push(span);
    trimArray(this.slowSpans, MAX_RECENT_ITEMS);
    this.log('slow-span', span);
  }

  withSpan<T>(name: string, fn: () => T, context?: Record<string, unknown>): T {
    if (!this.enabled) return fn();
    const startedAt = now();
    try {
      return fn();
    } finally {
      this.recordSpan(name, startedAt, context);
    }
  }

  startSpan(name: string, context?: Record<string, unknown>): () => void {
    if (!this.enabled) return () => undefined;
    const startedAt = now();
    return () => this.recordSpan(name, startedAt, context);
  }

  snapshot(): PerfDiagnosticsSnapshot {
    const latestInput = this.inputEvents[this.inputEvents.length - 1];
    const latestLongTask = this.longTasks[this.longTasks.length - 1];
    const latestSlowSpan = this.slowSpans[this.slowSpans.length - 1];
    const latestTts = this.ttsUtterances[this.ttsUtterances.length - 1];
    return {
      enabled: this.enabled,
      generatedAt: new Date().toISOString(),
      input: {
        keydownToInput: summarizeMetric(this.inputEvents.map((event) => event.keydownToInputMs)),
        inputToPaint: summarizeMetric(this.inputEvents.map((event) => event.inputToPaintMs)),
        inputToCommit: summarizeMetric(this.inputEvents.map((event) => event.inputToCommitMs)),
        latest: latestInput,
      },
      longTasks: {
        count: this.longTasks.length,
        maxDurationMs: roundMs(Math.max(0, ...this.longTasks.map((task) => task.duration))),
        latest: latestLongTask,
      },
      slowSpans: {
        count: this.slowSpans.length,
        latest: latestSlowSpan,
      },
      tts: {
        latest: latestTts,
        voices: [...this.ttsVoices],
        voiceCounts: summarizeVoiceCounts(this.ttsVoices),
      },
      renders: { ...this.renderCounts },
      heap: getHeapSnapshot(),
    };
  }

  log(event: string, payload: unknown): void {
    if (!this.enabled) return;
    console.info('[DictaPerf]', event, payload);
  }

  private startLongTaskObserver(): void {
    if (this.observer || typeof PerformanceObserver === 'undefined') return;
    const supported = PerformanceObserver.supportedEntryTypes?.includes('longtask');
    if (!supported) return;
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordLongTask({
          name: entry.name || 'longtask',
          startTime: entry.startTime,
          duration: entry.duration,
        });
      }
    });
    try {
      this.observer.observe({ entryTypes: ['longtask'] });
    } catch {
      this.observer = null;
    }
  }

  private installGlobal(): void {
    if (typeof window === 'undefined') return;
    window.__DICTA_PERF__ = {
      snapshot: () => this.snapshot(),
      reset: () => this.reset(),
      enabled: () => this.enabled,
    };
  }
}

export const perfDiagnostics = new PerfDiagnostics();

declare global {
  interface Window {
    __DICTA_PERF__?: {
      snapshot: () => PerfDiagnosticsSnapshot;
      reset: () => void;
      enabled: () => boolean;
    };
  }
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function roundMs(value: number): number {
  return Number((Number.isFinite(value) ? value : 0).toFixed(1));
}

function trimArray<T>(items: T[], max: number): void {
  if (items.length > max) {
    items.splice(0, items.length - max);
  }
}

function getHeapSnapshot(): PerfDiagnosticsSnapshot['heap'] {
  if (typeof performance === 'undefined') return {};
  const memory = (performance as Performance & {
    memory?: {
      usedJSHeapSize?: number;
      totalJSHeapSize?: number;
      jsHeapSizeLimit?: number;
    };
  }).memory;
  return {
    usedJSHeapSize: memory?.usedJSHeapSize,
    totalJSHeapSize: memory?.totalJSHeapSize,
    jsHeapSizeLimit: memory?.jsHeapSizeLimit,
  };
}

function getUserAgent(): string {
  return typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent;
}

function getStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function summarizeVoiceCounts(voices: PerfTtsVoice[]): Record<'total' | 'en' | 'es' | 'de' | 'fr', number> {
  const countPrefix = (prefix: string): number =>
    voices.filter((voice) => voice.lang.toLowerCase().startsWith(prefix)).length;
  return {
    total: voices.length,
    en: countPrefix('en'),
    es: countPrefix('es'),
    de: countPrefix('de'),
    fr: countPrefix('fr'),
  };
}
