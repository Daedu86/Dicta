import type { ControlAction } from '../types/dictation';
import type {
  PerformanceTrend,
  StoredSession,
} from './sessionTypes';

export type TtsPlaybackProfile = {
  label: string;
  baseRate: number;
  chunkWords: number;
  pauseMs: number;
};

export type TtsLiveSignal = {
  accuracy: number;
  lagSec: number;
  rawLagSec: number;
  stableLagSec: number;
  lagOutlierCount: number;
  wpm: number;
  trend: PerformanceTrend;
  controllerState: ControlAction;
};

function average(values: number[]): number {
  const valid = values.filter((value) => Number.isFinite(value));
  if (valid.length === 0) {
    return 0;
  }

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function buildTtsPlaybackProfile(sessions: StoredSession[], currentSession: StoredSession | null): TtsPlaybackProfile {
  if (!currentSession) {
    return {
      label: 'Balanced coaching pace',
      baseRate: 0.95,
      chunkWords: 6,
      pauseMs: 260,
    };
  }

  const history = sessions.filter(
    (session) => session.id !== currentSession.id && session.status === 'finished' && session.metrics.points > 0,
  );
  const source = history.length > 0 ? history : sessions.filter((session) => session.id !== currentSession.id && session.metrics.points > 0);
  const avgAccuracy = average(source.map((session) => session.metrics.accuracy));
  const avgWpm = average(source.map((session) => session.metrics.wpm));
  const avgLag = average(source.map((session) => Math.abs(session.metrics.lagSec)));
  const current = currentSession.metrics;
  const signalAccuracy = current.accuracy > 0 ? current.accuracy : avgAccuracy || 100;
  const signalWpm = current.wpm > 0 ? current.wpm : avgWpm || 60;
  const signalLag = Math.abs(current.lagSec) > 0 ? Math.abs(current.lagSec) : avgLag || 2;

  const baseRate = clamp(
    0.82 + (signalAccuracy - 85) / 180 + (signalWpm - 55) / 260 - (signalLag - 2) / 24,
    0.72,
    1.35,
  );
  const chunkWords = signalAccuracy < 80 || signalLag > 3 ? 4 : signalAccuracy > 92 && signalWpm < 65 ? 9 : 6;
  const pauseMs = signalLag > 3 ? 520 : signalAccuracy < 80 ? 420 : 260;
  const label =
    signalAccuracy >= 92 && signalWpm < 65
      ? 'Precision pacing'
      : signalLag > 3
        ? 'Slow correction pacing'
        : signalWpm > 85
          ? 'Faster coaching pace'
          : 'Balanced coaching pace';

  return {
    label,
    baseRate,
    chunkWords,
    pauseMs,
  };
}
