import { EVENT_DURATION_THRESHOLD } from './constants';
import { normalizeInpEntry } from './normalize';
import type { EventObserverOptions, InpAttribution, InpEntry, PerformanceObserverWithSupport } from './types';

const noopTeardown = () => undefined;

function canInstallPerformanceObserver() {
  return typeof window !== 'undefined' && typeof PerformanceObserver !== 'undefined';
}

function supportsEventTimingObserver(performanceObserver: PerformanceObserverWithSupport) {
  return !performanceObserver.supportedEntryTypes || performanceObserver.supportedEntryTypes.includes('event');
}

function rememberHighestInp(attribution: InpAttribution, highestInp: number) {
  if (attribution.value < highestInp) {
    return highestInp;
  }

  window.__dictaInpAttribution = attribution;

  return attribution.value;
}

function processEntries(list: PerformanceObserverEntryList, getHighestInp: () => number, setHighestInp: (value: number) => void) {
  list.getEntries().forEach((entry) => {
    const attribution = normalizeInpEntry(entry as InpEntry, window.location.pathname);

    if (!attribution) {
      return;
    }

    setHighestInp(rememberHighestInp(attribution, getHighestInp()));
  });
}

function observeWithDurationThreshold(observer: PerformanceObserver) {
  observer.observe({ type: 'event', buffered: true, durationThreshold: EVENT_DURATION_THRESHOLD } as EventObserverOptions);
}

function observeWithLegacyEntryTypes(observer: PerformanceObserver) {
  observer.observe({ entryTypes: ['event'] });
}

function startEventTimingObserver(observer: PerformanceObserver) {
  try {
    observeWithDurationThreshold(observer);
    return true;
  } catch {
    try {
      observeWithLegacyEntryTypes(observer);
      return true;
    } catch {
      return false;
    }
  }
}

export function getLatestInpAttribution() {
  return window.__dictaInpAttribution ?? null;
}

export function installInpAttributionObserver() {
  if (!canInstallPerformanceObserver()) {
    return noopTeardown;
  }

  const performanceObserver = PerformanceObserver as PerformanceObserverWithSupport;
  if (!supportsEventTimingObserver(performanceObserver)) {
    return noopTeardown;
  }

  let highestInp = window.__dictaInpAttribution?.value ?? 0;
  const observer = new PerformanceObserver((list) => {
    processEntries(
      list,
      () => highestInp,
      (value) => {
        highestInp = value;
      },
    );
  });

  if (!startEventTimingObserver(observer)) {
    return noopTeardown;
  }

  return () => {
    observer.disconnect();
  };
}
