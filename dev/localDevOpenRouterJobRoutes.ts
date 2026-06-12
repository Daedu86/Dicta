import type { ViteDevServer } from 'vite';
import { fetchLocalDevOpenRouterChatCompletion } from './localDevOpenRouterClient';
import {
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

type LocalDevOpenRouterJobRequestBody = {
  model?: string;
  prompt?: string;
  maxTokens?: number;
  inputMode?: string;
  language?: string;
  slotLabel?: string;
  durationMinutes?: number;
  targetDifficulty?: string;
};

type RegisterLocalDevOpenRouterJobRoutesOptions = {
  server: ViteDevServer;
  maxJsonBodyBytes: number;
  activeJobLimit: number;
  getOpenRouterApiKey: () => Promise<string>;
  normalizeOpenRouterModel: (value: unknown) => string;
  normalizeOpenRouterPrompt: (value: unknown) => string;
  normalizeOpenRouterMaxTokens: (value: unknown, fallback: number) => number;
};

const getLocalDevOpenRouterJobFallbackMaxTokens = (durationMinutes: unknown): number => {
  const parsedDurationMinutes = Number(durationMinutes);
  if (parsedDurationMinutes === 2) return 1000;
  if (parsedDurationMinutes === 3) return 1300;
  if (parsedDurationMinutes === 4) return 1600;
  return 600;
};

export function registerLocalDevOpenRouterJobRoutes({
  server,
  maxJsonBodyBytes,
  activeJobLimit,
  getOpenRouterApiKey,
  normalizeOpenRouterModel,
  normalizeOpenRouterPrompt,
  normalizeOpenRouterMaxTokens,
}: RegisterLocalDevOpenRouterJobRoutesOptions): void {
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

    const openRouterApiKey = await getOpenRouterApiKey();
    if (!openRouterApiKey) {
      res.statusCode = 400;
      res.end('Missing OPENROUTER_API_KEY. Set it in .env.local and try again.');
      return;
    }

    try {
      const parsed = await readLocalDevJsonRequestBody<LocalDevOpenRouterJobRequestBody>(req, maxJsonBodyBytes);
      const model = normalizeOpenRouterModel(parsed.model);
      const prompt = normalizeOpenRouterPrompt(parsed.prompt);

      if (!model || !prompt) {
        res.statusCode = 400;
        res.end('Missing model or prompt.');
        return;
      }

      const activeJobCount = countActiveLocalOpenRouterJobs();
      if (activeJobCount >= activeJobLimit) {
        res.statusCode = 429;
        res.end(`Too many active OpenRouter jobs. Wait for one of the ${activeJobLimit} active jobs to finish.`);
        return;
      }

      const fallbackMaxTokens = getLocalDevOpenRouterJobFallbackMaxTokens(parsed.durationMinutes);
      const maxTokens = normalizeOpenRouterMaxTokens(parsed.maxTokens, fallbackMaxTokens);

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
}
