import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  isStaleOpenRouterJobRow,
  settleStaleOpenRouterJob,
} from '../api/openrouter/_jobPersistence.js';
import {
  formatOpenRouterJobTimeoutError,
  OPENROUTER_JOB_STALE_AFTER_MS,
  OPENROUTER_JOB_TIMEOUT_MS,
} from '../api/openrouter/_jobRunner.js';

describe('OpenRouter job runner timeout', () => {
  it('leaves a persistence buffer inside the Vercel function window', () => {
    const vercelConfig = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
    const openRouterFunctionMaxDurationMs = vercelConfig.functions['api/openrouter/*.js'].maxDuration * 1000;

    expect(OPENROUTER_JOB_TIMEOUT_MS).toBeGreaterThanOrEqual(270_000);
    expect(OPENROUTER_JOB_TIMEOUT_MS).toBeLessThanOrEqual(openRouterFunctionMaxDurationMs - 15_000);
    expect(OPENROUTER_JOB_STALE_AFTER_MS).toBe(openRouterFunctionMaxDurationMs);
  });

  it('formats timeout failures without exposing the raw fetch abort message', () => {
    expect(formatOpenRouterJobTimeoutError('openai/gpt-oss-120b:free')).toBe(
      'Selected OpenRouter model "openai/gpt-oss-120b:free" timed out after 285 seconds so Dicta has time to persist a terminal job state before the 300-second Vercel function window. Use a shorter duration or a faster OpenRouter model/provider.',
    );
  });

  it('detects stale running rows after the function window has elapsed', () => {
    expect(isStaleOpenRouterJobRow({
      status: 'running',
      updated_at: '2026-06-25T08:12:00.000Z',
    }, Date.parse('2026-06-25T08:17:00.000Z'))).toBe(true);

    expect(isStaleOpenRouterJobRow({
      status: 'running',
      updated_at: '2026-06-25T08:12:00.000Z',
    }, Date.parse('2026-06-25T08:16:59.000Z'))).toBe(false);

    expect(isStaleOpenRouterJobRow({
      status: 'succeeded',
      updated_at: '2026-06-25T08:12:00.000Z',
    }, Date.parse('2026-06-25T08:22:00.000Z'))).toBe(false);
  });

  it('settles stale running jobs as failed timeout rows', async () => {
    const staleRow = {
      profile_id: 'profile-1',
      job_id: 'job-stale',
      status: 'running',
      request: { model: 'openai/gpt-oss-120b:free' },
      result: null,
      error: null,
      created_at: '2026-06-25T08:12:00.000Z',
      updated_at: '2026-06-25T08:12:00.000Z',
      completed_at: null,
    };
    const settledRow = {
      ...staleRow,
      status: 'failed',
      error: 'stale timeout',
      updated_at: '2026-06-25T08:17:01.000Z',
      completed_at: '2026-06-25T08:17:01.000Z',
    };
    const query = {
      update: vi.fn(() => query),
      eq: vi.fn(() => query),
      in: vi.fn(() => query),
      select: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: settledRow, error: null })),
    };
    const supabase = {
      from: vi.fn(() => query),
    };

    const result = await settleStaleOpenRouterJob(supabase, {
      profileId: 'profile-1',
      row: staleRow,
      now: new Date('2026-06-25T08:17:01.000Z'),
    });

    expect(result).toBe(settledRow);
    expect(supabase.from).toHaveBeenCalledWith('dicta_openrouter_jobs');
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      result: null,
      completed_at: '2026-06-25T08:17:01.000Z',
      error: expect.stringContaining('could not persist before the Vercel function window closed'),
    }));
    expect(query.eq).toHaveBeenCalledWith('profile_id', 'profile-1');
    expect(query.eq).toHaveBeenCalledWith('job_id', 'job-stale');
    expect(query.in).toHaveBeenCalledWith('status', ['queued', 'running']);
  });
});
