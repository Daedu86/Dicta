import type { Plugin } from 'vite';
import path from 'node:path';
import { createLocalDevEnvStore } from './localDevEnvStore';
import { createLocalDevApiValidation } from './localDevApiValidation';
import { buildLocalDevAdminFileInventory } from './localDevAdminFiles';
import { createLocalDevOllamaHelpers } from './localDevOllamaHelpers';
import {
  createLocalDevHttpError,
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
import { registerLocalDevApiKeyRoutes } from './localDevApiKeyRoutes';
import { registerLocalDevModelRoutes } from './localDevModelRoutes';
import { registerLocalDevChatRoutes } from './localDevChatRoutes';

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

    registerLocalDevModelRoutes({
      server,
      getOpenRouterApiKey: () => localDevEnvStore.getOpenRouterApiKey(),
      getOllamaApiKey: () => localDevEnvStore.getOllamaApiKey(),
      formatOllamaUpstreamError: (status, body, fallback) =>
        localDevOllamaHelpers.formatOllamaUpstreamError(status, body, fallback),
      buildOllamaModelPayload: (payload) => localDevOllamaHelpers.buildOllamaModelPayload(payload),
    });

    registerLocalDevApiKeyRoutes({
      server,
      basePath: '/api/openrouter/key',
      providerLabel: 'OpenRouter',
      maxKeyBytes: maxOpenRouterKeyBytes,
      getApiKey: () => localDevEnvStore.getOpenRouterApiKey(),
      upsertApiKey: (apiKey) => localDevEnvStore.upsertOpenRouterApiKey(apiKey),
      removeApiKey: () => localDevEnvStore.removeOpenRouterApiKey(),
      validateApiKey: (apiKey) => localDevApiValidation.validateOpenRouterApiKey(apiKey),
    });

    registerLocalDevApiKeyRoutes({
      server,
      basePath: '/api/ollama/key',
      providerLabel: 'Ollama',
      maxKeyBytes: maxOllamaKeyBytes,
      getApiKey: () => localDevEnvStore.getOllamaApiKey(),
      upsertApiKey: (apiKey) => localDevEnvStore.upsertOllamaApiKey(apiKey),
      removeApiKey: () => localDevEnvStore.removeOllamaApiKey(),
      validateApiKey: (apiKey) => localDevApiValidation.validateOllamaApiKey(apiKey),
    });

    registerLocalDevChatRoutes({
      server,
      maxJsonBodyBytes,
      getOllamaApiKey: () => localDevEnvStore.getOllamaApiKey(),
      getOpenRouterApiKey: () => localDevEnvStore.getOpenRouterApiKey(),
      normalizeOllamaModel: (value) => localDevApiValidation.normalizeOllamaModel(value),
      normalizeOllamaPrompt: (value) => localDevApiValidation.normalizeOllamaPrompt(value),
      normalizeOllamaMaxTokens: (value, fallback) =>
        localDevApiValidation.normalizeOllamaMaxTokens(value, fallback),
      normalizeOpenRouterModel: (value) => localDevApiValidation.normalizeOpenRouterModel(value),
      normalizeOpenRouterPrompt: (value) => localDevApiValidation.normalizeOpenRouterPrompt(value),
      normalizeOpenRouterMaxTokens: (value, fallback) =>
        localDevApiValidation.normalizeOpenRouterMaxTokens(value, fallback),
      formatOllamaUpstreamError: (status, body, fallback) =>
        localDevOllamaHelpers.formatOllamaUpstreamError(status, body, fallback),
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
