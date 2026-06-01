import { createHash, randomUUID } from 'node:crypto';
import { waitUntil } from '@vercel/functions';
import { createClient } from '@supabase/supabase-js';
import { assertOpenRouterAccess, assertOpenRouterModelAllowed, resolveRequestProfile, sendApiError } from '../_supabaseProfile.js';
import { OPENROUTER_ACTIVE_JOB_LIMIT, readOpenRouterJobPayload } from './_request.js';

const JOB_TABLE = 'dicta_openrouter_jobs';
const VALID_STATUSES = new Set(['queued', 'running', 'succeeded', 'failed']);
const JOB_RETENTION_DAYS = 14;
const OPENROUTER_RATE_LIMIT_SCOPE = 'openrouter_jobs';
const OPENROUTER_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const OPENROUTER_MEMBER_JOBS_PER_HOUR = 20;
const OPENROUTER_ADMIN_JOBS_PER_HOUR = 120;

function getRequiredEnv(name) {
  const value = process.env[name]?.trim() ?? '';
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function getPositiveIntEnv(name, fallback, min, max) {
  const numeric = Number(process.env[name]);
  const normalized = Number.isFinite(numeric) ? Math.floor(numeric) : fallback;
  return Math.max(min, Math.min(max, normalized));
}

function createSupabaseAdminClient() {
  return createClient(getRequiredEnv('VITE_SUPABASE_URL'), getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function postChatCompletion({ apiKey, req, model, prompt, maxTokens, timeoutMs }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': req.headers.origin ?? 'https://vercel.app',
        'X-Title': 'Dicta',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });
    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type') ?? 'application/json',
      body,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeJobRow(row) {
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

export function readCreateJobPayload(body) {
  return readOpenRouterJobPayload(body);
}

async function cleanupOldOpenRouterJobs(supabase, profileId) {
  const cutoff = new Date(Date.now() - JOB_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from(JOB_TABLE)
    .delete()
    .eq('profile_id', profileId)
    .in('status', ['succeeded', 'failed'])
    .lt('updated_at', cutoff);
  if (error) {
    console.warn('OpenRouter job cleanup failed:', error.message);
  }
}

async function enforceActiveOpenRouterJobLimit(supabase, profileId) {
  const { count, error } = await supabase
    .from(JOB_TABLE)
    .select('job_id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .in('status', ['queued', 'running']);
  if (error) throw error;
  if (Number(count ?? 0) >= OPENROUTER_ACTIVE_JOB_LIMIT) {
    throw Object.assign(new Error(`Too many active OpenRouter jobs. Wait for one of the ${OPENROUTER_ACTIVE_JOB_LIMIT} active jobs to finish.`), {
      statusCode: 429,
    });
  }
}

async function enforceOpenRouterJobRateLimit(supabase, requester, res) {
  const limit = requester.role === 'admin'
    ? getPositiveIntEnv('DICTA_OPENROUTER_ADMIN_JOBS_PER_HOUR', OPENROUTER_ADMIN_JOBS_PER_HOUR, 1, 1000)
    : getPositiveIntEnv('DICTA_OPENROUTER_MEMBER_JOBS_PER_HOUR', OPENROUTER_MEMBER_JOBS_PER_HOUR, 1, 1000);
  const identifierHash = createHash('sha256').update(`profile:${requester.profileId}`).digest('hex');
  const { data, error } = await supabase.rpc('dicta_check_rate_limit', {
    p_scope: OPENROUTER_RATE_LIMIT_SCOPE,
    p_identifier_hash: identifierHash,
    p_limit: limit,
    p_window_seconds: OPENROUTER_RATE_LIMIT_WINDOW_SECONDS,
  });
  if (error) {
    throw Object.assign(
      new Error(`OpenRouter rate limit check failed. Apply docs/supabase-openrouter-jobs.sql before enabling public beta jobs. ${error.message}`),
      { statusCode: 500 },
    );
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw Object.assign(new Error('OpenRouter rate limit check returned no result.'), { statusCode: 500 });
  }
  const resetAt = row.reset_at ? new Date(row.reset_at).toISOString() : new Date(Date.now() + OPENROUTER_RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
  const remaining = Math.max(0, Number(row.remaining ?? 0));
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', resetAt);
  if (row.allowed !== true) {
    const retryAfter = Math.max(1, Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    throw Object.assign(new Error('OpenRouter job rate limit exceeded. Try again later.'), { statusCode: 429 });
  }
}

async function runOpenRouterJob({ req, supabase, profileId, jobId, requestPayload }) {
  const now = new Date().toISOString();
  await supabase
    .from(JOB_TABLE)
    .update({
      status: 'running',
      updated_at: now,
      error: null,
    })
    .eq('profile_id', profileId)
    .eq('job_id', jobId);

  try {
    const response = await postChatCompletion({
      apiKey: getRequiredEnv('OPENROUTER_API_KEY'),
      req,
      model: requestPayload.model,
      prompt: requestPayload.prompt,
      maxTokens: requestPayload.maxTokens,
      timeoutMs: 290_000,
    });

    if (!response.ok) {
      throw new Error(response.body || `OpenRouter request failed (${response.status}).`);
    }

    let payload = null;
    try {
      payload = JSON.parse(response.body);
    } catch {
      throw new Error('OpenRouter returned non-JSON response.');
    }

    const text = typeof payload?.choices?.[0]?.message?.content === 'string' ? payload.choices[0].message.content : '';
    if (!text.trim()) throw new Error('OpenRouter returned an empty response.');

    const completedAt = new Date().toISOString();
    await supabase
      .from(JOB_TABLE)
      .update({
        status: 'succeeded',
        result: {
          text,
          payload,
          model: requestPayload.model,
          contentType: response.contentType,
        },
        error: null,
        updated_at: completedAt,
        completed_at: completedAt,
      })
      .eq('profile_id', profileId)
      .eq('job_id', jobId);
  } catch (error) {
    const completedAt = new Date().toISOString();
    await supabase
      .from(JOB_TABLE)
      .update({
        status: 'failed',
        result: null,
        error: error instanceof Error ? error.message : 'OpenRouter job failed.',
        updated_at: completedAt,
        completed_at: completedAt,
      })
      .eq('profile_id', profileId)
      .eq('job_id', jobId);
  }
}

async function createJob(req, res) {
  const supabase = createSupabaseAdminClient();
  const requester = await resolveRequestProfile(req, { allowLegacyEnvProfile: true });
  assertOpenRouterAccess(requester);
  const { profileId } = requester;
  const requestPayload = readCreateJobPayload(req.body);
  assertOpenRouterModelAllowed(requester, requestPayload.model);
  await cleanupOldOpenRouterJobs(supabase, profileId);
  await enforceOpenRouterJobRateLimit(supabase, requester, res);
  await enforceActiveOpenRouterJobLimit(supabase, profileId);
  const jobId = randomUUID();
  const now = new Date().toISOString();
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

  waitUntil(runOpenRouterJob({ req, supabase, profileId, jobId, requestPayload }));

  res.status(202).json({
    jobId,
    status: 'queued',
    request: requestPayload,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  });
}

async function getJob(req, res) {
  const supabase = createSupabaseAdminClient();
  const requester = await resolveRequestProfile(req, { allowLegacyEnvProfile: true });
  assertOpenRouterAccess(requester);
  const { profileId } = requester;
  const url = new URL(req.url, `https://${req.headers.host ?? 'dicta.local'}`);
  const jobId = url.searchParams.get('id')?.trim() ?? '';
  if (!jobId) {
    res.status(400).send('Missing job id.');
    return;
  }

  const { data, error } = await supabase
    .from(JOB_TABLE)
    .select('job_id,status,request,result,error,created_at,updated_at,completed_at')
    .eq('profile_id', profileId)
    .eq('job_id', jobId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    res.status(404).send('OpenRouter job not found.');
    return;
  }

  res.status(200).json(normalizeJobRow(data));
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      await createJob(req, res);
      return;
    }
    if (req.method === 'GET') {
      await getJob(req, res);
      return;
    }
    res.status(405).send('Method not allowed');
  } catch (error) {
    sendApiError(res, error, 'OpenRouter job request failed.');
  }
}
