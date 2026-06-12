import type { ViteDevServer } from 'vite';
import { fetchLocalDevOllamaModels } from './localDevOllamaClient';

type LocalDevOllamaModelPayload = {
  models?: Array<Record<string, unknown>>;
};

type RegisterLocalDevModelRoutesOptions = {
  server: ViteDevServer;
  getOpenRouterApiKey: () => Promise<string>;
  getOllamaApiKey: () => Promise<string>;
  formatOllamaUpstreamError: (status: number, body: string, fallback?: string) => string;
  buildOllamaModelPayload: (payload: LocalDevOllamaModelPayload) => unknown;
};

export function registerLocalDevModelRoutes({
  server,
  getOpenRouterApiKey,
  getOllamaApiKey,
  formatOllamaUpstreamError,
  buildOllamaModelPayload,
}: RegisterLocalDevModelRoutesOptions): void {
  server.middlewares.use('/api/openrouter/models', async (req, res) => {
    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.end('Method not allowed');
      return;
    }

    const openRouterApiKey = await getOpenRouterApiKey();
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

  server.middlewares.use('/api/ollama/models', async (req, res) => {
    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.end('Method not allowed');
      return;
    }

    const ollamaApiKey = await getOllamaApiKey();
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
        res.end(formatOllamaUpstreamError(response.status, responseBody, 'Ollama Cloud model request failed'));
        return;
      }

      const payload = responseBody ? JSON.parse(responseBody) as LocalDevOllamaModelPayload : {};
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(buildOllamaModelPayload(payload)));
    } catch (error) {
      res.statusCode = 500;
      res.end(error instanceof Error ? error.message : 'Ollama proxy failed.');
    }
  });
}
