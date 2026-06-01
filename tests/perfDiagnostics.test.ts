import { describe, expect, it, vi } from 'vitest';
import {
  PERF_DIAGNOSTICS_STORAGE_KEY,
  PerfDiagnostics,
  isPerfDiagnosticsEnabled,
  summarizeMetric,
} from '../src/core/perfDiagnostics';

function memoryStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

describe('perf diagnostics', () => {
  it('enables diagnostics in development or with persisted/query flags', () => {
    expect(isPerfDiagnosticsEnabled({ envDev: true, search: '', storage: memoryStorage() })).toBe(true);
    expect(isPerfDiagnosticsEnabled({ envDev: false, search: '', storage: memoryStorage() })).toBe(false);
    expect(isPerfDiagnosticsEnabled({ envDev: false, search: '?perf=1', storage: memoryStorage() })).toBe(true);
    expect(isPerfDiagnosticsEnabled({
      envDev: false,
      search: '',
      storage: memoryStorage({ [PERF_DIAGNOSTICS_STORAGE_KEY]: '1' }),
    })).toBe(true);
  });

  it('clears a persisted production diagnostics flag with perf=0', () => {
    const storage = memoryStorage({ [PERF_DIAGNOSTICS_STORAGE_KEY]: '1' });

    expect(isPerfDiagnosticsEnabled({ envDev: false, search: '?perf=0', storage })).toBe(false);
    expect(storage.getItem(PERF_DIAGNOSTICS_STORAGE_KEY)).toBeNull();
  });

  it('summarizes finite metrics with latest average max and p95', () => {
    expect(summarizeMetric([10, 20, undefined, 30, 100])).toEqual({
      count: 4,
      latest: 100,
      average: 40,
      max: 100,
      p95: 100,
    });
  });

  it('records input timing, long tasks, render counts, and slow spans only above threshold', () => {
    const diagnostics = new PerfDiagnostics();
    diagnostics.configure({ envDev: false, search: '?perf=1', storage: memoryStorage(), slowSpanThresholdMs: 10 });
    diagnostics.reset();

    const inputId = diagnostics.recordInputChange({
      component: 'LowLatencyTextarea',
      keydownAt: 100,
      inputAt: 120,
      localSetAt: 122,
      valueLength: 5,
      renderCount: 2,
    });
    diagnostics.recordInputPaint(inputId, 140);
    diagnostics.recordInputCommit(inputId, 170);
    diagnostics.recordLongTask({ name: 'self', startTime: 10, duration: 88 });
    diagnostics.recordRender('TrainingView', 4);
    diagnostics.recordTtsVoices([
      { lang: 'en-US', name: 'English', voiceURI: 'en', default: false, localService: true },
      { lang: 'fr-FR', name: 'French France', voiceURI: 'fr-fr', default: false, localService: true },
      { lang: 'fr-CA', name: 'French Canada', voiceURI: 'fr-ca', default: false, localService: true },
      { lang: 'pt-BR', name: 'Portuguese Brazil', voiceURI: 'pt-br', default: false, localService: true },
    ]);

    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(200)
      .mockReturnValueOnce(205)
      .mockReturnValueOnce(300)
      .mockReturnValueOnce(320);
    diagnostics.withSpan('fast-work', () => undefined);
    diagnostics.withSpan('slow-work', () => undefined, { phase: 'typing' });
    vi.restoreAllMocks();

    const snapshot = diagnostics.snapshot();
    expect(snapshot.input.keydownToInput.latest).toBe(20);
    expect(snapshot.input.inputToPaint.latest).toBe(20);
    expect(snapshot.input.inputToCommit.latest).toBe(50);
    expect(snapshot.longTasks.maxDurationMs).toBe(88);
    expect(snapshot.renders.TrainingView).toBe(4);
    expect(snapshot.slowSpans.count).toBe(1);
    expect(snapshot.slowSpans.latest?.name).toBe('slow-work');
    expect(snapshot.tts.voiceCounts).toMatchObject({ total: 4, en: 1, fr: 2, pt: 1 });
  });
});
