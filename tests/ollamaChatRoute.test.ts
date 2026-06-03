import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/ollama/chat.js';
import { normalizeOllamaModelId, readOllamaChatPayload } from '../api/ollama/_request.js';

function createLocalReq(body: unknown = {}) {
  return {
    method: 'POST',
    headers: { host: 'localhost:5173' },
    body,
  };
}

function createMockRes() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    send(body: unknown) {
      this.body = body;
      return this;
    },
    json(body: unknown) {
      this.headers['content-type'] = 'application/json';
      this.body = body;
      return this;
    },
  };
}

function useLocalLegacyProfile() {
  vi.stubEnv('VITE_SUPABASE_URL', '');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
}

describe('ollama chat route', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('accepts cloud model ids without requiring :free', () => {
    expect(normalizeOllamaModelId('  gemma3:27b-cloud  ')).toBe('gemma3:27b-cloud');
    expect(
      readOllamaChatPayload({
        model: 'gemma3:27b-cloud',
        prompt: 'Say hello.',
      }),
    ).toEqual({
      model: 'gemma3:27b-cloud',
      prompt: 'Say hello.',
      maxTokens: 600,
    });
  });

  it('rejects invalid model ids and missing prompts', () => {
    expect(() => normalizeOllamaModelId('bad model')).toThrow('Invalid Ollama model id.');
    expect(() => readOllamaChatPayload({ model: 'gemma3:27b-cloud', prompt: '' })).toThrow('Missing model or prompt.');
    expect(
      readOllamaChatPayload({
        model: 'gemma3:27b-cloud',
        prompt: 'Say hello.',
        maxTokens: 99999,
      }).maxTokens,
    ).toBe(1800);
  });

  it('fails closed when OLLAMA_API_KEY is missing', async () => {
    useLocalLegacyProfile();
    vi.stubEnv('OLLAMA_API_KEY', '');
    const res = createMockRes();

    await handler(createLocalReq({ model: 'gemma3:27b-cloud', prompt: 'Say hello.' }), res);

    expect(res.statusCode).toBe(500);
    expect(String(res.body)).toContain('Missing OLLAMA_API_KEY');
  });

  it('rejects requests missing model or prompt before calling upstream', async () => {
    useLocalLegacyProfile();
    vi.stubEnv('OLLAMA_API_KEY', 'ollama-test-key');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = createMockRes();

    await handler(createLocalReq({ model: 'gemma3:27b-cloud' }), res);

    expect(res.statusCode).toBe(400);
    expect(String(res.body)).toContain('Missing model or prompt.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts a non-streaming Ollama chat request and returns the upstream payload', async () => {
    useLocalLegacyProfile();
    vi.stubEnv('OLLAMA_API_KEY', 'ollama-test-key');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ model: 'gemma3:27b-cloud', message: { role: 'assistant', content: 'Hello.' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const res = createMockRes();

    await handler(createLocalReq({ model: 'gemma3:27b-cloud', prompt: 'Say hello.', maxTokens: 512 }), res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-dicta-ollama-model']).toBe('gemma3:27b-cloud');
    expect(JSON.parse(String(res.body)).message.content).toBe('Hello.');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ollama.com/api/chat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer ollama-test-key' }),
        body: expect.any(String),
      }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body).toMatchObject({
      model: 'gemma3:27b-cloud',
      stream: false,
      options: { num_predict: 512 },
    });
  });

  it.each([
    [401, 'auth/plan/access issue'],
    [403, 'auth/plan/access issue'],
    [429, 'rate/quota limit likely'],
  ])('preserves useful upstream %s messaging', async (status, expectedMessage) => {
    useLocalLegacyProfile();
    vi.stubEnv('OLLAMA_API_KEY', 'ollama-test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'upstream says no' } }), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const res = createMockRes();

    await handler(createLocalReq({ model: 'gemma3:27b-cloud', prompt: 'Say hello.' }), res);

    expect(res.statusCode).toBe(status);
    expect(String(res.body)).toContain(expectedMessage);
    expect(String(res.body)).toContain('upstream says no');
  });
});
