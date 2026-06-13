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

function getRequiredEnv(name) {
  const value = process.env[name]?.trim() ?? '';
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonCandidate(value, depth = 0) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.replace(/^\uFEFF/, '').trim();
  const candidates = [...new Set([text, removeTrailingJsonCommas(text)].filter(Boolean))];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (depth < 1 && typeof parsed === 'string') {
        const nested = parseJsonCandidate(parsed, depth + 1);
        if (nested !== null) return nested;
      }
      return parsed;
    } catch {
      // Try the next repaired candidate.
    }
  }
  return null;
}

function tryParseJson(value) {
  return parseJsonCandidate(value);
}

function removeTrailingJsonCommas(value) {
  let output = '';
  let inString = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (inString) {
      output += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }
    if (char === ',') {
      let nextIndex = index + 1;
      while (nextIndex < value.length && /\s/.test(value[nextIndex])) nextIndex += 1;
      if (value[nextIndex] === '}' || value[nextIndex] === ']') continue;
    }
    output += char;
  }
  return output;
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
  const model = typeof primaryModel === 'string' ? primaryModel.trim() : '';
  return model ? [model] : [];
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
  const summary = raw || message || response?.scriptError || `OpenRouter request failed (${statusLabel}).`;
  const provider = providerName ? ` from ${providerName}` : '';
  const retryCount = Math.max(0, attempts.length - 1);
  const retryText = retryCount > 0 ? ` Retried ${retryCount} time${retryCount === 1 ? '' : 's'}.` : '';
  const modelCount = new Set(attempts.map((attempt) => attempt.model).filter(Boolean)).size;
  const modelText = modelCount > 1 ? ` Tried ${modelCount} models.` : '';
  const punctuatedSummary = /[.!?]$/.test(summary) ? summary : `${summary}.`;
  return `OpenRouter provider error (${statusLabel}${provider}): ${punctuatedSummary}${retryText}${modelText}`;
}

function stripMarkdownJsonFence(raw) {
  const text = String(raw ?? '').trim();
  const fenced = text.match(/^```\s*(?:json|jsonc)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1] ?? text;
}

function collectJsonObjectCandidates(raw) {
  const text = stripMarkdownJsonFence(raw);
  const candidates = [];
  for (let start = text.indexOf('{'); start >= 0; start = text.indexOf('{', start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === '{') {
        depth += 1;
        continue;
      }
      if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          candidates.push(text.slice(start, index + 1));
          break;
        }
      }
    }
  }
  return [...new Set([String(raw ?? '').trim(), text.trim(), ...candidates].filter(Boolean))];
}

function isValidSessionScript(value) {
  if (!value || typeof value !== 'object') return false;
  const script = value;
  return (
    typeof script.title === 'string' &&
    typeof script.language === 'string' &&
    typeof script.inputMode === 'string' &&
    Array.isArray(script.phrases) &&
    script.phrases.length > 0 &&
    script.phrases.every((phrase) => phrase && typeof phrase === 'object' && typeof phrase.text === 'string' && phrase.text.trim().length > 0)
  );
}

function findValidSessionScript(value, depth = 0) {
  if (isValidSessionScript(value)) return value;
  if (depth >= 4) return null;

  if (typeof value === 'string') {
    const parsed = tryParseJson(value);
    if (parsed !== null && parsed !== value) return findValidSessionScript(parsed, depth + 1);
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findValidSessionScript(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      const found = findValidSessionScript(item, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

function extractValidSessionScriptJson(raw) {
  for (const candidate of collectJsonObjectCandidates(raw)) {
    const parsed = tryParseJson(candidate);
    const script = findValidSessionScript(parsed);
    if (script) return JSON.stringify(script, null, 2);
  }
  return '';
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

async function postChatCompletionWithSelectedModelRetries({ apiKey, req, model, prompt, maxTokens, timeoutMs }) {
  const allAttempts = [];
  let lastResponse = null;
  let receivedSuccessfulResponse = false;
  for (const candidateModel of buildOpenRouterJobModelCandidates(model)) {
    const response = await postChatCompletionWithRetries({ apiKey, req, model: candidateModel, prompt, maxTokens, timeoutMs });
    allAttempts.push(...response.attempts);
    lastResponse = { ...response, attempts: allAttempts };

    if (!response.ok) {
      if (!isRetryableOpenRouterJobResponse(response)) break;
      continue;
    }

    receivedSuccessfulResponse = true;
    let payload = null;
    payload = tryParseJson(response.body);
    const text = typeof payload?.choices?.[0]?.message?.content === 'string' ? payload.choices[0].message.content : '';
    const scriptText = extractValidSessionScriptJson(text);
    const latestAttempt = allAttempts[allAttempts.length - 1];
    if (latestAttempt) latestAttempt.jsonValid = Boolean(scriptText);
    if (scriptText) return { ...response, attempts: allAttempts, model: candidateModel, payload, scriptText };
  }

  if (lastResponse && !receivedSuccessfulResponse) {
    return lastResponse;
  }

  return {
    ...(lastResponse ?? {}),
    ok: false,
    status: 422,
    attempts: allAttempts,
    scriptError: `OpenRouter returned text without valid session JSON for selected model "${model}".`,
  };
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

export function extractOpenRouterJobSessionJson(raw) {
  return extractValidSessionScriptJson(raw);
}

async function auditOpenRouterJobEvent(supabase, eventType, requester, details = {}) {
  await auditSecurityEvent(supabase, { eventType, profileId: requester?.profileId, role: requester?.role, severity: details.severity ?? 'warn', statusCode: details.statusCode, route: JOB_ROUTE, model: details.model, reason: details.reason, metadata: details.metadata });
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
    const response = await postChatCompletionWithSelectedModelRetries({ apiKey: getRequiredEnv('OPENROUTER_API_KEY'), req, model: requestPayload.model, prompt: requestPayload.prompt, maxTokens: requestPayload.maxTokens, timeoutMs: 290_000 });
    if (!response.ok) throw Object.assign(new Error(formatOpenRouterJobProviderError(response, response.attempts)), { statusCode: response.status, providerError: true, providerAttempts: response.attempts });
    const text = response.scriptText;
    if (!text?.trim()) throw new Error('OpenRouter returned no valid session JSON.');
    const completedAt = new Date().toISOString();
    await supabase.from(JOB_TABLE).update({ status: 'succeeded', result: { text, payload: response.payload, model: response.model || requestPayload.model, requestedModel: requestPayload.model, contentType: response.contentType, attempts: response.attempts }, error: null, updated_at: completedAt, completed_at: completedAt }).eq('profile_id', profileId).eq('job_id', jobId);
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
    requester = await resolveRequestProfile(req);
    assertOpenRouterAccess(requester);
    const { profileId } = requester;
    requestPayload = resolveCreateJobPayloadForRequester(requester, req.body);
    assertOpenRouterModelAllowed(requester, requestPayload.model);
    await cleanupOldOpenRouterJobs(supabase, profileId);
    await enforceOpenRouterRateLimit({ supabase, requester, res, scope: OPENROUTER_RATE_LIMIT_SCOPES.jobs, limit: getOpenRouterLimit('jobs', requester) });
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
  const requester = await resolveRequestProfile(req);
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
