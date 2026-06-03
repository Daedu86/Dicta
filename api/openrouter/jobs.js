import { randomUUID } from 'node:crypto';
import { waitUntil } from '@vercel/functions';
import { createSupabaseServiceClient, assertOpenRouterAccess, assertOpenRouterModelAllowed, resolveRequestProfile, sendApiError } from '../_supabaseProfile.js';
import { OPENROUTER_ACTIVE_JOB_LIMIT, OPENROUTER_FREE_ROUTER_MODEL, readOpenRouterJobPayload } from './_request.js';
import { auditSecurityEvent, enforceOpenRouterRateLimit, getOpenRouterLimit, OPENROUTER_RATE_LIMIT_SCOPES } from './_security.js';

const JOB_TABLE = 'dicta_openrouter_jobs';
const VALID_STATUSES = new Set(['queued', 'running', 'succeeded', 'failed']);
const JOB_RETENTION_DAYS = 14;
const JOB_ROUTE = '/api/openrouter/jobs';
const OPENROUTER_JOB_MAX_ATTEMPTS = 3;
const OPENROUTER_JOB_RETRY_BASE_DELAY_MS = 750;
const OPENROUTER_RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const OPENROUTER_RETRYABLE_ERROR_MARKERS = ['no healthy upstream', 'temporarily unavailable', 'upstream', 'overloaded', 'timeout', 'timed out', 'rate limit'];
const OPENROUTER_JOB_FALLBACK_MODELS = ['google/gemma-3n-e2b-it:free', 'meta-llama/llama-3.2-3b-instruct:free', 'qwen/qwen3-4b:free'];

function getRequiredEnv(name) {
  const value = process.env[name]?.trim() ?? '';
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tryParseJson(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readOpenRouterErrorDetails(body) {
  const parsed = tryParseJson(body);
  const error = parsed?.error && typeof parsed.error === 'object' ? parsed.error : null;
  const metadata = error?.metadata && typeof error.metadata === 'object' ? error.metadata : null;
  const message = typeof error?.message === 'string' ? error.message.trim() : '';
  const raw = typeof metadata?.raw === 'string' ? metadata.raw.trim() : '';
  const providerName = typeof metadata?.provider_name === 'string' ? metadata.provider_name.trim() : '';
  return { message, raw, providerName };
}

function getRequesterAssignedOpenRouterModel(requester) {
  return typeof requester?.assignedOpenRouterModel === 'string' ? requester.assignedOpenRouterModel.trim() : '';
}

function resolveOpenRouterJobRequestPayload(requester, requestPayload) {
  const assignedModel = getRequesterAssignedOpenRouterModel(requester);
  if (!assignedModel || requestPayload.model !== OPENROUTER_FREE_ROUTER_MODEL) return requestPayload;
  return { ...requestPayload, model: assignedModel, requestedModel: requestPayload.model };
}

function buildOpenRouterJobModelCandidates(primaryModel) {
  return [...new Set([primaryModel, ...OPENROUTER_JOB_FALLBACK_MODELS].map((model) => (typeof model === 'string' ? model.trim() : '')).filter(Boolean))];
}

export function isRetryableOpenRouterJobResponse(response) {
  if (!response || response.ok) return false;
  if (OPENROUTER_RETRYABLE_STATUS_CODES.has(Number(response.status))) return true;
  const body = typeof response.body === 'string' ? response.body.toLowerCase() : '';
  return OPENROUTER_RETRYABLE_ERROR_MARKERS.some((marker) => body.includes(marker));
}

export function formatOpenRouterJobProviderError(response, attempts = []) {
  const status = Number(response?.status);
  const statusLabel = Number.isFinite(status) ? String(status) : 'unknown status';
  const { message, raw, providerName } = readOpenRouterErrorDetails(response?.body ?? '');
  const summary = raw || message || `OpenRouter request failed (${statusLabel}).`;
  const provider = providerName ? ` from ${providerName}` : '';
  const retryCount = Math.max(0, attempts.length - 1);
  const retryText = retryCount > 0 ? ` Retried ${retryCount} time${retryCount === 1 ? '' : 's'}.` : '';
  const modelCount = new Set(attempts.map((attempt) => attempt.model).filter(Boolean)).size;
  const modelText = modelCount > 1 ? ` Tried ${modelCount} models.` : '';
  return `OpenRouter provider error (${statusLabel}${provider}): ${summary}.${retryText}${modelText}`;
}

async function postChatCompletion({ apiKey, req, model, prompt, maxTokens, timeoutMs }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: ['Bearer', apiKey].join(' '),
        'Content-Type': 'application/json',
        'HTTP-Referer': req.headers.origin ?? 'https://vercel.app',
        'X-Title': 'Dicta',
      },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
      signal: controller.signal,
    });
    const body = await response.text();
    return { ok: response.ok, status: response.status, contentType: response.headers.get('content-type') ?? 'application/json', body };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function postChatCompletionWithRetries({ apiKey, req, model, prompt, maxTokens, timeoutMs }) {
  const attempts = [];
  let lastResponse = null;
  for (let attempt = 1; attempt <= OPENROUTER_JOB_MAX_ATTEMPTS; attempt += 1) {
    const response = await postChatCompletion({ apiKey, req, model, prompt, maxTokens, timeoutMs });
    const retryable = isRetryableOpenRouterJobResponse(response);
    const { providerName } = readOpenRouterErrorDetails(response.body);
    attempts.push({ attempt, model, status: response.status, ok: response.ok, retryable: !response.ok && retryable, ...(providerName ? { providerName } : {}) });
    lastResponse = response;
    if (response.ok || !retryable || attempt === OPENROUTER_JOB_MAX_ATTEMPTS) break;
    await delay(OPENROUTER_JOB_RETRY_BASE_DELAY_MS * attempt);
  }
  return { ...lastResponse, model, attempts };
}

