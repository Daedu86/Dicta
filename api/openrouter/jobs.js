import { randomUUID } from 'node:crypto';
import { waitUntil } from '@vercel/functions';
import { createClient } from '@supabase/supabase-js';
import { resolveRequestProfile, sendApiError } from '../_supabaseProfile.js';

const JOB_TABLE = 'dicta_openrouter_jobs';
const VALID_STATUSES = new Set(['queued', 'running', 'succeeded', 'failed']);
const JOB_RETENTION_DAYS = 14;

function getRequiredEnv(name) {
  const value = process.env[name]?.trim() ?? '';
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function normalizeRequestBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString('utf8'));
    } catch {
      return {};
    }
  }
  return body;
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
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
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

function readCreateJobPayload(body) {
  const payload = normalizeRequestBody(body);
  const model = typeof payload.model === 'string' ? payload.model.trim() : '';
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  const maxTokensRaw = Number(payload.maxTokens);
  const maxTokens = Number.isFinite(maxTokensRaw) ? Math.max(128, Math.min(1800, Math.round(maxTokensRaw))) : undefined;
  const inputMode = typeof payload.inputMode === 'string' ? payload.inputMode : '';
  const language = typeof payload.language === 'string' ? payload.language : '';
  const slotLabel = typeof payload.slotLabel === 'string' ? payload.slotLabel.trim() : 'OpenRouter session';
  const durationMinutes = Number(payload.durationMinutes);
  const targetDifficulty = typeof payload.targetDifficulty === 'string' ? payload.targetDifficulty : '';

  if (!model || !prompt) throw new Error('Missing model or prompt.');
  if (!['audio', 'browser-tts', 'kokoro', 'qwen-cloud'].includes(inputMode)) throw new Error('Invalid inputMode.');
  if (!['en', 'es', 'de'].includes(language)) throw new Error('Invalid language.');
  if (![2, 3, 4].includes(durationMinutes)) throw new Error('Invalid durationMinutes.');

  return {
    model,
    prompt,
    maxTokens,
    inputMode,
    language,
    slotLabel,
    durationMinutes,
    ...(targetDifficulty ? { targetDifficulty } : {}),
  };
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
  const { profileId } = await resolveRequestProfile(req, { allowLegacyEnvProfile: true });
  const requestPayload = readCreateJobPayload(req.body);
  await cleanupOldOpenRouterJobs(supabase, profileId);
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
  const { profileId } = await resolveRequestProfile(req, { allowLegacyEnvProfile: true });
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
