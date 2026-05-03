import type { ControlAction, ControllerConfig, SyncState, Transcript } from '../types/dictation';

export interface ControllerDecision {
  action: ControlAction;
  nextRate: number;
  repeatFromSec?: number;
}

export function expectedWordIndex(transcript: Transcript, audioTime: number): number {
  for (let i = transcript.words.length - 1; i >= 0; i -= 1) {
    if (transcript.words[i].start <= audioTime) {
      return i;
    }
  }
  return 0;
}

export function deriveSyncState(params: {
  transcript: Transcript;
  audioTime: number;
  typedWordIndex: number;
  wpm: number;
  accuracy: number;
}): SyncState {
  const expectedWord = expectedWordIndex(params.transcript, params.audioTime);
  const safeTypedIndex = Math.max(-1, Math.min(params.typedWordIndex, params.transcript.words.length - 1));
  const typedTime = safeTypedIndex >= 0 ? (params.transcript.words[safeTypedIndex]?.start ?? 0) : 0;
  const lagSec = clampNumber(params.audioTime - typedTime, -10, 10);
  const lagWords = clampNumber(expectedWord - safeTypedIndex, -30, 30);

  return {
    audioTime: params.audioTime,
    typedWordIndex: safeTypedIndex,
    expectedWordIndex: expectedWord,
    lagWords,
    lagSec,
    wpm: params.wpm,
    accuracy: params.accuracy,
  };
}

export class SyncController {
  private readonly config: ControllerConfig;
  private lastActionAtMs = 0;
  private lastRepeatAtSec = -Infinity;
  private repeatsInWindow: number[] = [];

  constructor(config: ControllerConfig) {
    this.config = config;
  }

  reset(): void {
    this.lastActionAtMs = 0;
    this.lastRepeatAtSec = -Infinity;
    this.repeatsInWindow = [];
  }

  decide(state: SyncState, currentRate: number, nowMs: number, transcript: Transcript): ControllerDecision {
    if (nowMs - this.lastActionAtMs < this.config.hysteresisMs) {
      return { action: 'hold', nextRate: currentRate };
    }

    this.repeatsInWindow = this.repeatsInWindow.filter((t) => state.audioTime - t <= 60);

    const canRepeat =
      state.audioTime - this.lastRepeatAtSec >= this.config.repeatCooldownSec &&
      this.repeatsInWindow.length < this.config.maxRepeatPerMinute;

    if ((Math.abs(state.lagSec) >= 8 || Math.abs(state.lagWords) >= 25) && canRepeat) {
      const fromIndex = Math.max(0, state.expectedWordIndex - this.config.repeatWords);
      const repeatFromSec = transcript.words[fromIndex]?.start ?? 0;
      this.lastActionAtMs = nowMs;
      this.lastRepeatAtSec = state.audioTime;
      this.repeatsInWindow.push(state.audioTime);
      return { action: 'pause_repeat', nextRate: Math.max(this.config.minRate, 0.9), repeatFromSec };
    }

    // If accuracy is low, prioritize stabilization instead of speed.
    if (state.accuracy < 88) {
      if ((state.lagSec > 0.2 || state.lagWords > 0) && canRepeat && state.accuracy < 75 && state.lagWords > 2) {
        const fromIndex = Math.max(0, state.expectedWordIndex - this.config.repeatWords);
        const repeatFromSec = transcript.words[fromIndex]?.start ?? 0;
        this.lastActionAtMs = nowMs;
        this.lastRepeatAtSec = state.audioTime;
        this.repeatsInWindow.push(state.audioTime);
        return { action: 'pause_repeat', nextRate: Math.max(this.config.minRate, 0.9), repeatFromSec };
      }

      if (state.lagSec > 0.2 || state.lagWords > 0) {
        this.lastActionAtMs = nowMs;
        return { action: 'speed_down', nextRate: clampRate(currentRate - 0.03, this.config) };
      }

      const towardCalm = clampRate(moveToward(currentRate, 0.95, 0.02), this.config);
      this.lastActionAtMs = nowMs;
      return { action: 'hold', nextRate: towardCalm };
    }

    if ((state.lagSec > this.config.lagHardSec || state.lagWords > 5) && canRepeat) {
      const fromIndex = Math.max(0, state.expectedWordIndex - this.config.repeatWords);
      const repeatFromSec = transcript.words[fromIndex]?.start ?? 0;
      this.lastActionAtMs = nowMs;
      this.lastRepeatAtSec = state.audioTime;
      this.repeatsInWindow.push(state.audioTime);
      return { action: 'pause_repeat', nextRate: Math.max(this.config.minRate, 0.9), repeatFromSec };
    }

    if (state.lagSec > this.config.lagSoftSec || state.lagWords > 2) {
      this.lastActionAtMs = nowMs;
      return { action: 'speed_down', nextRate: clampRate(currentRate - 0.03, this.config) };
    }

    if (state.lagSec < this.config.aheadSoftSec && state.accuracy >= 90) {
      this.lastActionAtMs = nowMs;
      return { action: 'speed_up', nextRate: clampRate(currentRate + 0.03, this.config) };
    }

    const towardNormal = clampRate(moveToward(currentRate, 1, 0.02), this.config);
    this.lastActionAtMs = nowMs;
    return { action: 'hold', nextRate: towardNormal };
  }
}

function clampRate(rate: number, config: ControllerConfig): number {
  return Math.max(config.minRate, Math.min(config.maxRate, Number(rate.toFixed(2))));
}

function moveToward(value: number, target: number, step: number): number {
  if (Math.abs(value - target) <= step) {
    return target;
  }
  return value > target ? value - step : value + step;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
