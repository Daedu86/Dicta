import { afterEach, describe, expect, it, vi } from 'vitest';
import handler, { buildOllamaModelPayload } from '../api/ollama/models.js';

function createLocalReq() {
  return {
    method: 'GET',
    headers: { host: 'localhost:5173' },
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

describe('ollama models route', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('normalizes Ollama tags and keeps the recommended cloud model available', () => {
    expect(
      buildOllamaModelPayload({
        models: [
          {
            name: 'llama3.1:8b-cloud',
            model: 'llama3.1:8b-cloud',
            details: { parameter_size: '8B' },
          },
        ],
      }).data.map((model) => model.id),
    ).toEqual(['gemma3:27b-cloud', 'llama3.1:8b-cloud']);
  });

  it('fails closed when OLLAMA_API_KEY is missing', async () => {
    useLocalLegacyProfile();
    vi.stubEnv('OLLAMA_API_KEY', '');
    const res = createMockRes();

    await handler(createLocalReq(), res);

    expect(res.statusCode).toBe(500);
    expect(String(res.body)).toContain('Missing OLLAMA_API_KEY');
  });

  it('fetches tags from Ollama and returns normalized model data', async () => {
    useLocalLegacyProfile();
    vi.stubEnv('OLLAMA_API_KEY', 'ollama-test-key');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          models: [
            {
              name: 'gemma3:27b-cloud',
              model: 'gemma3:27b-cloud',
              details: { parameter_size: '27B' },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const res = createMockRes();

    await handler(createLocalReq(), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      data: [{ id: 'gemma3:27b-cloud', details: { parameter_size: '27B' } }],
      source: 'ollama',
      recommendedModel: 'gemma3:27b-cloud',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ollama.com/api/tags',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer ollama-test-key' }),
      }),
    );
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
        new Response(JSON.stringify({ error: 'quota or access problem' }), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const res = createMockRes();

    await handler(createLocalReq(), res);

    expect(res.statusCode).toBe(status);
    expect(String(res.body)).toContain(expectedMessage);
    expect(String(res.body)).toContain('quota or access problem');
  });
});
