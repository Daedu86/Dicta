import { describe, expect, it } from 'vitest';
import {
  buildTrainingGenerationButtonNotice,
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
});
