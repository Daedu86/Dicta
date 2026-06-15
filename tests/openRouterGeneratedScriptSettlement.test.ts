import { describe, expect, it, vi } from 'vitest';

import type { DictationScript } from '../src/core/adaptive/dictationScriptValidation';
import type { ActiveOpenRouterJob } from '../src/core/openRouterJobs';
import type { TrainingSessionNotificationPayload } from '../src/core/trainingNotifications';
import { settleOpenRouterGeneratedScript } from '../src/app/useOpenRouterGeneratedScriptSettlement';

describe('OpenRouter generated script settlement', () => {
  it('creates a generated OpenRouter session and shows the ready notification', () => {
    const script = createScript({ title: 'Generated German session', language: 'de' });
    const trackedJob = createJob({ jobId: 'job-123', slotLabel: 'Express easy direct session' });
    const notification: TrainingSessionNotificationPayload = {
      title: 'Dicta session ready',
      options: {
        body: 'Generated session ready',
        tag: 'dicta-session-ready-job-123',
      },
    };
    const createSessionFromOpenRouterScript = vi.fn();
    const buildNotification = vi.fn(() => notification);
    const showNotification = vi.fn(() => Promise.resolve(true));

    settleOpenRouterGeneratedScript(script, trackedJob, {
      createSessionFromOpenRouterScript,
      buildNotification,
      showNotification,
    });

    expect(createSessionFromOpenRouterScript).toHaveBeenCalledWith(script, {
      navigateToLeaderboard: false,
      generationOrigin: 'openrouter',
    });
    expect(buildNotification).toHaveBeenCalledWith(script, trackedJob);
    expect(showNotification).toHaveBeenCalledWith(notification);
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
