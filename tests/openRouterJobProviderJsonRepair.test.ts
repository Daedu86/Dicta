import { afterEach, describe, expect, it, vi } from 'vitest';
import { postChatCompletionWithSelectedModelRetries } from '../api/openrouter/_jobProvider.js';
import { validScript } from './helpers/openRouterJobFixtures';

function openRouterResponse(content: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: () => 'application/json',
    },
    text: async () => JSON.stringify({
      choices: [
        {
          message: {
            content,
          },
        },
      ],
    }),
  };
}

function request() {
  return {
    headers: {
      origin: 'https://dicta.test',
    },
  };
}

describe('OpenRouter job provider JSON repair', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests deterministic JSON-only job output from OpenRouter', async () => {
    const fetchMock = vi.fn(async () => openRouterResponse(JSON.stringify(validScript)));
    vi.stubGlobal('fetch', fetchMock);

    const response = await postChatCompletionWithSelectedModelRetries({
      apiKey: 'openrouter-key',
      req: request(),
      model: 'provider/json-model:free',
      prompt: 'Generate a Dicta session.',
      maxTokens: 1800,
      timeoutMs: 1000,
    });

    expect(response.ok).toBe(true);
    expect(response.scriptText).toContain('"title": "Ein ruhiger Morgen"');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      model: 'provider/json-model:free',
      max_tokens: 1800,
      temperature: 0,
      include_reasoning: false,
      reasoning: {
        effort: 'low',
        exclude: true,
      },
    });
    expect(body.messages[0]).toMatchObject({
      role: 'system',
    });
    expect(body.messages[0].content).toContain('Return exactly one valid JSON object');
  });

  it('repairs a successful provider response that lacks valid session JSON', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(openRouterResponse('I will think through the session first, then provide JSON later.'))
      .mockResolvedValueOnce(openRouterResponse(JSON.stringify(validScript)));
    vi.stubGlobal('fetch', fetchMock);

    const response = await postChatCompletionWithSelectedModelRetries({
      apiKey: 'openrouter-key',
      req: request(),
      model: 'openai/gpt-oss-120b:free',
      prompt: 'Generate a Dicta session.',
      maxTokens: 1800,
      timeoutMs: 1000,
    });

    expect(response.ok).toBe(true);
    expect(response.jsonRepairApplied).toBe(true);
    expect(JSON.parse(response.scriptText).inputMode).toBe('browser-tts');
    expect(response.attempts.map((attempt) => attempt.phase)).toEqual(['generate', 'json-repair']);
    expect(response.attempts.map((attempt) => attempt.jsonValid)).toEqual([false, true]);
    const [, repairInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    const repairBody = JSON.parse(String(repairInit.body));
    expect(repairBody.messages[1].content).toContain('Previous invalid response excerpt:');
    expect(repairBody.messages[1].content).toContain('provide JSON later');
  });
});
