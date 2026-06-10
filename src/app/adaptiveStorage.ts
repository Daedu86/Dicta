import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
} from '../components/openrouter/types';
import {
  ADAPTIVE_BENCHMARKS_KEY,
  ADAPTIVE_SESSION_FEEDBACK_KEY,
} from './useSessionPersistenceSync';

export function loadAdaptiveBenchmarks(): AdaptiveBenchmarksByInputLanguage {
  return loadJsonObject<AdaptiveBenchmarksByInputLanguage>(ADAPTIVE_BENCHMARKS_KEY);
}

export function persistAdaptiveBenchmarks(value: AdaptiveBenchmarksByInputLanguage): void {
  window.localStorage.setItem(ADAPTIVE_BENCHMARKS_KEY, JSON.stringify(value));
}

export function loadAdaptiveSessionFeedback(): AdaptiveSessionFeedbackByInputLanguage {
  return loadJsonObject<AdaptiveSessionFeedbackByInputLanguage>(ADAPTIVE_SESSION_FEEDBACK_KEY);
}

export function persistAdaptiveSessionFeedback(value: AdaptiveSessionFeedbackByInputLanguage): void {
  window.localStorage.setItem(ADAPTIVE_SESSION_FEEDBACK_KEY, JSON.stringify(value));
}

function loadJsonObject<TValue extends object>(key: string): TValue {
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return {} as TValue;
  }

  try {
    const parsed = JSON.parse(raw) as TValue;
    return parsed && typeof parsed === 'object' ? parsed : ({} as TValue);
  } catch {
    return {} as TValue;
  }
}