async function postChatCompletionWithModelFallbacks({ apiKey, req, model, prompt, maxTokens, timeoutMs }) {
  const allAttempts = [];
  let lastResponse = null;
  for (const candidateModel of buildOpenRouterJobModelCandidates(model)) {
    const response = await postChatCompletionWithRetries({ apiKey, req, model: candidateModel, prompt, maxTokens, timeoutMs });
    allAttempts.push(...response.attempts);
    lastResponse = { ...response, attempts: allAttempts };
    if (response.ok) return { ...response, attempts: allAttempts, model: candidateModel };
    if (!isRetryableOpenRouterJobResponse(response)) break;
  }
  return lastResponse;
}

function normalizeJobRow(row) {
  return { jobId: row.job_id, status: VALID_STATUSES.has(row.status) ? row.status : 'failed', request: row.request ?? {}, result: row.result ?? null, error: row.error ?? '', createdAt: row.created_at, updatedAt: row.updated_at, completedAt: row.completed_at ?? null };
}

export function readCreateJobPayload(body) {
  return readOpenRouterJobPayload(body);
}

export function resolveCreateJobPayloadForRequester(requester, body) {
  return resolveOpenRouterJobRequestPayload(requester, readCreateJobPayload(body));
}

export function resolveOpenRouterJobModelCandidates(model) {
  return buildOpenRouterJobModelCandidates(model);
}

async function auditOpenRouterJobEvent(supabase, eventType, requester, details = {}) {
  await auditSecurityEvent(supabase, { eventType, profileId: requester?.profileId, role: requester?.legacy ? 'legacy' : requester?.role, legacy: requester?.legacy, severity: details.severity ?? 'warn', statusCode: details.statusCode, route: JOB_ROUTE, model: details.model, reason: details.reason, metadata: details.metadata });
}

