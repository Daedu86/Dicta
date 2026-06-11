import type { Plugin } from 'vite';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createLocalDevEnvStore } from './localDevEnvStore';
import { createLocalDevApiValidation } from './localDevApiValidation';

const localOpenRouterJobs = new Map<string, {
  jobId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  request: Record<string, unknown>;
  result: unknown;
  error: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}>();

export function createDictaLocalDevApiPlugin(): Plugin {
  return {
  name: 'dicta-local-dev-api',
  configureServer(server) {
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    const localDevEnvStore = createLocalDevEnvStore(envLocalPath);
    const maxJsonBodyBytes = 64 * 1024;
    const maxOpenRouterKeyBytes = 4096;
    const maxOllamaKeyBytes = 4096;
    const openRouterFreeRouterModel = 'openrouter/free';
    const ollamaRecommendedModel = 'gemma3:27b-cloud';
    const openRouterPromptMaxChars = 32_000;
    const ollamaPromptMaxChars = 32_000;
    const openRouterModelMaxChars = 160;
    const ollamaModelMaxChars = 160;
    const openRouterActiveJobLimit = 3;
    const httpError = (message: string, statusCode: number): Error & { statusCode: number } =>
      Object.assign(new Error(message), { statusCode });

    const localDevApiValidation = createLocalDevApiValidation({
      httpError,
      maxOpenRouterKeyBytes,
      maxOllamaKeyBytes,
      openRouterFreeRouterModel,
      openRouterPromptMaxChars,
      ollamaPromptMaxChars,
      openRouterModelMaxChars,
      ollamaModelMaxChars,
    });

    const sendLocalError = (res: { statusCode: number; end: (body?: string) => void }, error: unknown, fallback: string): void => {
      const statusCode = Number((error as { statusCode?: unknown } | null)?.statusCode);
      res.statusCode = Number.isFinite(statusCode) ? statusCode : 500;
      res.end(error instanceof Error ? error.message : fallback);
    };

    const readRequestBody = async (req: NodeJS.ReadableStream, maxBytes: number): Promise<string> =>
      new Promise((resolve, reject) => {
        let data = '';
        let bytes = 0;
        let settled = false;
        const settle = (fn: () => void): void => {
          if (settled) return;
          settled = true;
          fn();
        };
        req.on('data', (chunk: Buffer | string) => {
          if (settled) return;
          bytes += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
          if (bytes > maxBytes) {
            settle(() => reject(httpError(`Request body too large. Limit is ${maxBytes} bytes.`, 413)));
            return;
          }
          data += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
        });
        req.on('end', () => settle(() => resolve(data)));
        req.on('error', (error) => settle(() => reject(error)));
      });

    const readJsonRequestBody = async <T>(req: NodeJS.ReadableStream, maxBytes: number): Promise<T> => {
      const body = await readRequestBody(req, maxBytes);
      try {
        return JSON.parse(body) as T;
      } catch {
        throw httpError('Invalid JSON request body.', 400);
      }
    };

    const maskApiKeySuffix = (value: string): string => {
      const trimmed = value.trim();
      if (!trimmed) return '';
      const suffixLength = 4;
      const suffix = trimmed.length > suffixLength ? trimmed.slice(-suffixLength) : trimmed;
      return `…${suffix}`;
    };

    const extractOllamaErrorText = (body: string): string => {
      const raw = body.trim();
      if (!raw) return '';
      try {
        const parsed = JSON.parse(raw) as { error?: string | { message?: string }; message?: string };
        const message =
          typeof parsed.error === 'string'
            ? parsed.error
            : parsed.error && typeof parsed.error === 'object' && typeof parsed.error.message === 'string'
              ? parsed.error.message
              : typeof parsed.message === 'string'
                ? parsed.message
                : '';
        if (message) return message;
      } catch {
        // Fall through to a short raw text excerpt.
      }
      return raw.slice(0, 500);
    };

    const formatOllamaUpstreamError = (status: number, body: string, fallback = 'Ollama Cloud request failed.'): string => {
      const detail = extractOllamaErrorText(body);
      if (status === 429) {
        return `Ollama Cloud rate/quota limit likely (429).${detail ? ` ${detail}` : ''}`;
      }
      if (status === 401 || status === 403) {
        return `Ollama Cloud auth/plan/access issue (${status}).${detail ? ` ${detail}` : ''}`;
      }
      return `${fallback} (${status}).${detail ? ` ${detail}` : ''}`;
    };

    const buildOllamaModelPayload = (rawPayload: { models?: Array<Record<string, unknown>> }): {
      data: Array<Record<string, unknown>>;
      source: string;
      recommendedModel: string;
    } => {
      const byId = new Map<string, Record<string, unknown>>();
      const rawModels = Array.isArray(rawPayload.models) ? rawPayload.models : [];
      for (const model of rawModels) {
        const id =
          typeof model.model === 'string' && model.model.trim()
            ? model.model.trim()
            : typeof model.name === 'string'
              ? model.name.trim()
              : '';
        if (!id) continue;
        byId.set(id, {
          id,
          name: typeof model.name === 'string' ? model.name : id,
          modified_at: typeof model.modified_at === 'string' ? model.modified_at : undefined,
          size: Number.isFinite(Number(model.size)) ? Number(model.size) : undefined,
          details: model.details && typeof model.details === 'object' ? model.details : undefined,
        });
      }
      if (!byId.has(ollamaRecommendedModel)) {
        byId.set(ollamaRecommendedModel, { id: ollamaRecommendedModel, name: ollamaRecommendedModel });
      }
      const data = [...byId.values()].sort((a, b) => {
        if (a.id === ollamaRecommendedModel) return -1;
        if (b.id === ollamaRecommendedModel) return 1;
        return String(a.id).localeCompare(String(b.id));
      });
      return { data, source: 'ollama', recommendedModel: ollamaRecommendedModel };
    };

    server.middlewares.use('/api/openrouter/models', async (req, res) => {
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end('Method not allowed');
        return;
      }

      const openRouterApiKey = await localDevEnvStore.getOpenRouterApiKey();
      if (!openRouterApiKey) {
        res.statusCode = 400;
        res.end('Missing OPENROUTER_API_KEY. Set it in .env.local (or via the OpenRouter UI) and try again.');
        return;
      }

      try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: {
            Authorization: `Bearer ${openRouterApiKey}`,
            'HTTP-Referer': (req.headers.origin as string | undefined) ?? 'http://localhost:5173',
            'X-Title': 'Dicta MVP (local)',
          },
        });

        const body = await response.text();
        res.statusCode = response.status;
        res.setHeader('Content-Type', response.headers.get('content-type') ?? 'application/json');
        res.end(body);
      } catch (error) {
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : 'OpenRouter proxy failed.');
      }
    });

    server.middlewares.use('/api/openrouter/key/status', async (req, res) => {
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end('Method not allowed');
        return;
      }

      try {
        const openRouterApiKey = await localDevEnvStore.getOpenRouterApiKey();
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ configured: Boolean(openRouterApiKey), suffix: maskApiKeySuffix(openRouterApiKey) }));
      } catch (error) {
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : 'OpenRouter key status failed.');
      }
    });

    server.middlewares.use('/api/openrouter/key', async (req, res) => {
      if (req.method === 'POST') {
        try {
          const parsed = await readJsonRequestBody<{ apiKey?: string }>(req, maxOpenRouterKeyBytes);
          const nextKey = parsed.apiKey?.trim() ?? '';
          if (!nextKey) {
            res.statusCode = 400;
            res.end('Missing apiKey.');
            return;
          }

          await localDevEnvStore.upsertOpenRouterApiKey(localDevApiValidation.validateOpenRouterApiKey(nextKey));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, suffix: maskApiKeySuffix(nextKey) }));
          return;
        } catch (error) {
          sendLocalError(res, error, 'Failed to save OpenRouter key.');
          return;
        }
      }

      if (req.method === 'DELETE') {
        try {
          const removed = await localDevEnvStore.removeOpenRouterApiKey();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, removed }));
          return;
        } catch (error) {
          res.statusCode = 500;
          res.end(error instanceof Error ? error.message : 'Failed to remove OpenRouter key.');
          return;
        }
      }

      res.statusCode = 405;
      res.end('Method not allowed');
    });

    server.middlewares.use('/api/ollama/models', async (req, res) => {
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end('Method not allowed');
        return;
      }

      const ollamaApiKey = await localDevEnvStore.getOllamaApiKey();
      if (!ollamaApiKey) {
        res.statusCode = 400;
        res.end('Missing OLLAMA_API_KEY. Set it in .env.local (or via the Ollama UI) and try again.');
        return;
      }

      try {
        const response = await fetch('https://ollama.com/api/tags', {
          headers: {
            Authorization: `Bearer ${ollamaApiKey}`,
            Accept: 'application/json',
          },
        });

        const responseBody = await response.text();
        if (!response.ok) {
          res.statusCode = response.status;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(formatOllamaUpstreamError(response.status, responseBody, 'Ollama Cloud model request failed'));
          return;
        }

        const payload = responseBody ? JSON.parse(responseBody) as { models?: Array<Record<string, unknown>> } : {};
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(buildOllamaModelPayload(payload)));
      } catch (error) {
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : 'Ollama proxy failed.');
      }
    });

    server.middlewares.use('/api/ollama/key/status', async (req, res) => {
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end('Method not allowed');
        return;
      }

      try {
        const ollamaApiKey = await localDevEnvStore.getOllamaApiKey();
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ configured: Boolean(ollamaApiKey), suffix: maskApiKeySuffix(ollamaApiKey) }));
      } catch (error) {
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : 'Ollama key status failed.');
      }
    });

    server.middlewares.use('/api/ollama/key', async (req, res) => {
      if (req.method === 'POST') {
        try {
          const parsed = await readJsonRequestBody<{ apiKey?: string }>(req, maxOllamaKeyBytes);
          const nextKey = parsed.apiKey?.trim() ?? '';
          if (!nextKey) {
            res.statusCode = 400;
            res.end('Missing apiKey.');
            return;
          }

          await localDevEnvStore.upsertOllamaApiKey(localDevApiValidation.validateOllamaApiKey(nextKey));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, suffix: maskApiKeySuffix(nextKey) }));
          return;
        } catch (error) {
          sendLocalError(res, error, 'Failed to save Ollama key.');
          return;
        }
      }

      if (req.method === 'DELETE') {
        try {
          const removed = await localDevEnvStore.removeOllamaApiKey();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, removed }));
          return;
        } catch (error) {
          res.statusCode = 500;
          res.end(error instanceof Error ? error.message : 'Failed to remove Ollama key.');
          return;
        }
      }

      res.statusCode = 405;
      res.end('Method not allowed');
    });

    server.middlewares.use('/api/ollama/chat', async (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end('Method not allowed');
        return;
      }

      const ollamaApiKey = await localDevEnvStore.getOllamaApiKey();
      if (!ollamaApiKey) {
        res.statusCode = 400;
        res.end('Missing OLLAMA_API_KEY. Set it in .env.local and try again.');
        return;
      }

      try {
        const parsed = await readJsonRequestBody<{ model?: string; prompt?: string; maxTokens?: number }>(req, maxJsonBodyBytes);
        const model = localDevApiValidation.normalizeOllamaModel(parsed.model);
        const prompt = localDevApiValidation.normalizeOllamaPrompt(parsed.prompt);
        const maxTokens = localDevApiValidation.normalizeOllamaMaxTokens(parsed.maxTokens, 600);
        if (!model || !prompt) {
          res.statusCode = 400;
          res.end('Missing model or prompt.');
          return;
        }

        const response = await fetch('https://ollama.com/api/chat', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ollamaApiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            stream: false,
            options: {
              num_predict: maxTokens,
            },
          }),
        });

        const responseBody = await response.text();
        res.statusCode = response.status;
        res.setHeader('X-Dicta-Ollama-Model', model);
        if (!response.ok) {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(formatOllamaUpstreamError(response.status, responseBody));
          return;
        }
        res.setHeader('Content-Type', response.headers.get('content-type') ?? 'application/json');
        res.end(responseBody);
      } catch (error) {
        sendLocalError(res, error, 'Ollama test request failed.');
      }
    });

    server.middlewares.use('/api/openrouter/chat', async (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end('Method not allowed');
        return;
      }

      const openRouterApiKey = await localDevEnvStore.getOpenRouterApiKey();
      if (!openRouterApiKey) {
        res.statusCode = 400;
        res.end('Missing OPENROUTER_API_KEY. Set it in .env.local and try again.');
        return;
      }

      try {
        const parsed = await readJsonRequestBody<{ model?: string; prompt?: string; maxTokens?: number }>(req, maxJsonBodyBytes);
        const model = localDevApiValidation.normalizeOpenRouterModel(parsed.model);
        const prompt = localDevApiValidation.normalizeOpenRouterPrompt(parsed.prompt);
        const maxTokens = localDevApiValidation.normalizeOpenRouterMaxTokens(parsed.maxTokens, 600);
        if (!model || !prompt) {
          res.statusCode = 400;
          res.end('Missing model or prompt.');
          return;
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': (req.headers.origin as string | undefined) ?? 'http://localhost:5173',
            'X-Title': 'Dicta MVP (local)',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
          }),
        });

        const responseBody = await response.text();
        res.statusCode = response.status;
        res.setHeader('Content-Type', response.headers.get('content-type') ?? 'application/json');
        res.end(responseBody);
      } catch (error) {
        sendLocalError(res, error, 'OpenRouter test request failed.');
      }
    });

    server.middlewares.use('/api/openrouter/jobs', async (req, res) => {
      if (req.method === 'GET') {
        const url = new URL(req.url ?? '', 'http://localhost');
        const jobId = url.searchParams.get('id') ?? '';
        const job = localOpenRouterJobs.get(jobId);
        if (!job) {
          res.statusCode = 404;
          res.end('OpenRouter job not found.');
          return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(job));
        return;
      }

      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end('Method not allowed');
        return;
      }

      const openRouterApiKey = await localDevEnvStore.getOpenRouterApiKey();
      if (!openRouterApiKey) {
        res.statusCode = 400;
        res.end('Missing OPENROUTER_API_KEY. Set it in .env.local and try again.');
        return;
      }

      try {
        const parsed = await readJsonRequestBody<{
          model?: string;
          prompt?: string;
          maxTokens?: number;
          inputMode?: string;
          language?: string;
          slotLabel?: string;
          durationMinutes?: number;
          targetDifficulty?: string;
        }>(req, maxJsonBodyBytes);
        const model = localDevApiValidation.normalizeOpenRouterModel(parsed.model);
        const prompt = localDevApiValidation.normalizeOpenRouterPrompt(parsed.prompt);
        if (!model || !prompt) {
          res.statusCode = 400;
          res.end('Missing model or prompt.');
          return;
        }
        const activeJobCount = [...localOpenRouterJobs.values()].filter((job) => job.status === 'queued' || job.status === 'running').length;
        if (activeJobCount >= openRouterActiveJobLimit) {
          res.statusCode = 429;
          res.end(`Too many active OpenRouter jobs. Wait for one of the ${openRouterActiveJobLimit} active jobs to finish.`);
          return;
        }

        const now = new Date().toISOString();
        const jobId = randomUUID();
        const durationMinutes = Number(parsed.durationMinutes);
        const fallbackMaxTokens = durationMinutes === 2 ? 1000 : durationMinutes === 3 ? 1300 : durationMinutes === 4 ? 1600 : 600;
        const maxTokens = localDevApiValidation.normalizeOpenRouterMaxTokens(parsed.maxTokens, fallbackMaxTokens);
        const requestPayload = {
          model,
          prompt,
          maxTokens,
          inputMode: parsed.inputMode,
          language: parsed.language,
          slotLabel: parsed.slotLabel,
          durationMinutes: parsed.durationMinutes,
          targetDifficulty: parsed.targetDifficulty,
        };
        const job = {
          jobId,
          status: 'queued' as const,
          request: requestPayload,
          result: null,
          error: '',
          createdAt: now,
          updatedAt: now,
          completedAt: null,
        };
        localOpenRouterJobs.set(jobId, job);

        void (async () => {
          const startedAt = new Date().toISOString();
          localOpenRouterJobs.set(jobId, { ...job, status: 'running', updatedAt: startedAt });
          try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${openRouterApiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': (req.headers.origin as string | undefined) ?? 'http://localhost:5173',
                'X-Title': 'Dicta MVP (local)',
              },
              body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: maxTokens,
              }),
            });
            const responseBody = await response.text();
            if (!response.ok) throw new Error(responseBody || `OpenRouter request failed (${response.status}).`);
            const payload = JSON.parse(responseBody) as { choices?: Array<{ message?: { content?: string } }> };
            const text = typeof payload.choices?.[0]?.message?.content === 'string' ? payload.choices[0].message.content : '';
            if (!text.trim()) throw new Error('OpenRouter returned an empty response.');
            const completedAt = new Date().toISOString();
            localOpenRouterJobs.set(jobId, {
              ...job,
              status: 'succeeded',
              result: { text, payload, model },
              updatedAt: completedAt,
              completedAt,
            });
          } catch (error) {
            const completedAt = new Date().toISOString();
            localOpenRouterJobs.set(jobId, {
              ...job,
              status: 'failed',
              error: error instanceof Error ? error.message : 'OpenRouter job failed.',
              updatedAt: completedAt,
              completedAt,
            });
          }
        })();

        res.statusCode = 202;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(job));
      } catch (error) {
        sendLocalError(res, error, 'OpenRouter job request failed.');
      }
    });

    server.middlewares.use('/api/admin/files', async (req, res) => {
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end('Method not allowed');
        return;
      }

      try {
        const folders = await Promise.all(
          [
            { label: 'Fixtures', relativePath: 'fixtures' },
            { label: 'Public assets', relativePath: 'public' },
          ].map(async (folder) => {
            const absolutePath = path.resolve(process.cwd(), folder.relativePath);
            const files = await listKnownFiles(absolutePath);
            return {
              label: folder.label,
              relativePath: folder.relativePath,
              absolutePath,
              exists: files !== null,
              fileCount: files?.length ?? 0,
              totalBytes: files?.reduce((sum, file) => sum + file.size, 0) ?? 0,
              wavCount: files?.filter((file) => file.ext === '.wav').length ?? 0,
              jsonCount: files?.filter((file) => file.ext === '.json').length ?? 0,
              transcriptCount: files?.filter((file) => file.name.toLowerCase().includes('transcript')).length ?? 0,
            };
          }),
        );

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ projectRoot: process.cwd(), folders }));
      } catch (error) {
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : 'Admin file inventory error');
      }
    });

  },
};
}

async function listKnownFiles(root: string): Promise<Array<{ name: string; ext: string; size: number }> | null> {
  try {
    const stat = await fs.stat(root);
    if (!stat.isDirectory()) {
      return null;
    }
  } catch {
    return null;
  }

  const found: Array<{ name: string; ext: string; size: number }> = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const stat = await fs.stat(absolutePath);
      found.push({
        name: entry.name,
        ext: path.extname(entry.name).toLowerCase(),
        size: stat.size,
      });
    }
  }

  await walk(root);
  return found;
}
