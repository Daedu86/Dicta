import type { Plugin } from 'vite';
import path from 'node:path';
import { createLocalDevEnvStore } from './localDevEnvStore';
import { createLocalDevApiValidation } from './localDevApiValidation';
import { buildLocalDevAdminFileInventory } from './localDevAdminFiles';
import { createLocalDevOllamaHelpers } from './localDevOllamaHelpers';
import { createLocalDevHttpError } from './localDevHttpHelpers';
import { registerLocalDevApiKeyRoutes } from './localDevApiKeyRoutes';
import { registerLocalDevModelRoutes } from './localDevModelRoutes';
import { registerLocalDevChatRoutes } from './localDevChatRoutes';
import { registerLocalDevOpenRouterJobRoutes } from './localDevOpenRouterJobRoutes';

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

    registerLocalDevOpenRouterJobRoutes({
      server,
      maxJsonBodyBytes,
      activeJobLimit: openRouterActiveJobLimit,
      getOpenRouterApiKey: () => localDevEnvStore.getOpenRouterApiKey(),
      normalizeOpenRouterModel: (value) => localDevApiValidation.normalizeOpenRouterModel(value),
      normalizeOpenRouterPrompt: (value) => localDevApiValidation.normalizeOpenRouterPrompt(value),
      normalizeOpenRouterMaxTokens: (value, fallback) =>
        localDevApiValidation.normalizeOpenRouterMaxTokens(value, fallback),
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
