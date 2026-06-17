globalThis.IS_REACT_ACT_ENVIRONMENT = true;

export {
  createDeferredSupabaseClient,
  createKeepaliveSupabaseClient,
} from './sessionPersistenceSupabaseClients';
export { authSyncConfig, disabledSyncConfig } from './sessionPersistenceSyncHarnessConfig';
export {
  buildTestSyncState,
  loadTestBenchmarks,
  loadTestFeedback,
  loadTestSessions,
  normalizeTestSession,
  session,
  telemetry,
} from './sessionPersistenceSyncHarnessFixtures';
export {
  cleanupSessionPersistenceSyncHarness,
  flushReactWork,
  setupSessionPersistenceSyncHarness,
} from './sessionPersistenceSyncHarnessLifecycle';
export { renderHarness } from './sessionPersistenceSyncHarnessRender';
export type {
  RuntimeSnapshot,
  TestBenchmarks,
  TestFeedback,
  TestSession,
} from './sessionPersistenceSyncHarnessTypes';
