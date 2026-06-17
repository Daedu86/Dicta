export type {
  EventObserverOptions,
  InpAttribution,
  InpEntry,
  InpRating,
  PerformanceObserverWithSupport,
  SelectorTarget,
} from './inpAttribution/types';

export { EVENT_DURATION_THRESHOLD, MAX_SELECTOR_LENGTH, MIN_TRACKED_INP, REPORTABLE_EVENTS } from './inpAttribution/constants';
export { getInteractionType } from './inpAttribution/interactionType';
export { clamp, getInpRating, getInteractionBreakdown, isFiniteNumber, roundMetric } from './inpAttribution/numberMetrics';
export { normalizeInpEntry } from './inpAttribution/normalize';
export { getLatestInpAttribution, installInpAttributionObserver } from './inpAttribution/observer';
export { cleanAttribute, cleanToken } from './inpAttribution/selectorSanitizers';
export { getInteractionTargetSelector } from './inpAttribution/selectorTargets';
