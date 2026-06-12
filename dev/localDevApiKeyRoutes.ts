import type { ViteDevServer } from 'vite';
import {
  maskLocalDevApiKeySuffix,
  readLocalDevJsonRequestBody,
  sendLocalDevError,
} from './localDevHttpHelpers';

type RegisterLocalDevApiKeyRoutesOptions = {
  server: ViteDevServer;
  basePath: string;
  providerLabel: string;
  maxKeyBytes: number;
  getApiKey: () => Promise<string>;
  upsertApiKey: (apiKey: string) => Promise<void>;
  removeApiKey: () => Promise<boolean>;
  validateApiKey: (apiKey: string) => string;
};

export function registerLocalDevApiKeyRoutes({
  server,
  basePath,
  providerLabel,
  maxKeyBytes,
  getApiKey,
  upsertApiKey,
  removeApiKey,
  validateApiKey,
}: RegisterLocalDevApiKeyRoutesOptions): void {
  server.middlewares.use(`${basePath}/status`, async (req, res) => {
    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.end('Method not allowed');
      return;
    }

    try {
      const apiKey = await getApiKey();
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ configured: Boolean(apiKey), suffix: maskLocalDevApiKeySuffix(apiKey) }));
    } catch (error) {
      res.statusCode = 500;
      res.end(error instanceof Error ? error.message : `${providerLabel} key status failed.`);
    }
  });

  server.middlewares.use(basePath, async (req, res) => {
    if (req.method === 'POST') {
      try {
        const parsed = await readLocalDevJsonRequestBody<{ apiKey?: string }>(req, maxKeyBytes);
        const nextKey = parsed.apiKey?.trim() ?? '';

        if (!nextKey) {
          res.statusCode = 400;
          res.end('Missing apiKey.');
          return;
        }

        await upsertApiKey(validateApiKey(nextKey));

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, suffix: maskLocalDevApiKeySuffix(nextKey) }));
        return;
      } catch (error) {
        sendLocalDevError(res, error, `Failed to save ${providerLabel} key.`);
        return;
      }
    }

    if (req.method === 'DELETE') {
      try {
        const removed = await removeApiKey();

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, removed }));
        return;
      } catch (error) {
        res.statusCode = 500;
        res.end(error instanceof Error ? error.message : `Failed to remove ${providerLabel} key.`);
        return;
      }
    }

    res.statusCode = 405;
    res.end('Method not allowed');
  });
}
