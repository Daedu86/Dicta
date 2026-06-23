export type BrowserTtsNextChunkGateResolutionReason = 'completed' | 'timeout' | 'no-gate';

export interface BrowserTtsNextChunkCompletionGate {
  isComplete: () => boolean;
  pollMs?: number;
  maxWaitMs?: number;
  onResolved?: (actualWaitMs: number, reason: BrowserTtsNextChunkGateResolutionReason) => void;
}

export interface BrowserTtsNextChunkSchedulerInput {
  shouldPauseBeforeNextChunk: boolean;
  pauseBeforeNextChunkMs: number;
  scheduleTimeout: (callback: () => void, delayMs: number) => unknown;
  completionGate?: BrowserTtsNextChunkCompletionGate;
  speakNext: () => void;
}

export const BROWSER_TTS_COMPLETION_GATE_POLL_MS = 100;
export const BROWSER_TTS_COMPLETION_GATE_MAX_WAIT_MS = 4000;

export function scheduleBrowserTtsNextChunk({
  shouldPauseBeforeNextChunk,
  pauseBeforeNextChunkMs,
  scheduleTimeout,
  completionGate,
  speakNext,
}: BrowserTtsNextChunkSchedulerInput): void {
  if (!shouldPauseBeforeNextChunk) {
    completionGate?.onResolved?.(0, 'no-gate');
    speakNext();
    return;
  }

  if (!completionGate) {
    scheduleTimeout(() => {
      speakNext();
    }, pauseBeforeNextChunkMs);
    return;
  }

  const pollMs = normalizePositiveDelay(completionGate.pollMs, BROWSER_TTS_COMPLETION_GATE_POLL_MS);
  const maxWaitMs = normalizePositiveDelay(completionGate.maxWaitMs, BROWSER_TTS_COMPLETION_GATE_MAX_WAIT_MS);
  let resolved = false;
  let elapsedMs = 0;

  const resolve = (actualWaitMs: number, reason: BrowserTtsNextChunkGateResolutionReason): void => {
    if (resolved) return;
    resolved = true;
    completionGate.onResolved?.(actualWaitMs, reason);
    speakNext();
  };

  if (isGateComplete(completionGate)) {
    resolve(0, 'completed');
    return;
  }

  scheduleTimeout(() => {
    resolve(maxWaitMs, 'timeout');
  }, maxWaitMs);

  const schedulePoll = (delayMs: number): void => {
    scheduleTimeout(() => {
      if (resolved) return;
      elapsedMs = Math.min(maxWaitMs, elapsedMs + delayMs);
      if (isGateComplete(completionGate)) {
        resolve(elapsedMs, 'completed');
        return;
      }
      if (elapsedMs < maxWaitMs) {
        schedulePoll(Math.min(pollMs, maxWaitMs - elapsedMs));
      }
    }, delayMs);
  };

  schedulePoll(Math.min(pollMs, maxWaitMs));
}

function normalizePositiveDelay(value: number | undefined, fallback: number): number {
  const rounded = Math.round(value ?? fallback);
  return Number.isFinite(rounded) && rounded > 0 ? rounded : fallback;
}

function isGateComplete(completionGate: BrowserTtsNextChunkCompletionGate): boolean {
  try {
    return completionGate.isComplete();
  } catch {
    return false;
  }
}
