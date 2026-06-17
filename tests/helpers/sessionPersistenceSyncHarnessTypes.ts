import type { UseSessionPersistenceSyncResult } from '../../src/app/useSessionPersistenceSync';
import type { SessionTelemetry } from '../../src/types/dictation';

export type TestSession = {
  id: string;
  updatedAt: string;
  status: 'ready' | 'running' | 'paused' | 'finished' | 'error';
  telemetry: SessionTelemetry;
  marker?: string;
};

export type TestBenchmarks = Record<string, Record<string, unknown>>;
export type TestFeedback = Record<string, Record<string, unknown[]>>;
export type RuntimeSnapshot = UseSessionPersistenceSyncResult<TestSession, TestFeedback>;
