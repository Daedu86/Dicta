import type { SessionTelemetry } from '../types/dictation';
import { cloneTelemetry } from './sessionNormalization';

export function telemetryEquals(
  a: SessionTelemetry | null | undefined,
  b: SessionTelemetry | null | undefined,
): boolean {
  return JSON.stringify(cloneTelemetry(a)) === JSON.stringify(cloneTelemetry(b));
}
