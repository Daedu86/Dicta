import type { ViteDevServer } from 'vite';
import { fetchLocalDevOpenRouterChatCompletion } from './localDevOpenRouterClient';
import {
  readLocalDevJsonRequestBody,
  sendLocalDevError,
} from './localDevHttpHelpers';

type LocalDevChatRequestBody = {
  model?: string;
  prompt?: string;
  maxTokens?: number;
};

type RegisterLocalDevChatRoutesOptions = {
  server: ViteDevServer;
  maxJsonBodyBytes: number;
  getOpenRouterApiKey: () => Promise<string>;
  normalizeOpenRouterModel: (value: unknown) => string;
  normalizeOpenRouterPrompt: (value: unknown) => string;
  normalizeOpenRouterMaxTokens: (value: unknown, fallback: number) => number;
};

export function registerLocalDevChatRoutes({
  server,
  maxJsonBodyBytes,
  getOpenRouterApiKey,
  normalizeOpenRouterModel,
  normalizeOpenRouterPrompt,
  normalizeOpenRouterMaxTokens,
}: RegisterLocalDevChatRoutesOptions): void {
  server.middlewares.use('/api/openrouter/chat', async (req, res) => {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end('Method not allowed');
      return;
    }

    const openRouterApiKey = await getOpenRouterApiKey();
    if (!openRouterApiKey) {
      res.statusCode = 400;
      res.end('Missing OPENROUTER_API_KEY. Set it in .env.local and try again.');
      return;
    }

    try {
      const parsed = await readLocalDevJsonRequestBody<LocalDevChatRequestBody>(req, maxJsonBodyBytes);
      const model = normalizeOpenRouterModel(parsed.model);
      const prompt = normalizeOpenRouterPrompt(parsed.prompt);
      const maxTokens = normalizeOpenRouterMaxTokens(parsed.maxTokens, 600);

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
}
