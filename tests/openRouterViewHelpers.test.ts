import { describe, expect, it } from 'vitest';
import {
  buildTrainingGenerationButtonNotice,
  buildTrainingGenerationButtonNoticeList,
  formatOpenRouterJobNotifications,
} from '../src/components/openrouter/openRouterViewHelpers';
import type { ActiveOpenRouterJob } from '../src/core/openRouterJobs';

describe('OpenRouter view helpers', () => {
  it('formats legacy express job notifications with canonical mode labels', () => {
    const message = formatOpenRouterJobNotifications({
      'job-1': {
        jobId: 'job-1',
        slotLabel: 'Express intermediate direct session',
        model: 'openrouter/free',
        startedAt: '2026-06-15T10:00:00.000Z',
        status: 'succeeded',
        completedAt: '2026-06-15T10:00:04.000Z',
      },
    });

    expect(message).toContain('Stabilize session finished');
    expect(message).not.toContain('Express');
  });

  it('matches legacy express active jobs to the canonical standard button notice', () => {
    const activeJobs: ActiveOpenRouterJob[] = [
      {
        jobId: 'job-1',
        model: 'openrouter/free',
        slotLabel: 'Express easy direct session',
        inputMode: 'browser-tts',
        language: 'de',
        durationMinutes: 1,
        targetDifficulty: 'easy',
        origin: 'direct-training',
        startedAt: '2026-06-15T10:00:00.000Z',
      },
    ];

    const notice = buildTrainingGenerationButtonNotice({
      slotLabel: 'Easy direct session',
      displayLabel: 'Precision session',
      notices: {},
      jobNotifications: {},
      activeJobs,
      nowMs: Date.parse('2026-06-15T10:00:05.000Z'),
    });

    expect(notice?.message).toContain('Precision session is being created');
    expect(notice?.message).not.toContain('Express');
  });

  it('keeps separate notice rows per job and formats canceled jobs', () => {
    const notices = buildTrainingGenerationButtonNoticeList({
      slotLabel: 'Adaptive direct session',
      displayLabel: 'Adaptive session',
      notices: {},
      jobNotifications: {
        'job-1': {
          jobId: 'job-1',
          slotLabel: 'Adaptive direct session',
          model: 'openrouter/free',
          startedAt: '2026-06-15T10:00:00.000Z',
          status: 'canceled',
          completedAt: '2026-06-15T10:01:00.000Z',
        },
      },
      activeJobs: [
        {
          jobId: 'job-2',
          model: 'openrouter/free',
          slotLabel: 'Adaptive direct session',
          inputMode: 'browser-tts',
          language: 'de',
          durationMinutes: 6,
          origin: 'direct-training',
          startedAt: '2026-06-15T10:01:30.000Z',
        },
      ],
      nowMs: Date.parse('2026-06-15T10:02:00.000Z'),
    });

    expect(notices.map((notice) => notice.id)).toEqual(['job-2', 'job-1']);
    expect(notices[0].message).toBe('Adaptive session is being created... elapsed 30.00s.');
    expect(notices[1].message).toBe('Adaptive session canceled after 60.00s.');
  });
});
