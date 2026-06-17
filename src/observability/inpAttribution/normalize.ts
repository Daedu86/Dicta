import { MIN_TRACKED_INP, REPORTABLE_EVENTS } from './constants';
import { getInteractionType } from './interactionType';
import { getInteractionBreakdown, getInpRating, isFiniteNumber, roundMetric } from './numberMetrics';
import { getInteractionTargetSelector } from './selectorTargets';
import type { InpAttribution, InpEntry } from './types';

function getEntryValue(entry: InpEntry) {
  return roundMetric(isFiniteNumber(entry.duration) ? entry.duration : 0);
}

function getEntryEventName(entry: InpEntry) {
  return typeof entry.name === 'string' ? entry.name : null;
}

function hasValidInteractionId(entry: InpEntry) {
  return isFiniteNumber(entry.interactionId) && entry.interactionId > 0;
}

function isReportableEvent(eventName: string | null) {
  return Boolean(eventName && REPORTABLE_EVENTS.has(eventName));
}

function isReportableInpEntry(entry: InpEntry, value: number, eventName: string | null) {
  return value >= MIN_TRACKED_INP && (hasValidInteractionId(entry) || isReportableEvent(eventName));
}

function buildInpAttribution(entry: InpEntry, path: string, value: number, eventName: string | null): InpAttribution {
  const { inputDelay, processingDuration, presentationDelay } = getInteractionBreakdown(entry);

  return {
    value,
    rating: getInpRating(value),
    target: getInteractionTargetSelector(entry.target),
    type: getInteractionType(eventName),
    eventName,
    inputDelay,
    processingDuration,
    presentationDelay,
    path,
    timestamp: new Date().toISOString(),
    source: 'event-timing',
  };
}

export function normalizeInpEntry(entry: InpEntry, path: string): InpAttribution | null {
  const value = getEntryValue(entry);
  const eventName = getEntryEventName(entry);

  if (!isReportableInpEntry(entry, value, eventName)) {
    return null;
  }

  return buildInpAttribution(entry, path, value, eventName);
}
