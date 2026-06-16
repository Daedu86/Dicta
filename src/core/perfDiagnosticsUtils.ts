import type { PerfDiagnosticsConfig, PerfDiagnosticsSnapshot, PerfMetricSummary, PerfTtsVoice } from './perfDiagnosticsTypes';

export const PERF_DIAGNOSTICS_STORAGE_KEY = 'dicta.perfDiagnostics.v1';
export const DEFAULT_SLOW_SPAN_THRESHOLD_MS = 50;
export const MAX_RECENT_ITEMS = 80;

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

export function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function roundMs(value: number): number {
  return Number((Number.isFinite(value) ? value : 0).toFixed(1));
}

export function trimArray<T>(items: T[], max: number): void {
  if (items.length > max) {
    items.splice(0, items.length - max);
  }
}

export function getHeapSnapshot(): PerfDiagnosticsSnapshot['heap'] {
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

export function getUserAgent(): string {
  return typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent;
}

export function getStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function summarizeVoiceCounts(voices: PerfTtsVoice[]): Record<'total' | 'en' | 'es' | 'de' | 'fr' | 'pt', number> {
  const countPrefix = (prefix: string): number =>
    voices.filter((voice) => voice.lang.toLowerCase().startsWith(prefix)).length;
  return {
    total: voices.length,
    en: countPrefix('en'),
    es: countPrefix('es'),
    de: countPrefix('de'),
    fr: countPrefix('fr'),
    pt: countPrefix('pt'),
  };
}
