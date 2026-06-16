import type {
  AdaptiveTimelinePoint,
  InputLanguageBenchmarkMetrics,
} from './types';
import type {
  BrowserTtsEnvironmentFingerprint,
  BrowserTtsEnvironmentHistoryEntry,
} from '../../types/dictation';
import { getBrowserTtsEnvironmentId } from '../../inputs/browserTts/browserTtsEnvironment';

export type BrowserTtsEnvironmentBenchmarkState = Pick<
  InputLanguageBenchmarkMetrics,
  'ttsEnvironment' | 'ttsEnvironmentHistory' | 'environmentChanged'
>;

type TimelineEnvironmentCounts = Map<
  string,
  {
    firstSeenAtMs: number;
    lastSeenAtMs: number;
    sampleCount: number;
    sessionIds: Set<string>;
  }
>;

export function buildBrowserTtsEnvironmentBenchmarkState({
  current,
  timeline,
  ttsEnvironment,
  timestampMs,
}: {
  current: InputLanguageBenchmarkMetrics;
  timeline: AdaptiveTimelinePoint[];
  ttsEnvironment?: BrowserTtsEnvironmentFingerprint;
  timestampMs: number;
}): BrowserTtsEnvironmentBenchmarkState {
  if (current.inputMode !== 'browser-tts' && !ttsEnvironment) {
    return {
      ttsEnvironment: undefined,
      ttsEnvironmentHistory: undefined,
      environmentChanged: undefined,
    };
  }

  const entriesById = new Map<string, BrowserTtsEnvironmentHistoryEntry>();
  for (const entry of current.ttsEnvironmentHistory ?? []) {
    if (!entry.environmentId || entry.ttsEnvironment?.engine !== 'browser') continue;
    entriesById.set(entry.environmentId, { ...entry });
  }

  if (current.ttsEnvironment?.engine === 'browser') {
    const currentId = getBrowserTtsEnvironmentId(current.ttsEnvironment);
    if (!entriesById.has(currentId)) {
      const fallbackTimestamp = current.lastUpdatedAt ?? new Date(timestampMs).toISOString();
      entriesById.set(currentId, {
        environmentId: currentId,
        ttsEnvironment: current.ttsEnvironment,
        firstSeenAt: fallbackTimestamp,
        lastSeenAt: fallbackTimestamp,
        sampleCount: current.sampleCount,
        sessionCount: current.sessionCount,
      });
    }
  }

  if (ttsEnvironment) {
    const environmentId = getBrowserTtsEnvironmentId(ttsEnvironment);
    const seenAt = new Date(timestampMs).toISOString();
    const existing = entriesById.get(environmentId);
    entriesById.set(environmentId, {
      environmentId,
      ttsEnvironment,
      firstSeenAt: existing?.firstSeenAt ?? seenAt,
      lastSeenAt: seenAt,
      sampleCount: existing?.sampleCount ?? 0,
      sessionCount: existing?.sessionCount ?? 0,
    });
  }

  const timelineCounts = countTimelineByTtsEnvironment(timeline);
  const hasTimelineEnvironmentIds = timelineCounts.size > 0;
  const history = [...entriesById.values()]
    .filter((entry) => !hasTimelineEnvironmentIds || timelineCounts.has(entry.environmentId))
    .map((entry) => {
      const counts = timelineCounts.get(entry.environmentId);
      return counts
        ? {
            ...entry,
            firstSeenAt: new Date(counts.firstSeenAtMs).toISOString(),
            lastSeenAt: new Date(counts.lastSeenAtMs).toISOString(),
            sampleCount: counts.sampleCount,
            sessionCount: counts.sessionIds.size > 0 ? counts.sessionIds.size : counts.sampleCount > 0 ? 1 : 0,
          }
        : entry;
    })
    .sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));

  const nextEnvironment = ttsEnvironment ?? history[0]?.ttsEnvironment ?? current.ttsEnvironment;
  return {
    ttsEnvironment: nextEnvironment,
    ttsEnvironmentHistory: history.length > 0 ? history : undefined,
    environmentChanged: history.length > 1 ? true : undefined,
  };
}

export function countTimelineByTtsEnvironment(timeline: AdaptiveTimelinePoint[]): TimelineEnvironmentCounts {
  const counts: TimelineEnvironmentCounts = new Map();
  for (const point of timeline) {
    if (!point.ttsEnvironmentId) continue;
    const current = counts.get(point.ttsEnvironmentId);
    if (current) {
      current.firstSeenAtMs = Math.min(current.firstSeenAtMs, point.timestampMs);
      current.lastSeenAtMs = Math.max(current.lastSeenAtMs, point.timestampMs);
      current.sampleCount += 1;
      if (point.sessionId) current.sessionIds.add(point.sessionId);
    } else {
      counts.set(point.ttsEnvironmentId, {
        firstSeenAtMs: point.timestampMs,
        lastSeenAtMs: point.timestampMs,
        sampleCount: 1,
        sessionIds: new Set(point.sessionId ? [point.sessionId] : []),
      });
    }
  }
  return counts;
}
