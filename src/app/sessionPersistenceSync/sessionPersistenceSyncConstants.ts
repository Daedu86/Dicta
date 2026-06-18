import {
  OPENROUTER_ACTIVE_JOB_STORAGE_KEY,
  OPENROUTER_ACTIVE_JOBS_STORAGE_KEY,
} from '../../core/openRouterJobs';
import {
  ADAPTIVE_BENCHMARKS_LEGACY_KEY,
  ADAPTIVE_SESSION_FEEDBACK_LEGACY_KEY,
  SESSION_STORAGE_LEGACY_KEY,
} from '../../core/localDb/migrateLegacyLocalStorageKeys';
import {
  OPENROUTER_GENERATED_SCRIPT_KEY,
  OPENROUTER_GENERATED_VARIANTS_KEY,
} from '../../components/openrouter/openRouterViewHelpers';
import { DELETED_SESSION_IDS_KEY } from '../sessionPersistenceDeletedIds';
import type { ImmediateSessionSyncOptions } from './sessionPersistenceSyncTypes';

export const SESSION_STORAGE_KEY = SESSION_STORAGE_LEGACY_KEY;
export const ADAPTIVE_BENCHMARKS_KEY = ADAPTIVE_BENCHMARKS_LEGACY_KEY;
export const ADAPTIVE_SESSION_FEEDBACK_KEY = ADAPTIVE_SESSION_FEEDBACK_LEGACY_KEY;

export const SESSION_PERSIST_DEBOUNCE_MS = 1500;
export const SUPABASE_BACKGROUND_PULL_INTERVAL_MS = 15_000;

export const PROFILE_SCOPED_DICTA_STORAGE_KEYS = [
  SESSION_STORAGE_KEY,
  DELETED_SESSION_IDS_KEY,
  ADAPTIVE_BENCHMARKS_KEY,
  ADAPTIVE_SESSION_FEEDBACK_KEY,
  OPENROUTER_GENERATED_SCRIPT_KEY,
  OPENROUTER_GENERATED_VARIANTS_KEY,
  OPENROUTER_ACTIVE_JOB_STORAGE_KEY,
  OPENROUTER_ACTIVE_JOBS_STORAGE_KEY,
] as const;

export const SESSION_CREATE_SYNC_OPTIONS: ImmediateSessionSyncOptions = {
  localStorageSpanName: 'session.create.persistNow.localStorage',
  buildSpanName: 'supabase.buildSyncState.sessionCreate',
  pushingMessage: 'Pushing new session to Supabase...',
  syncedMessage: 'New session synced to Supabase.',
  errorMessage: 'Supabase session sync failed.',
};
