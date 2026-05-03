import type { ControlAction, SessionTelemetry } from '../types/dictation';

export function createTelemetry(): SessionTelemetry {
  return {
    startedAt: new Date().toISOString(),
    lagSeries: [],
    wpmSeries: [],
    accuracySeries: [],
    actions: [],
    ttsChunks: [],
    repeatCount: 0,
    rateDistribution: [],
  };
}

export function trackSample(telemetry: SessionTelemetry, lag: number, wpm: number, accuracy: number, rate: number): void {
  telemetry.lagSeries.push(Number(lag.toFixed(3)));
  telemetry.wpmSeries.push(Number(wpm.toFixed(2)));
  telemetry.accuracySeries.push(Number(accuracy.toFixed(2)));
  const bucket = Number(rate.toFixed(2));
  const existing = telemetry.rateDistribution.find((entry) => entry.rate === bucket);
  if (existing) {
    existing.seconds += 1;
  } else {
    telemetry.rateDistribution.push({ rate: bucket, seconds: 1 });
  }
}

export function trackAction(telemetry: SessionTelemetry, t: number, action: ControlAction, rate: number): void {
  telemetry.actions.push({ t, action, rate });
  if (action === 'pause_repeat') {
    telemetry.repeatCount += 1;
  }
}

export function finishTelemetry(telemetry: SessionTelemetry): SessionTelemetry {
  telemetry.finishedAt = new Date().toISOString();
  return telemetry;
}

export function downloadTelemetry(telemetry: SessionTelemetry): void {
  const payload = JSON.stringify(telemetry, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dicta-session-${Date.now()}.json`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function telemetryJson(telemetry: SessionTelemetry): string {
  return JSON.stringify(telemetry, null, 2);
}
