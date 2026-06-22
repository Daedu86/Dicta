import { describe, expect, it } from 'vitest';

import type { DictationScript } from '../src/core/adaptive/dictationScriptValidation';
import type { ActiveOpenRouterJob } from '../src/core/openRouterJobs';
import {
  TRAINING_NOTIFICATION_URL,
  buildGeneratedTrainingSessionNotification,
} from '../src/core/trainingNotifications';

describe('training notifications', () => {
  it('builds a training deep-link notification for generated sessions', () => {
    const script = createScript({
      title: 'Ein entspannter Spaziergang im Park',
      language: 'de',
      difficulty: 'normal',
    });
    const job = createJob({
      jobId: 'job-123',
      slotLabel: 'Express intermediate direct session',
      durationMinutes: 1,
    });

    const notification = buildGeneratedTrainingSessionNotification(script, job);

    expect(notification.title).toBe('Dicta session ready');
    expect(notification.options.body).toContain('Stabilize DE');
    expect(notification.options.body).not.toContain('Express');
    expect(notification.options.body).toContain('Ein entspannter Spaziergang im Park');
    expect(notification.options.data).toMatchObject({
      url: TRAINING_NOTIFICATION_URL,
      jobId: 'job-123',
      slotLabel: 'Express intermediate direct session',
    });
    expect(notification.options.tag).toBe('dicta-session-ready-job-123');
  });

  it('labels hard direct sessions as challenge sessions', () => {
    const script = createScript({
      title: 'Philosophische Paradoxe',
      language: 'de',
      difficulty: 'hard',
    });
    const job = createJob({
      jobId: 'job-456',
      slotLabel: 'Advanced direct session',
      durationMinutes: 2,
    });

    const notification = buildGeneratedTrainingSessionNotification(script, job);

    expect(notification.options.body).toContain('Challenge DE');
    expect(notification.options.body).not.toContain('Standard');
    expect(notification.options.data).toMatchObject({ url: '/training' });
  });
});

function createScript(overrides: Partial<DictationScript>): DictationScript {
  return {
    title: 'Generated session',
    language: 'en',
    inputMode: 'browser-tts',
    difficulty: 'easy',
    estimatedDurationSec: 60,
    targetSkills: [],
    recommendedRateRange: [0.9, 1],
    recommendedPhraseSize: 'medium',
    recommendedPauseMs: 500,
    phrases: [],
    ...overrides,
  };
}

function createJob(overrides: Partial<ActiveOpenRouterJob>): ActiveOpenRouterJob {
  return {
    jobId: 'job',
    model: 'openrouter/free',
    slotLabel: 'Easy direct session',
    inputMode: 'browser-tts',
    language: 'en',
    durationMinutes: 2,
    origin: 'direct-training',
    startedAt: '2026-05-26T10:00:00.000Z',
    ...overrides,
  };
}
