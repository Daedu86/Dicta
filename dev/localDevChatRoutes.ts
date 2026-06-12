import type { ViteDevServer } from 'vite';
import { fetchLocalDevOllamaChat } from './localDevOllamaClient';
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
  getOllamaApiKey: () => Promise<string>;
  getOpenRouterApiKey: () => Promise<string>;
  normalizeOllamaModel: (value: unknown) => string;
  normalizeOllamaPrompt: (value: unknown) => string;
  normalizeOllamaMaxTokens: (value: unknown, fallback: number) => number;
  normalizeOpenRouterModel: (value: unknown) => string;
  normalizeOpenRouterPrompt: (value: unknown) => string;
  normalizeOpenRouterMaxTokens: (value: unknown, fallback: number) => number;
  formatOllamaUpstreamError: (status: number, body: string, fallback?: string) => string;
};

export function registerLocalDevChatRoutes({
  server,
  maxJsonBodyBytes,
  getOllamaApiKey,
  getOpenRouterApiKey,
  normalizeOllamaModel,
  normalizeOllamaPrompt,
  normalizeOllamaMaxTokens,
  normalizeOpenRouterModel,
  normalizeOpenRouterPrompt,
  normalizeOpenRouterMaxTokens,
  formatOllamaUpstreamError,
}: RegisterLocalDevChatRoutesOptions): void {
  server.middlewares.use('/api/ollama/chat', async (req, res) => {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end('Method not allowed');
      return;
    }

    const ollamaApiKey = await getOllamaApiKey();
    if (!ollamaApiKey) {
      res.statusCode = 400;
      res.end('Missing OLLAMA_API_KEY. Set it in .env.local and try again.');
      return;
    }

    try {
      const parsed = await readLocalDevJsonRequestBody<LocalDevChatRequestBody>(req, maxJsonBodyBytes);
      const model = normalizeOllamaModel(parsed.model);
      const prompt = normalizeOllamaPrompt(parsed.prompt);
      const maxTokens = normalizeOllamaMaxTokens(parsed.maxTokens, 600);

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
        res.end(formatOllamaUpstreamError(response.status, responseBody));
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
