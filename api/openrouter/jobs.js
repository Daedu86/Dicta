import { randomUUID } from 'node:crypto';
import { waitUntil } from '@vercel/functions';
import {
  createSupabaseServiceClient,
  assertOpenRouterAccess,
  assertOpenRouterModelAllowed,
  resolveRequestProfile,
  sendApiError,
} from '../_supabaseProfile.js';
import { OPENROUTER_RATE_LIMIT_SCOPES, enforceOpenRouterRateLimit, getOpenRouterLimit } from './_security.js';
import { auditOpenRouterJobEvent } from './_jobAudit.js';
import {
  cleanupOldOpenRouterJobs,
  enforceActiveOpenRouterJobLimit,
  insertQueuedOpenRouterJob,
  normalizeOpenRouterJobRow,
  readOpenRouterJobRow,
} from './_jobPersistence.js';
import { readCreateJobPayload, resolveCreateJobPayloadForRequester } from './_jobPayload.js';
import { runOpenRouterJob } from './_jobRunner.js';

export { extractOpenRouterJobSessionJson } from './_jobJson.js';
export {
  formatOpenRouterJobProviderError,
  isRetryableOpenRouterJobResponse,
  resolveOpenRouterJobModelCandidates,
} from './_jobProvider.js';
export { readCreateJobPayload, resolveCreateJobPayloadForRequester } from './_jobPayload.js';

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
    await enforceOpenRouterRateLimit({
      supabase,
      requester,
      res,
      scope: OPENROUTER_RATE_LIMIT_SCOPES.jobs,
      limit: getOpenRouterLimit('jobs', requester),
    });
    await enforceActiveOpenRouterJobLimit(supabase, profileId);

    const jobId = randomUUID();
    const now = new Date().toISOString();
    await insertQueuedOpenRouterJob(supabase, { profileId, jobId, requestPayload, now });
    waitUntil(runOpenRouterJob({ req, supabase, requester, profileId, jobId, requestPayload }));
    res.status(202).json({
      jobId,
      status: 'queued',
      request: requestPayload,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode);
    await auditOpenRouterJobEvent(
      supabase,
      Number.isFinite(statusCode) && statusCode === 429 ? 'openrouter_job_rate_limited' : 'openrouter_job_rejected',
      requester,
      {
        statusCode: Number.isFinite(statusCode) ? statusCode : null,
        model: requestPayload?.model,
        reason: error instanceof Error ? error.message : 'OpenRouter job rejected.',
      },
    );
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

  const { data, error } = await readOpenRouterJobRow(supabase, { profileId, jobId });
  if (error) throw error;
  if (!data) {
    res.status(404).send('OpenRouter job not found.');
    return;
  }

  res.status(200).json(normalizeOpenRouterJobRow(data));
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
