import { describe, expect, it } from 'vitest';
import {
  extractOpenRouterJobSessionJson,
  formatOpenRouterJobProviderError,
  isRetryableOpenRouterJobResponse,
  readCreateJobPayload,
  resolveCreateJobPayloadForRequester,
  resolveOpenRouterJobModelCandidates,
} from '../api/openrouter/jobs.js';

const validScript = {
  title: 'Ein ruhiger Morgen',
  language: 'de',
  inputMode: 'browser-tts',
  difficulty: 'easy',
  estimatedDurationSec: 60,
  targetSkills: [],
  recommendedRateRange: [0.8, 0.85],
  recommendedPhraseSize: 'short',
  recommendedPauseMs: 1200,
  phrases: [
    {
      id: 'p01',
      text: 'Heute bereite ich das Frühstück langsam und aufmerksam vor.',
      boundaryType: 'clause',
      pauseAfterMs: 1200,
      canReplayIndependently: true,
      requiresContinuation: false,
      semanticCompleteness: 0.9,
      difficulty: 0.35,
      emphasisWords: [],
      intonationHint: 'neutral',
    },
  ],
};

describe('OpenRouter jobs route payload validation', () => {
  it('accepts French durable session generation jobs', () => {
    expect(
      readCreateJobPayload({
        model: 'openrouter/free',
        prompt: 'Generate a French Dicta session.',
        inputMode: 'browser-tts',
        language: 'fr',
        slotLabel: 'Session 1',
        durationMinutes: 2,
      }),
    ).toMatchObject({
      model: 'openrouter/free',
      maxTokens: 2600,
      inputMode: 'browser-tts',
      language: 'fr',
      slotLabel: 'Session 1',
      durationMinutes: 2,
    });
  });

  it('accepts canonical Portuguese CosyVoice cache durable session generation jobs', () => {
    expect(
      readCreateJobPayload({
        model: 'openrouter/free',
        prompt: 'Generate a Portuguese Dicta session.',
        inputMode: 'cosyvoice-cache',
        language: 'pt',
        slotLabel: 'Session PT',
        durationMinutes: 2,
      }),
    ).toMatchObject({
      model: 'openrouter/free',
      maxTokens: 2600,
      inputMode: 'cosyvoice-cache',
      language: 'pt',
      slotLabel: 'Session PT',
      durationMinutes: 2,
    });
  });

  it('normalizes legacy qwen-cloud durable session generation jobs', () => {
    expect(
      readCreateJobPayload({
        model: 'openrouter/free',
        prompt: 'Generate a Portuguese Dicta session.',
        inputMode: 'qwen-cloud',
        language: 'pt',
        slotLabel: 'Session PT',
        durationMinutes: 2,
      }),
    ).toMatchObject({
      model: 'openrouter/free',
      maxTokens: 2600,
      inputMode: 'cosyvoice-cache',
      legacyInputMode: 'qwen-cloud',
      language: 'pt',
      slotLabel: 'Session PT',
      durationMinutes: 2,
    });
  });

  it('accepts one-minute express durable generation jobs', () => {
    expect(
      readCreateJobPayload({
        model: 'openrouter/free',
        prompt: 'Generate a short express Dicta session.',
        inputMode: 'browser-tts',
        language: 'de',
        slotLabel: 'Express easy direct session',
        durationMinutes: 1,
      }),
    ).toMatchObject({
      maxTokens: 1800,
      slotLabel: 'Express easy direct session',
      durationMinutes: 1,
    });
  });

  it('accepts all six direct mobile generation button job payloads', () => {
    const buttonPayloads = [
      { slotLabel: 'Easy direct session', durationMinutes: 2, targetDifficulty: 'easy' },
      { slotLabel: 'Intermediate direct session', durationMinutes: 2, targetDifficulty: 'normal' },
      { slotLabel: 'Advanced direct session', durationMinutes: 2, targetDifficulty: 'hard' },
      { slotLabel: 'Express easy direct session', durationMinutes: 1, targetDifficulty: 'easy' },
      { slotLabel: 'Express intermediate direct session', durationMinutes: 1, targetDifficulty: 'normal' },
      { slotLabel: 'Express advanced direct session', durationMinutes: 1, targetDifficulty: 'hard' },
    ] as const;

    for (const payload of buttonPayloads) {
      expect(
        readCreateJobPayload({
          model: 'openrouter/free',
          prompt: `Generate ${payload.slotLabel}.`,
          inputMode: 'browser-tts',
          language: 'de',
          maxTokens: payload.durationMinutes === 1 ? 1800 : 2600,
          ...payload,
        }),
      ).toMatchObject({
        model: 'openrouter/free',
        inputMode: 'browser-tts',
        language: 'de',
        maxTokens: payload.durationMinutes === 1 ? 1800 : 2600,
        slotLabel: payload.slotLabel,
        durationMinutes: payload.durationMinutes,
        targetDifficulty: payload.targetDifficulty,
      });
    }
  });

  it('uses an assigned model when the client still requests the generic free router', () => {
    expect(
      resolveCreateJobPayloadForRequester(
        { assignedOpenRouterModel: 'meta-llama/llama-3.2-3b-instruct:free' },
        {
          model: 'openrouter/free',
          prompt: 'Generate a short express Dicta session.',
          inputMode: 'browser-tts',
          language: 'de',
          slotLabel: 'Express easy direct session',
          durationMinutes: 1,
        },
      ),
    ).toMatchObject({
      model: 'meta-llama/llama-3.2-3b-instruct:free',
      requestedModel: 'openrouter/free',
      slotLabel: 'Express easy direct session',
    });
  });

  it('keeps an explicitly requested concrete model unchanged', () => {
    expect(
      resolveCreateJobPayloadForRequester(
        { assignedOpenRouterModel: 'meta-llama/llama-3.2-3b-instruct:free' },
        {
          model: 'google/gemma-3n-e2b-it:free',
          prompt: 'Generate a short express Dicta session.',
          inputMode: 'browser-tts',
          language: 'de',
          slotLabel: 'Express easy direct session',
          durationMinutes: 1,
        },
      ),
    ).toMatchObject({
      model: 'google/gemma-3n-e2b-it:free',
    });
  });

  it('keeps an explicitly selected free model as the only durable job candidate', () => {
    expect(resolveOpenRouterJobModelCandidates('z-ai/glm-4.5-air:free')).toEqual(['z-ai/glm-4.5-air:free']);
  });

  it('does not add app-level fallback candidates to the generic free router', () => {
    expect(resolveOpenRouterJobModelCandidates('openrouter/free')).toEqual(['openrouter/free']);
  });

  it('extracts valid session JSON from prose before accepting a job result', () => {
    const extracted = extractOpenRouterJobSessionJson(`We need to produce JSON only.\n${JSON.stringify(validScript)}\nDone.`);
    expect(JSON.parse(extracted).title).toBe('Ein ruhiger Morgen');
  });

  it('repairs trailing commas before storing extracted session JSON', () => {
    const sloppyJson = JSON.stringify(validScript, null, 2)
      .replace('"intonationHint": "neutral"\n    }', '"intonationHint": "neutral",\n    }')
      .replace(/\n}$/, ',\n}');
    const extracted = extractOpenRouterJobSessionJson(`\`\`\`json\n${sloppyJson}\n\`\`\``);
    expect(JSON.parse(extracted).phrases[0].text).toBe(validScript.phrases[0].text);
  });

  it('extracts double-encoded session JSON returned as a JSON string', () => {
    const extracted = extractOpenRouterJobSessionJson(JSON.stringify(JSON.stringify(validScript)));
    expect(JSON.parse(extracted).inputMode).toBe('browser-tts');
  });

  it('extracts session JSON nested in a model wrapper string', () => {
    const extracted = extractOpenRouterJobSessionJson(
      JSON.stringify({
        reasoning: 'I will provide the final Dicta session JSON.',
        session_json: JSON.stringify(validScript),
      }),
    );
    expect(JSON.parse(extracted).title).toBe('Ein ruhiger Morgen');
  });

  it('rejects reasoning-only text without a valid session JSON object', () => {
    expect(
      extractOpenRouterJobSessionJson(
        'We need to produce JSON with specified fields. Let us craft about 12 phrases, each around 13 words.',
      ),
    ).toBe('');
  });

  it('treats OpenRouter 503 provider upstream failures as retryable', () => {
    expect(
      isRetryableOpenRouterJobResponse({
        ok: false,
        status: 503,
        body: JSON.stringify({
          error: {
            message: 'Provider returned error',
            code: 503,
            metadata: {
              raw: 'no healthy upstream',
              provider_name: 'OpenInference',
              is_byok: false,
            },
          },
          user_id: 'user_360ls8gD0nDOmwcRgJr92fqM1Fk',
        }),
      }),
    ).toBe(true);
  });

  it('formats transient provider failures without leaking OpenRouter user ids', () => {
    const message = formatOpenRouterJobProviderError(
      {
        ok: false,
        status: 503,
        body: JSON.stringify({
          error: {
            message: 'Provider returned error',
            code: 503,
            metadata: {
              raw: 'no healthy upstream',
              provider_name: 'OpenInference',
              is_byok: false,
            },
          },
          user_id: 'user_360ls8gD0nDOmwcRgJr92fqM1Fk',
        }),
      },
      [
        { attempt: 1, model: 'openai/gpt-oss-120b:free', status: 503, retryable: true },
        { attempt: 2, model: 'openai/gpt-oss-120b:free', status: 503, retryable: true },
        { attempt: 3, model: 'google/gemma-3n-e2b-it:free', status: 503, retryable: true },
      ],
    );

    expect(message).toContain('OpenRouter provider error (503 from OpenInference): no healthy upstream.');
    expect(message).toContain('Retried 2 times.');
    expect(message).toContain('Tried 2 models.');
    expect(message).not.toContain('user_360ls8gD0nDOmwcRgJr92fqM1Fk');
  });

  it('rejects unsupported durable job languages', () => {
    expect(() =>
      readCreateJobPayload({
        model: 'openrouter/free',
        prompt: 'Generate a session.',
        inputMode: 'browser-tts',
        language: 'it',
        slotLabel: 'Session 1',
        durationMinutes: 2,
      }),
    ).toThrow('Invalid language.');
  });

  it('rejects paid OpenRouter model ids before a job is created', () => {
    expect(() =>
      readCreateJobPayload({
        model: 'anthropic/claude-sonnet-4.5',
        prompt: 'Generate a session.',
        inputMode: 'browser-tts',
        language: 'fr',
        slotLabel: 'Session 1',
        durationMinutes: 2,
      }),
    ).toThrow('OpenRouter model must be openrouter/free or a :free model variant.');
  });

  it('bounds max token requests server-side', () => {
    expect(
      readCreateJobPayload({
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        prompt: 'Generate a session.',
        maxTokens: 99999,
        inputMode: 'browser-tts',
        language: 'fr',
        slotLabel: 'Session 1',
        durationMinutes: 4,
      }).maxTokens,
    ).toBe(4800);
  });

  it('rejects oversized prompts', () => {
    expect(() =>
      readCreateJobPayload({
        model: 'openrouter/free',
        prompt: 'x'.repeat(32001),
        inputMode: 'browser-tts',
        language: 'fr',
        slotLabel: 'Session 1',
        durationMinutes: 2,
      }),
    ).toThrow('Prompt is too large.');
  });
});
