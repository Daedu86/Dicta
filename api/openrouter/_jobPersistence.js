import { OPENROUTER_ACTIVE_JOB_LIMIT } from './_request.js';
import {
  formatOpenRouterJobStaleError,
  OPENROUTER_JOB_STALE_AFTER_MS,
} from './_jobTimeout.js';

const JOB_TABLE = 'dicta_openrouter_jobs';
const VALID_STATUSES = new Set(['queued', 'running', 'succeeded', 'failed']);
const ACTIVE_STATUSES = ['queued', 'running'];
const JOB_RETENTION_DAYS = 14;
const OPENROUTER_JOB_COLUMNS = 'job_id,status,request,result,error,created_at,updated_at,completed_at';
export const OPENROUTER_JOB_CANCELED_MESSAGE = 'Canceled by user.';

export function normalizeOpenRouterJobRow(row) {
  return {
    jobId: row.job_id,
    status: VALID_STATUSES.has(row.status) ? row.status : 'failed',
    request: row.request ?? {},
    result: row.result ?? null,
    error: row.error ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? null,
  };
}

export async function cleanupOldOpenRouterJobs(supabase, profileId) {
  const cutoff = new Date(Date.now() - JOB_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from(JOB_TABLE)
    .delete()
    .eq('profile_id', profileId)
    .in('status', ['succeeded', 'failed'])
    .lt('updated_at', cutoff);
  if (error) console.warn('OpenRouter job cleanup failed:', error.message);
}

export async function enforceActiveOpenRouterJobLimit(supabase, profileId) {
  const { count, error } = await supabase
    .from(JOB_TABLE)
    .select('job_id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .in('status', ['queued', 'running']);
  if (error) throw error;
  if (Number(count ?? 0) < OPENROUTER_ACTIVE_JOB_LIMIT) return;
  throw Object.assign(
    new Error(`Too many active OpenRouter jobs. Wait for one of the ${OPENROUTER_ACTIVE_JOB_LIMIT} active jobs to finish.`),
    { statusCode: 429 },
  );
}

export async function insertQueuedOpenRouterJob(supabase, { profileId, jobId, requestPayload, now }) {
  const { error } = await supabase.from(JOB_TABLE).insert({
    profile_id: profileId,
    job_id: jobId,
    status: 'queued',
    request: requestPayload,
    result: null,
    error: null,
    created_at: now,
    updated_at: now,
    completed_at: null,
  });
  if (error) throw error;
}

export async function markOpenRouterJobRunning(supabase, { profileId, jobId, now }) {
  const { data, error } = await supabase
    .from(JOB_TABLE)
    .update({ status: 'running', updated_at: now, error: null })
    .eq('profile_id', profileId)
    .eq('job_id', jobId)
    .eq('status', 'queued')
    .select(OPENROUTER_JOB_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function markOpenRouterJobSucceeded(supabase, { profileId, jobId, result, completedAt }) {
  const { error } = await supabase
    .from(JOB_TABLE)
    .update({
      status: 'succeeded',
      result,
      error: null,
      updated_at: completedAt,
      completed_at: completedAt,
    })
    .eq('profile_id', profileId)
    .eq('job_id', jobId)
    .in('status', ACTIVE_STATUSES);
  if (error) throw error;
}

export async function markOpenRouterJobFailed(supabase, { profileId, jobId, error, completedAt }) {
  const { error: updateError } = await supabase
    .from(JOB_TABLE)
    .update({
      status: 'failed',
      result: null,
      error,
      updated_at: completedAt,
      completed_at: completedAt,
    })
    .eq('profile_id', profileId)
    .eq('job_id', jobId)
    .in('status', ACTIVE_STATUSES);
  if (updateError) throw updateError;
}

export async function markOpenRouterJobCanceled(supabase, { profileId, jobId, completedAt }) {
  return supabase
    .from(JOB_TABLE)
    .update({
      status: 'failed',
      result: null,
      error: OPENROUTER_JOB_CANCELED_MESSAGE,
      updated_at: completedAt,
      completed_at: completedAt,
    })
    .eq('profile_id', profileId)
    .eq('job_id', jobId)
    .in('status', ACTIVE_STATUSES)
    .select(OPENROUTER_JOB_COLUMNS)
    .maybeSingle();
}

export async function readOpenRouterJobRow(supabase, { profileId, jobId }) {
  return supabase
    .from(JOB_TABLE)
    .select(OPENROUTER_JOB_COLUMNS)
    .eq('profile_id', profileId)
    .eq('job_id', jobId)
    .maybeSingle();
}

function readJobModel(row) {
  const model = typeof row?.request?.model === 'string' ? row.request.model.trim() : '';
  return model || 'unknown';
}

function readActiveJobUpdatedMs(row) {
  const timestamp = row?.updated_at ?? row?.created_at;
  const ms = new Date(timestamp).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isStaleOpenRouterJobRow(row, nowMs = Date.now(), staleAfterMs = OPENROUTER_JOB_STALE_AFTER_MS) {
  if (!row || !ACTIVE_STATUSES.includes(row.status)) return false;
  const updatedMs = readActiveJobUpdatedMs(row);
  if (updatedMs === null) return false;
  return nowMs - updatedMs >= staleAfterMs;
}

export async function settleStaleOpenRouterJob(supabase, { profileId, row, now = new Date() }) {
  if (!isStaleOpenRouterJobRow(row, now.getTime())) return row;

  const completedAt = now.toISOString();
  const message = formatOpenRouterJobStaleError(readJobModel(row));
  const { data, error } = await supabase
    .from(JOB_TABLE)
    .update({
      status: 'failed',
      result: null,
      error: message,
      updated_at: completedAt,
      completed_at: completedAt,
    })
    .eq('profile_id', profileId)
    .eq('job_id', row.job_id)
    .in('status', ACTIVE_STATUSES)
    .select(OPENROUTER_JOB_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data ?? row;
}
