import { estimateSessionVoiceDurationSec } from '../core/sessionDuration';

export function formatDuration(seconds: number): string {
  const roundedSeconds = Math.max(0, Math.round(seconds));
  if (roundedSeconds < 60) return `${roundedSeconds}s`;
  const minutes = Math.floor(roundedSeconds / 60);
  const remaining = roundedSeconds % 60;
  return `${minutes}m ${remaining}s`;
}

export function formatSessionPlaybackDuration(
  session: Parameters<typeof estimateSessionVoiceDurationSec>[0],
): string {
  const durationSec = estimateSessionVoiceDurationSec(session);
  return durationSec !== null ? formatDuration(durationSec) : 'n/a';
}
