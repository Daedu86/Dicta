import {
  getDictaLocalStorageEntries,
  type LocalStorageEntry,
} from './dictaLocalStorageSnapshot';
import { normalizeSessionForPersistence } from '../core/sessionNormalization';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import type { SessionInputMode } from '../core/sessionInputModes';
import { countTelemetrySamples } from '../core/sessionTelemetrySummary';
import type { DictaSyncState } from '../core/supabaseSync';

export type AdminStorageSummary = {
  sessionCount: number;
  finishedSessions: number;
  inputModeCounts: Record<SessionInputMode, number>;
  localStorageEntries: LocalStorageEntry[];
  dictaLocalStorageBytes: number;
  ttsTextChars: number;
  typedTextChars: number;
  telemetrySamples: number;
  telemetryActions: number;
  ttsChunks: number;
};

type AdminStorageSession = Parameters<typeof normalizeSessionForPersistence>[0] & {
  inputMode: SessionInputMode;
  status: string;
  ttsText: string;
  ttsPracticeText: string;
  telemetry: {
    actions: unknown[];
    ttsChunks: unknown[];
  } & Parameters<typeof countTelemetrySamples>[0];
};

export function buildAdminStorageSummary(sessions: AdminStorageSession[]): AdminStorageSummary {
  const localStorageEntries = getDictaLocalStorageEntries();
  const inputModeCounts = sessions.reduce<Record<SessionInputMode, number>>(
    (counts, session) => {
      counts[session.inputMode] += 1;
      return counts;
    },
    { [BROWSER_TTS_SESSION_INPUT_MODE]: 0 },
  );

  return {
    sessionCount: sessions.length,
    finishedSessions: sessions.filter((session) => session.status === 'finished').length,
    inputModeCounts,
    localStorageEntries,
    dictaLocalStorageBytes: localStorageEntries.reduce((sum, entry) => sum + entry.bytes, 0),
    ttsTextChars: sessions.reduce((sum, session) => sum + session.ttsText.length, 0),
    typedTextChars: sessions.reduce((sum, session) => sum + session.ttsPracticeText.length, 0),
    telemetrySamples: sessions.reduce((sum, session) => sum + countTelemetrySamples(session.telemetry), 0),
    telemetryActions: sessions.reduce((sum, session) => sum + session.telemetry.actions.length, 0),
    ttsChunks: sessions.reduce((sum, session) => sum + session.telemetry.ttsChunks.length, 0),
  };
}

export function buildCurrentSyncState(
  sessions: Parameters<typeof normalizeSessionForPersistence>[0][],
  benchmarks: DictaSyncState['benchmarks'],
  feedback: DictaSyncState['feedback'],
): DictaSyncState {
  return {
    sessions: sessions.map((session) => normalizeSessionForPersistence(session)),
    benchmarks,
    feedback,
  };
}
