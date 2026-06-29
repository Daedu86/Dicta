export type BrowserTtsNextChunkGateResolutionReason = 'completed' | 'submitted' | 'timeout' | 'no-gate';

export interface BrowserTtsNextChunkCompletionGate {
  isComplete: () => boolean;
  getResolutionReason?: () => Extract<BrowserTtsNextChunkGateResolutionReason, 'completed' | 'submitted'> | null;
  pollMs?: number;
  maxWaitMs?: number;
  onResolved?: (actualWaitMs: number, reason: BrowserTtsNextChunkGateResolutionReason) => void;
}

export interface BrowserTtsSafePauseGateSettings {
  minimumMentalRestMs: number;
  completionGateMaxWaitMs: number;
}

export interface BrowserTtsNextChunkSchedulerInput {
  shouldPauseBeforeNextChunk: boolean;
  pauseBeforeNextChunkMs: number;
  scheduleTimeout: (callback: () => void, delayMs: number) => unknown;
  completionGate?: BrowserTtsNextChunkCompletionGate;
  safePauseGateSettings?: BrowserTtsSafePauseGateSettings;
  onResolved?: (actualWaitMs: number, reason: BrowserTtsNextChunkGateResolutionReason) => void;
  speakNext: () => void;
}

export const BROWSER_TTS_COMPLETION_GATE_POLL_MS = 100;
export const BROWSER_TTS_COMPLETION_GATE_MAX_WAIT_MS = 4000;
export const BROWSER_TTS_MIN_MENTAL_REST_MS = 700;
export const DEFAULT_BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS: BrowserTtsSafePauseGateSettings = {
  minimumMentalRestMs: BROWSER_TTS_MIN_MENTAL_REST_MS,
  completionGateMaxWaitMs: BROWSER_TTS_COMPLETION_GATE_MAX_WAIT_MS,
};

export function scheduleBrowserTtsNextChunk({
  shouldPauseBeforeNextChunk,
  pauseBeforeNextChunkMs,
  scheduleTimeout,
  completionGate,
  safePauseGateSettings,
  onResolved,
  speakNext,
}: BrowserTtsNextChunkSchedulerInput): void {
  const resolvedSettings = normalizeSafePauseGateSettings(safePauseGateSettings);

  if (!shouldPauseBeforeNextChunk) {
    completionGate?.onResolved?.(0, 'no-gate');
    onResolved?.(0, 'no-gate');
    speakNext();
    return;
  }

  if (!completionGate) {
    const fixedPauseMs = Math.max(normalizeNonNegativeDelay(pauseBeforeNextChunkMs), resolvedSettings.minimumMentalRestMs);
    scheduleTimeout(() => {
      onResolved?.(fixedPauseMs, 'no-gate');
      speakNext();
    }, fixedPauseMs);
    return;
  }

  const pollMs = normalizePositiveDelay(completionGate.pollMs, BROWSER_TTS_COMPLETION_GATE_POLL_MS);
  const maxWaitMs = normalizePositiveDelay(
    completionGate.maxWaitMs ?? resolvedSettings.completionGateMaxWaitMs,
    resolvedSettings.completionGateMaxWaitMs,
  );
  let resolved = false;
  let elapsedMs = 0;

  const resolve = (actualWaitMs: number, reason: BrowserTtsNextChunkGateResolutionReason): void => {
    if (resolved) return;
    resolved = true;
    const resolvedWaitMs = reason === 'timeout'
      ? actualWaitMs
      : Math.min(maxWaitMs, Math.max(actualWaitMs, resolvedSettings.minimumMentalRestMs));
    const remainingRestMs = Math.max(0, resolvedWaitMs - actualWaitMs);
    const finish = (): void => {
      completionGate.onResolved?.(resolvedWaitMs, reason);
      onResolved?.(resolvedWaitMs, reason);
      speakNext();
    };

    if (remainingRestMs > 0) {
      scheduleTimeout(finish, remainingRestMs);
      return;
    }

    finish();
  };

  const initialReason = getGateResolutionReason(completionGate);
  if (initialReason) {
    resolve(0, initialReason);
    return;
  }

  scheduleTimeout(() => {
    resolve(maxWaitMs, 'timeout');
  }, maxWaitMs);

  const schedulePoll = (delayMs: number): void => {
    scheduleTimeout(() => {
      if (resolved) return;
      elapsedMs = Math.min(maxWaitMs, elapsedMs + delayMs);
      const reason = getGateResolutionReason(completionGate);
      if (reason) {
        resolve(elapsedMs, reason);
        return;
      }
      if (elapsedMs < maxWaitMs) {
        schedulePoll(Math.min(pollMs, maxWaitMs - elapsedMs));
      }
    }, delayMs);
  };

  schedulePoll(Math.min(pollMs, maxWaitMs));
}

function normalizeSafePauseGateSettings(
  settings: BrowserTtsSafePauseGateSettings | undefined,
): BrowserTtsSafePauseGateSettings {
  const completionGateMaxWaitMs = normalizePositiveDelay(
    settings?.completionGateMaxWaitMs,
    DEFAULT_BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS.completionGateMaxWaitMs,
  );
  const minimumMentalRestMs = Math.min(
    completionGateMaxWaitMs,
    normalizeNonNegativeDelay(settings?.minimumMentalRestMs ?? DEFAULT_BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS.minimumMentalRestMs),
  );

  return {
    minimumMentalRestMs,
    completionGateMaxWaitMs,
  };
}

function normalizePositiveDelay(value: number | undefined, fallback: number): number {
  const rounded = Math.round(value ?? fallback);
  return Number.isFinite(rounded) && rounded > 0 ? rounded : fallback;
}

function normalizeNonNegativeDelay(value: number): number {
  const rounded = Math.round(value);
  return Number.isFinite(rounded) && rounded > 0 ? rounded : 0;
}

function isGateComplete(completionGate: BrowserTtsNextChunkCompletionGate): boolean {
  try {
    return completionGate.isComplete();
  } catch {
    return false;
  }
}

function getGateResolutionReason(
  completionGate: BrowserTtsNextChunkCompletionGate,
): Extract<BrowserTtsNextChunkGateResolutionReason, 'completed' | 'submitted'> | null {
  try {
    return completionGate.getResolutionReason?.() ?? (isGateComplete(completionGate) ? 'completed' : null);
  } catch {
    return null;
  }
}
