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

export type InpEntry = PerformanceEntry & {
  duration: number;
  interactionId?: number;
  processingEnd?: number;
  processingStart?: number;
  target?: unknown;
};

export type SelectorTarget = {
  tagName?: string;
  id?: string;
  className?: string | { baseVal?: string };
  classList?: Iterable<string> | { length: number; item(index: number): string | null };
  parentElement?: SelectorTarget | null;
  getAttribute?: (name: string) => string | null;
};

export type PerformanceObserverWithSupport = typeof PerformanceObserver & {
  supportedEntryTypes?: readonly string[];
};

export type EventObserverOptions = PerformanceObserverInit & {
  durationThreshold?: number;
};

declare global {
  interface Window {
    __dictaInpAttribution?: InpAttribution;
  }
}
