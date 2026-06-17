import type { InpEntry, InpRating } from './types';

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function roundMetric(value: number) {
  return Math.round(Math.max(0, value));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getInpRating(value: number): InpRating {
  if (value <= 200) {
    return 'good';
  }

  if (value <= 500) {
    return 'needs-improvement';
  }

  return 'poor';
}

export function getInteractionBreakdown(entry: Pick<InpEntry, 'duration' | 'processingEnd' | 'processingStart' | 'startTime'>) {
  const duration = roundMetric(isFiniteNumber(entry.duration) ? entry.duration : 0);
  const startTime = isFiniteNumber(entry.startTime) ? entry.startTime : 0;
  const processingStart = isFiniteNumber(entry.processingStart) ? entry.processingStart : startTime;
  const processingEnd = isFiniteNumber(entry.processingEnd) ? entry.processingEnd : processingStart;
  const inputDelay = clamp(processingStart - startTime, 0, duration);
  const processingDuration = clamp(processingEnd - processingStart, 0, duration - inputDelay);

  return {
    inputDelay: roundMetric(inputDelay),
    processingDuration: roundMetric(processingDuration),
    presentationDelay: roundMetric(duration - inputDelay - processingDuration),
  };
}
