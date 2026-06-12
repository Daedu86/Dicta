import type { Plugin } from 'vite';
import path from 'node:path';
import { createLocalDevEnvStore } from './localDevEnvStore';
import { createLocalDevApiValidation } from './localDevApiValidation';
import { buildLocalDevAdminFileInventory } from './localDevAdminFiles';
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
    const openRouterFreeRouterModel = 'openrouter/free';
    const openRouterPromptMaxChars = 32_000;
    const openRouterModelMaxChars = 160;
    const openRouterActiveJobLimit = 3;
    const localDevApiValidation = createLocalDevApiValidation({
      httpError: createLocalDevHttpError,
      maxOpenRouterKeyBytes,
      openRouterFreeRouterModel,
      openRouterPromptMaxChars,
      openRouterModelMaxChars,
    });

    registerLocalDevModelRoutes({
      server,
      getOpenRouterApiKey: () => localDevEnvStore.getOpenRouterApiKey(),
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

    registerLocalDevChatRoutes({
      server,
      maxJsonBodyBytes,
      getOpenRouterApiKey: () => localDevEnvStore.getOpenRouterApiKey(),
      normalizeOpenRouterModel: (value) => localDevApiValidation.normalizeOpenRouterModel(value),
      normalizeOpenRouterPrompt: (value) => localDevApiValidation.normalizeOpenRouterPrompt(value),
      normalizeOpenRouterMaxTokens: (value, fallback) =>
        localDevApiValidation.normalizeOpenRouterMaxTokens(value, fallback),
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
