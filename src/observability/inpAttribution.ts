export type InpRating = 'good' | 'needs-improvement' | 'poor';

export type InpAttribution = {
  value: number;
  rating: InpRating;
  target: string | null;
  type: string | null;
  eventName: string | null;
  inputDelay: number;
  processingDuration: number;
  presentationDelay: number;
  path: string;
  timestamp: string;
  source: 'event-timing';
};

type InpEntry = PerformanceEntry & {
  duration: number;
  interactionId?: number;
  processingEnd?: number;
  processingStart?: number;
  target?: unknown;
};

type SelectorTarget = {
  tagName?: string;
  id?: string;
  className?: string | { baseVal?: string };
  classList?: Iterable<string> | { length: number; item(index: number): string | null };
  parentElement?: SelectorTarget | null;
  getAttribute?: (name: string) => string | null;
};

type PerformanceObserverWithSupport = typeof PerformanceObserver & {
  supportedEntryTypes?: readonly string[];
};

type EventObserverOptions = PerformanceObserverInit & {
  durationThreshold?: number;
};

declare global {
  interface Window {
    __dictaInpAttribution?: InpAttribution;
  }
}

const MIN_TRACKED_INP = 200;
const EVENT_DURATION_THRESHOLD = 40;
const MAX_SELECTOR_LENGTH = 180;
const REPORTABLE_EVENTS = new Set([
  'auxclick',
  'beforeinput',
  'click',
  'compositionend',
  'contextmenu',
  'dblclick',
  'input',
  'keydown',
  'keypress',
  'keyup',
  'mousedown',
  'mouseup',
  'pointerdown',
  'pointerup',
  'touchend',
  'touchstart',
]);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function roundMetric(value: number) {
  return Math.round(Math.max(0, value));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function cleanToken(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 48);
}

function cleanAttribute(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_.:/-]/g, '-').slice(0, 48);
}

function isSelectorTarget(target: unknown): target is SelectorTarget {
  return typeof target === 'object' && target !== null && 'tagName' in target;
}

function readClassNames(target: SelectorTarget) {
  const { classList, className } = target;

  if (classList) {
    const iterableClassList = classList as Iterable<string>;
    if (typeof iterableClassList[Symbol.iterator] === 'function') {
      return Array.from(iterableClassList);
    }

    const indexedClassList = classList as { length: number; item(index: number): string | null };
    if (typeof indexedClassList.length === 'number' && typeof indexedClassList.item === 'function') {
      return Array.from({ length: indexedClassList.length }, (_, index) => indexedClassList.item(index)).filter(
        (classItem): classItem is string => Boolean(classItem),
      );
    }
  }

  if (typeof className === 'string') {
    return className.split(/\s+/);
  }

  if (className && typeof className.baseVal === 'string') {
    return className.baseVal.split(/\s+/);
  }

  return [];
}

function getSelectorPart(target: SelectorTarget) {
  const tag = cleanToken((target.tagName ?? 'element').toLowerCase()) || 'element';
  const id = target.id ? `#${cleanToken(target.id)}` : '';
  const classes = readClassNames(target)
    .map(cleanToken)
    .filter(Boolean)
    .slice(0, 3)
    .map((className) => `.${className}`)
    .join('');
  const role = target.getAttribute?.('role');
  const type = target.getAttribute?.('type');
  const roleSelector = role ? `[role="${cleanAttribute(role)}"]` : '';
  const typeSelector = type ? `[type="${cleanAttribute(type)}"]` : '';

  return `${tag}${id}${classes}${roleSelector}${typeSelector}`;
}

export function getInteractionTargetSelector(target: unknown) {
  if (!isSelectorTarget(target)) {
    return null;
  }

  const parts: string[] = [];
  let currentTarget: SelectorTarget | null = target;

  for (let depth = 0; currentTarget && depth < 4; depth += 1) {
    parts.unshift(getSelectorPart(currentTarget));

    if (currentTarget.id) {
      break;
    }

    currentTarget = currentTarget.parentElement ?? null;
  }

  return parts.join(' > ').slice(0, MAX_SELECTOR_LENGTH) || null;
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

export function normalizeInpEntry(entry: InpEntry, path: string): InpAttribution | null {
  const value = roundMetric(isFiniteNumber(entry.duration) ? entry.duration : 0);
  const eventName = typeof entry.name === 'string' ? entry.name : null;
  const hasInteractionId = isFiniteNumber(entry.interactionId) && entry.interactionId > 0;

  if (value < MIN_TRACKED_INP || (!hasInteractionId && (!eventName || !REPORTABLE_EVENTS.has(eventName)))) {
    return null;
  }

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

export function getInteractionType(eventName: string | null) {
  if (!eventName) {
    return null;
  }

  if (eventName.startsWith('key')) {
    return 'keyboard';
  }

  if (eventName.includes('input') || eventName.startsWith('composition')) {
    return 'text';
  }

  if (
    eventName.includes('click') ||
    eventName.startsWith('mouse') ||
    eventName.startsWith('pointer') ||
    eventName.startsWith('touch') ||
    eventName === 'contextmenu'
  ) {
    return 'pointer';
  }

  return eventName;
}

export function getLatestInpAttribution() {
  return window.__dictaInpAttribution ?? null;
}

export function installInpAttributionObserver() {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return () => undefined;
  }

  const performanceObserver = PerformanceObserver as PerformanceObserverWithSupport;
  if (performanceObserver.supportedEntryTypes && !performanceObserver.supportedEntryTypes.includes('event')) {
    return () => undefined;
  }

  let highestInp = window.__dictaInpAttribution?.value ?? 0;
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      const attribution = normalizeInpEntry(entry as InpEntry, window.location.pathname);

      if (!attribution || attribution.value < highestInp) {
        return;
      }

      highestInp = attribution.value;
      window.__dictaInpAttribution = attribution;
    });
  });

  try {
    observer.observe({ type: 'event', buffered: true, durationThreshold: EVENT_DURATION_THRESHOLD } as EventObserverOptions);
  } catch {
    try {
      observer.observe({ entryTypes: ['event'] });
    } catch {
      return () => undefined;
    }
  }

  return () => {
    observer.disconnect();
  };
}
