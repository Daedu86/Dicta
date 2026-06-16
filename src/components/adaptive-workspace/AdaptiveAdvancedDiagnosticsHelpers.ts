import { estimateSessionVoiceDurationSec } from '../../core/sessionDuration';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../../core/sessionInputModes';
import type { SessionTelemetry } from '../../types/dictation';
import type { AdaptiveAdapterCardConfig } from './types';
import type { AdaptiveLatestSession, AdaptiveSessionMetrics } from './AdaptiveAdvancedDiagnosticsTypes';

export function countTelemetrySamples(telemetry: SessionTelemetry): number {
  return Math.max(telemetry.lagSeries.length, telemetry.wpmSeries.length, telemetry.accuracySeries.length);
}

export function formatSessionInputMode(mode: AdaptiveAdapterCardConfig['inputMode']): string {
  if (mode === BROWSER_TTS_SESSION_INPUT_MODE) return 'Browser TTS';
  return 'Removed legacy input';
}

export function formatDuration(seconds: number): string {
  const roundedSeconds = Math.max(0, Math.round(seconds));
  if (roundedSeconds < 60) {
    return `${roundedSeconds}s`;
  }
  const minutes = Math.floor(roundedSeconds / 60);
  const remainder = roundedSeconds % 60;
  return `${minutes}m ${remainder}s`;
}

export function formatSessionPlaybackDuration(session: AdaptiveLatestSession): string {
  const durationSec = estimateSessionVoiceDurationSec(session);
  return durationSec !== null ? formatDuration(durationSec) : 'n/a';
}

export function formatTrendLabel(trend: AdaptiveSessionMetrics['trend']): string {
  if (trend === 'improving') return 'Improving';
  if (trend === 'declining') return 'Declining';
  return 'Stable';
}

export function getRateDistributionPercentage(
  entrySeconds: number,
  rateDistribution: AdaptiveLatestSession['telemetry']['rateDistribution'],
): number {
  const totalSeconds = Math.max(1, rateDistribution.reduce((sum, next) => sum + next.seconds, 0));
  return Math.min(100, Math.round((entrySeconds / totalSeconds) * 100));
}
