import type { DictaSyncState } from '../../src/core/supabaseSync';

export const baseState = (): DictaSyncState => ({
  sessions: [
    {
      id: 's1',
      updatedAt: '2026-05-01T10:00:00.000Z',
      inputMode: 'input2',
    },
  ],
  benchmarks: {
    'browser-tts': {
      en: {
        inputMode: 'browser-tts',
        language: 'en',
        lastUpdatedAt: '2026-05-01T10:00:00.000Z',
      },
    },
  },
  feedback: {
    'browser-tts': {
      en: [
        {
          sessionId: 's1',
          inputMode: 'browser-tts',
          language: 'en',
          createdAt: '2026-05-01T10:00:00.000Z',
          completedAt: '2026-05-01T10:05:00.000Z',
        },
      ],
    },
  },
});
