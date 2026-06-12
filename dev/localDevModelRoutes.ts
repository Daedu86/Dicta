import type { ViteDevServer } from 'vite';

type RegisterLocalDevModelRoutesOptions = {
  server: ViteDevServer;
  getOpenRouterApiKey: () => Promise<string>;
};

export function registerLocalDevModelRoutes({
  server,
  getOpenRouterApiKey,
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

}