async function cleanupOldOpenRouterJobs(supabase, profileId) {
  const cutoff = new Date(Date.now() - JOB_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from(JOB_TABLE).delete().eq('profile_id', profileId).in('status', ['succeeded', 'failed']).lt('updated_at', cutoff);
  if (error) console.warn('OpenRouter job cleanup failed:', error.message);
}

async function enforceActiveOpenRouterJobLimit(supabase, profileId) {
  const { count, error } = await supabase.from(JOB_TABLE).select('job_id', { count: 'exact', head: true }).eq('profile_id', profileId).in('status', ['queued', 'running']);
  if (error) throw error;
  if (Number(count ?? 0) >= OPENROUTER_ACTIVE_JOB_LIMIT) throw Object.assign(new Error(`Too many active OpenRouter jobs. Wait for one of the ${OPENROUTER_ACTIVE_JOB_LIMIT} active jobs to finish.`), { statusCode: 429 });
}

async function runOpenRouterJob({ req, supabase, requester, profileId, jobId, requestPayload }) {
  const now = new Date().toISOString();
  await supabase.from(JOB_TABLE).update({ status: 'running', updated_at: now, error: null }).eq('profile_id', profileId).eq('job_id', jobId);
  try {
    const response = await postChatCompletionWithModelFallbacks({ apiKey: getRequiredEnv('OPENROUTER_API_KEY'), req, model: requestPayload.model, prompt: requestPayload.prompt, maxTokens: requestPayload.maxTokens, timeoutMs: 290_000 });
    if (!response.ok) throw Object.assign(new Error(formatOpenRouterJobProviderError(response, response.attempts)), { statusCode: response.status, providerError: true, providerAttempts: response.attempts });
    let payload = null;
    try {
      payload = JSON.parse(response.body);
    } catch {
      throw new Error('OpenRouter returned non-JSON response.');
    }
    const text = typeof payload?.choices?.[0]?.message?.content === 'string' ? payload.choices[0].message.content : '';
    if (!text.trim()) throw new Error('OpenRouter returned an empty response.');
    const completedAt = new Date().toISOString();
    await supabase.from(JOB_TABLE).update({ status: 'succeeded', result: { text, payload, model: response.model || requestPayload.model, requestedModel: requestPayload.model, contentType: response.contentType, attempts: response.attempts }, error: null, updated_at: completedAt, completed_at: completedAt }).eq('profile_id', profileId).eq('job_id', jobId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OpenRouter job failed.';
    const statusCode = Number(error?.statusCode);
    const isTimeout = error?.name === 'AbortError' || message.toLowerCase().includes('aborted');
    const eventType = isTimeout ? 'openrouter_job_timeout' : error?.providerError === true ? 'openrouter_job_provider_error' : 'openrouter_job_failed';
    await auditOpenRouterJobEvent(supabase, eventType, requester, { statusCode: isTimeout ? 504 : Number.isFinite(statusCode) ? statusCode : null, severity: 'error', model: requestPayload.model, reason: message, metadata: { jobId, attempts: error?.providerAttempts ?? [] } });
    const completedAt = new Date().toISOString();
    await supabase.from(JOB_TABLE).update({ status: 'failed', result: null, error: message, updated_at: completedAt, completed_at: completedAt }).eq('profile_id', profileId).eq('job_id', jobId);
  }
}

async function createJob(req, res) {
  const supabase = createSupabaseServiceClient();
  let requester;
  let requestPayload;
  try {
    requester = await resolveRequestProfile(req, { allowLegacyEnvProfile: true });
    assertOpenRouterAccess(requester);
    const { profileId } = requester;
    requestPayload = resolveCreateJobPayloadForRequester(requester, req.body);
    assertOpenRouterModelAllowed(requester, requestPayload.model);
    await cleanupOldOpenRouterJobs(supabase, profileId);
    await enforceOpenRouterRateLimit({ supabase, requester, res, scope: OPENROUTER_RATE_LIMIT_SCOPES.jobs, limit: getOpenRouterLimit('jobs', requester), allowInMemoryFallback: requester.legacy === true });
    await enforceActiveOpenRouterJobLimit(supabase, profileId);
    const jobId = randomUUID();
    const now = new Date().toISOString();
    const { error } = await supabase.from(JOB_TABLE).insert({ profile_id: profileId, job_id: jobId, status: 'queued', request: requestPayload, result: null, error: null, created_at: now, updated_at: now, completed_at: null });
    if (error) throw error;
    waitUntil(runOpenRouterJob({ req, supabase, requester, profileId, jobId, requestPayload }));
    res.status(202).json({ jobId, status: 'queued', request: requestPayload, createdAt: now, updatedAt: now, completedAt: null });
  } catch (error) {
    const statusCode = Number(error?.statusCode);
    await auditOpenRouterJobEvent(supabase, Number.isFinite(statusCode) && statusCode === 429 ? 'openrouter_job_rate_limited' : 'openrouter_job_rejected', requester, { statusCode: Number.isFinite(statusCode) ? statusCode : null, model: requestPayload?.model, reason: error instanceof Error ? error.message : 'OpenRouter job rejected.' });
    throw error;
  }
}

async function getJob(req, res) {
  const supabase = createSupabaseServiceClient();
  const requester = await resolveRequestProfile(req, { allowLegacyEnvProfile: true });
  assertOpenRouterAccess(requester);
  const { profileId } = requester;
  const url = new URL(req.url, `https://${req.headers.host ?? 'dicta.local'}`);
  const jobId = url.searchParams.get('id')?.trim() ?? '';
  if (!jobId) {
    res.status(400).send('Missing job id.');
    return;
  }
  const { data, error } = await supabase.from(JOB_TABLE).select('job_id,status,request,result,error,created_at,updated_at,completed_at').eq('profile_id', profileId).eq('job_id', jobId).maybeSingle();
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
