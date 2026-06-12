import type { Plugin } from 'vite';
import path from 'node:path';
import { createLocalDevEnvStore } from './localDevEnvStore';
import { createLocalDevApiValidation } from './localDevApiValidation';
import { buildLocalDevAdminFileInventory } from './localDevAdminFiles';
import { createLocalDevOllamaHelpers } from './localDevOllamaHelpers';
import { fetchLocalDevOllamaChat, fetchLocalDevOllamaModels } from './localDevOllamaClient';
import {
  createLocalDevHttpError,
  maskLocalDevApiKeySuffix,
  readLocalDevJsonRequestBody,
  sendLocalDevError,
} from './localDevHttpHelpers';
import {
  countActiveLocalOpenRouterJobs,
  createQueuedLocalOpenRouterJob,
  getLocalOpenRouterJob,
  markLocalOpenRouterJobFailed,
  markLocalOpenRouterJobRunning,
  markLocalOpenRouterJobSucceeded,
} from './localDevOpenRouterJobs';
import { fetchLocalDevOpenRouterChatCompletion } from './localDevOpenRouterClient';

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
    const localDevApiValidation = createLocalDevApiValidation({
      httpError: createLocalDevHttpError,
      maxOpenRouterKeyBytes,
      maxOllamaKeyBytes,
      openRouterFreeRouterModel,
      openRouterPromptMaxChars,
      ollamaPromptMaxChars,
      openRouterModelMaxChars,
      ollamaModelMaxChars,
    });

    const localDevOllamaHelpers = createLocalDevOllamaHelpers(ollamaRecommendedModel);

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
        res.end(JSON.stringify({ configured: Boolean(openRouterApiKey), suffix: maskLocalDevApiKeySuffix(openRouterApiKey) }));
      } catch (error) {
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : 'OpenRouter key status failed.');
      }
    });

    server.middlewares.use('/api/openrouter/key', async (req, res) => {
      if (req.method === 'POST') {
        try {
          const parsed = await readLocalDevJsonRequestBody<{ apiKey?: string }>(req, maxOpenRouterKeyBytes);
          const nextKey = parsed.apiKey?.trim() ?? '';
          if (!nextKey) {
            res.statusCode = 400;
            res.end('Missing apiKey.');
            return;
          }

          await localDevEnvStore.upsertOpenRouterApiKey(localDevApiValidation.validateOpenRouterApiKey(nextKey));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, suffix: maskLocalDevApiKeySuffix(nextKey) }));
          return;
        } catch (error) {
          sendLocalDevError(res, error, 'Failed to save OpenRouter key.');
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
        const response = await fetchLocalDevOllamaModels(ollamaApiKey);

        const responseBody = await response.text();
        if (!response.ok) {
          res.statusCode = response.status;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(localDevOllamaHelpers.formatOllamaUpstreamError(response.status, responseBody, 'Ollama Cloud model request failed'));
          return;
        }

        const payload = responseBody ? JSON.parse(responseBody) as { models?: Array<Record<string, unknown>> } : {};
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(localDevOllamaHelpers.buildOllamaModelPayload(payload)));
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
        res.end(JSON.stringify({ configured: Boolean(ollamaApiKey), suffix: maskLocalDevApiKeySuffix(ollamaApiKey) }));
      } catch (error) {
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : 'Ollama key status failed.');
      }
    });

    server.middlewares.use('/api/ollama/key', async (req, res) => {
      if (req.method === 'POST') {
        try {
          const parsed = await readLocalDevJsonRequestBody<{ apiKey?: string }>(req, maxOllamaKeyBytes);
          const nextKey = parsed.apiKey?.trim() ?? '';
          if (!nextKey) {
            res.statusCode = 400;
            res.end('Missing apiKey.');
            return;
          }

          await localDevEnvStore.upsertOllamaApiKey(localDevApiValidation.validateOllamaApiKey(nextKey));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, suffix: maskLocalDevApiKeySuffix(nextKey) }));
          return;
        } catch (error) {
          sendLocalDevError(res, error, 'Failed to save Ollama key.');
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
        const parsed = await readLocalDevJsonRequestBody<{ model?: string; prompt?: string; maxTokens?: number }>(req, maxJsonBodyBytes);
        const model = localDevApiValidation.normalizeOllamaModel(parsed.model);
        const prompt = localDevApiValidation.normalizeOllamaPrompt(parsed.prompt);
        const maxTokens = localDevApiValidation.normalizeOllamaMaxTokens(parsed.maxTokens, 600);
        if (!model || !prompt) {
          res.statusCode = 400;
          res.end('Missing model or prompt.');
          return;
        }

        const response = await fetchLocalDevOllamaChat({
          apiKey: ollamaApiKey,
          model,
          prompt,
          maxTokens,
        });

        const responseBody = await response.text();
        res.statusCode = response.status;
        res.setHeader('X-Dicta-Ollama-Model', model);
        if (!response.ok) {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(localDevOllamaHelpers.formatOllamaUpstreamError(response.status, responseBody));
          return;
        }
        res.setHeader('Content-Type', response.headers.get('content-type') ?? 'application/json');
        res.end(responseBody);
      } catch (error) {
        sendLocalDevError(res, error, 'Ollama test request failed.');
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
        const parsed = await readLocalDevJsonRequestBody<{ model?: string; prompt?: string; maxTokens?: number }>(req, maxJsonBodyBytes);
        const model = localDevApiValidation.normalizeOpenRouterModel(parsed.model);
        const prompt = localDevApiValidation.normalizeOpenRouterPrompt(parsed.prompt);
        const maxTokens = localDevApiValidation.normalizeOpenRouterMaxTokens(parsed.maxTokens, 600);
        if (!model || !prompt) {
          res.statusCode = 400;
          res.end('Missing model or prompt.');
          return;
        }

        const response = await fetchLocalDevOpenRouterChatCompletion({
          apiKey: openRouterApiKey,
          origin: req.headers.origin as string | undefined,
          model,
          prompt,
          maxTokens,
        });

        const responseBody = await response.text();
        res.statusCode = response.status;
        res.setHeader('Content-Type', response.headers.get('content-type') ?? 'application/json');
        res.end(responseBody);
      } catch (error) {
        sendLocalDevError(res, error, 'OpenRouter test request failed.');
      }
    });

    server.middlewares.use('/api/openrouter/jobs', async (req, res) => {
      if (req.method === 'GET') {
        const url = new URL(req.url ?? '', 'http://localhost');
        const jobId = url.searchParams.get('id') ?? '';
        const job = getLocalOpenRouterJob(jobId);
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
        const parsed = await readLocalDevJsonRequestBody<{
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
        const activeJobCount = countActiveLocalOpenRouterJobs();
        if (activeJobCount >= openRouterActiveJobLimit) {
          res.statusCode = 429;
          res.end(`Too many active OpenRouter jobs. Wait for one of the ${openRouterActiveJobLimit} active jobs to finish.`);
          return;
        }

        const durationMinutes = Number(parsed.durationMinutes);
        const fallbackMaxTokens = durationMinutes === 2 ? 1000 : durationMinutes === 3 ? 1300 : durationMinutes === 4 ? 1600 : 600;
        const maxTokens = localDevApiValidation.normalizeOpenRouterMaxTokens(parsed.maxTokens, fallbackMaxTokens);
        const job = createQueuedLocalOpenRouterJob({
          model,
          prompt,
          maxTokens,
          inputMode: parsed.inputMode,
          language: parsed.language,
          slotLabel: parsed.slotLabel,
          durationMinutes: parsed.durationMinutes,
          targetDifficulty: parsed.targetDifficulty,
        });

        void (async () => {
          markLocalOpenRouterJobRunning(job);
          try {
            const response = await fetchLocalDevOpenRouterChatCompletion({
              apiKey: openRouterApiKey,
              origin: req.headers.origin as string | undefined,
              model,
              prompt,
              maxTokens,
            });
            const responseBody = await response.text();
            if (!response.ok) throw new Error(responseBody || `OpenRouter request failed (${response.status}).`);
            const payload = JSON.parse(responseBody) as { choices?: Array<{ message?: { content?: string } }> };
            const text = typeof payload.choices?.[0]?.message?.content === 'string' ? payload.choices[0].message.content : '';
            if (!text.trim()) throw new Error('OpenRouter returned an empty response.');
            markLocalOpenRouterJobSucceeded(job, { text, payload, model });
          } catch (error) {
            markLocalOpenRouterJobFailed(job, error);
          }
        })();

        res.statusCode = 202;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(job));
      } catch (error) {
        sendLocalDevError(res, error, 'OpenRouter job request failed.');
      }
    });

    server.middlewares.use('/api/admin/files', async (req, res) => {
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end('Method not allowed');
        return;
      }

      try {
        const inventory = await buildLocalDevAdminFileInventory(process.cwd());
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(inventory));
      } catch (error) {
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : 'Admin file inventory error');
      }
    });

  },
};
}
