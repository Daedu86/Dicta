import type {
  PerfDiagnosticsConfig,
  PerfDiagnosticsSnapshot,
  PerfInputEvent,
  PerfLongTask,
  PerfSlowSpan,
  PerfTtsUtterance,
  PerfTtsVoice,
} from './perfDiagnosticsTypes';
import {
  DEFAULT_SLOW_SPAN_THRESHOLD_MS,
  MAX_RECENT_ITEMS,
  getHeapSnapshot,
  getStandaloneMode,
  getUserAgent,
  isPerfDiagnosticsEnabled,
  now,
  roundMs,
  summarizeMetric,
  summarizeVoiceCounts,
  trimArray,
} from './perfDiagnosticsUtils';

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
