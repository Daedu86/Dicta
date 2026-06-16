import type { PerfLongTask } from './perfDiagnosticsTypes';

export function createPerfLongTaskObserver(onLongTask: (task: PerfLongTask) => void): PerformanceObserver | null {
  if (typeof PerformanceObserver === 'undefined') return null;
  const supported = PerformanceObserver.supportedEntryTypes?.includes('longtask');
  if (!supported) return null;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      onLongTask({
        name: entry.name || 'longtask',
        startTime: entry.startTime,
        duration: entry.duration,
      });
    }
  });

  try {
    observer.observe({ entryTypes: ['longtask'] });
    return observer;
  } catch {
    return null;
  }
}
