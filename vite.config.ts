import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { execFile, execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let kokoroSidecarProcess: ChildProcess | null = null;
let cosyvoiceSidecarProcess: ChildProcess | null = null;
const localOpenRouterJobs = new Map<string, {
  jobId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  request: Record<string, unknown>;
  result: unknown;
  error: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}>();

export default defineConfig(({ mode }) => {
  loadEnv(mode, process.cwd(), '');

  return {
  plugins: [
    react(),
    {
      name: 'local-transcribe-api',
      configureServer(server) {
        const envLocalPath = path.resolve(process.cwd(), '.env.local');
        const maxJsonBodyBytes = 64 * 1024;
        const maxOpenRouterKeyBytes = 4096;
        const maxTranscribeBodyBytes = 36 * 1024 * 1024;
        const maxTranscribeAudioBytes = 25 * 1024 * 1024;
        const openRouterFreeRouterModel = 'openrouter/free';
        const openRouterPromptMaxChars = 32_000;
        const openRouterModelMaxChars = 160;
        const openRouterActiveJobLimit = 3;
        const supportedAudioExtensions = new Set(['.mp3', '.wav', '.m4a', '.webm', '.ogg', '.flac']);

        const httpError = (message: string, statusCode: number): Error & { statusCode: number } =>
          Object.assign(new Error(message), { statusCode });

        const sendLocalError = (res: { statusCode: number; end: (body?: string) => void }, error: unknown, fallback: string): void => {
          const statusCode = Number((error as { statusCode?: unknown } | null)?.statusCode);
          res.statusCode = Number.isFinite(statusCode) ? statusCode : 500;
          res.end(error instanceof Error ? error.message : fallback);
        };

        const readRequestBody = async (req: NodeJS.ReadableStream, maxBytes: number): Promise<string> =>
          new Promise((resolve, reject) => {
            let data = '';
            let bytes = 0;
            let settled = false;
            const settle = (fn: () => void): void => {
              if (settled) return;
              settled = true;
              fn();
            };
            req.on('data', (chunk: Buffer | string) => {
              if (settled) return;
              bytes += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
              if (bytes > maxBytes) {
                settle(() => reject(httpError(`Request body too large. Limit is ${maxBytes} bytes.`, 413)));
                return;
              }
              data += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
            });
            req.on('end', () => settle(() => resolve(data)));
            req.on('error', (error) => settle(() => reject(error)));
          });

        const readJsonRequestBody = async <T>(req: NodeJS.ReadableStream, maxBytes: number): Promise<T> => {
          const body = await readRequestBody(req, maxBytes);
          try {
            return JSON.parse(body) as T;
          } catch {
            throw httpError('Invalid JSON request body.', 400);
          }
        };

        const maskApiKeySuffix = (value: string): string => {
          const trimmed = value.trim();
          if (!trimmed) return '';
          const suffixLength = 4;
          const suffix = trimmed.length > suffixLength ? trimmed.slice(-suffixLength) : trimmed;
          return `…${suffix}`;
        };

        const readEnvLocal = async (): Promise<string> => {
          try {
            return await fs.readFile(envLocalPath, 'utf-8');
          } catch {
            return '';
          }
        };

        const parseEnvValue = (rawValue: string): string => {
          const trimmed = rawValue.trim();
          if (!trimmed) return '';
          if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
            try {
              const parsed = JSON.parse(trimmed) as unknown;
              return typeof parsed === 'string' ? parsed : '';
            } catch {
              return trimmed.slice(1, -1);
            }
          }
          if (
            (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
          ) {
            return trimmed.slice(1, -1);
          }
          return trimmed;
        };

        const getOpenRouterApiKey = async (): Promise<string> => {
          const fromProcess = process.env.OPENROUTER_API_KEY?.trim();
          if (fromProcess) return fromProcess;

          const envText = await readEnvLocal();
          const line = envText
            .split(/\r?\n/)
            .map((row) => row.trim())
            .find((row) => row.startsWith('OPENROUTER_API_KEY='));
          if (!line) return '';
          return parseEnvValue(line.slice('OPENROUTER_API_KEY='.length)).trim();
        };

        const validateOpenRouterApiKey = (apiKey: string): string => {
          const cleaned = apiKey.trim();
          if (!cleaned) throw httpError('Missing apiKey.', 400);
          if (/[\r\n]/.test(cleaned)) throw httpError('OpenRouter API key cannot contain line breaks.', 400);
          if (cleaned.length > maxOpenRouterKeyBytes) throw httpError('OpenRouter API key is too large.', 400);
          return cleaned;
        };

        const upsertOpenRouterApiKey = async (apiKey: string): Promise<void> => {
          const cleaned = validateOpenRouterApiKey(apiKey);
          const nextLine = `OPENROUTER_API_KEY=${JSON.stringify(cleaned)}`;
          const envText = await readEnvLocal();
          const lines = envText ? envText.split(/\r?\n/) : [];
          let replaced = false;
          const nextLines = lines.map((line) => {
            if (line.trim().startsWith('OPENROUTER_API_KEY=')) {
              replaced = true;
              return nextLine;
            }
            return line;
          });
          if (!replaced) {
            if (nextLines.length > 0 && nextLines[nextLines.length - 1].trim() !== '') {
              nextLines.push('');
            }
            nextLines.push(nextLine);
          }
          await fs.writeFile(envLocalPath, `${nextLines.join('\n')}\n`, 'utf-8');
        };

        const normalizeOpenRouterModel = (value: unknown): string => {
          const model = typeof value === 'string' ? value.trim() : '';
          if (!model) return '';
          if (model.length > openRouterModelMaxChars || !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(model)) {
            throw httpError('Invalid OpenRouter model id.', 400);
          }
          if (model !== openRouterFreeRouterModel && !model.endsWith(':free')) {
            throw httpError('OpenRouter model must be openrouter/free or a :free model variant.', 400);
          }
          return model;
        };

        const normalizeOpenRouterPrompt = (value: unknown): string => {
          const prompt = typeof value === 'string' ? value.trim() : '';
          if (!prompt) return '';
          if (prompt.length > openRouterPromptMaxChars) {
            throw httpError(`Prompt is too large. Limit is ${openRouterPromptMaxChars} characters.`, 400);
          }
          return prompt;
        };

        const normalizeOpenRouterMaxTokens = (value: unknown, fallback: number): number => {
          const hasValue = value !== undefined && value !== null && value !== '';
          const numeric = hasValue ? Number(value) : fallback;
          const bounded = Number.isFinite(numeric) ? numeric : fallback;
          return Math.max(128, Math.min(1800, Math.round(bounded)));
        };

        const normalizeAudioExtension = (value: string): string => {
          const ext = path.extname(value).toLowerCase();
          return supportedAudioExtensions.has(ext) ? ext : '.mp3';
        };

        const removeOpenRouterApiKey = async (): Promise<boolean> => {
          const envText = await readEnvLocal();
          if (!envText) return false;
          const lines = envText.split(/\r?\n/);
          const nextLines = lines.filter((line) => !line.trim().startsWith('OPENROUTER_API_KEY='));
          if (nextLines.length === lines.length) return false;
          await fs.writeFile(envLocalPath, `${nextLines.join('\n')}\n`, 'utf-8');
          return true;
        };

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

        server.middlewares.use('/api/openrouter/key/status', async (req, res) => {
          if (req.method !== 'GET') {
            res.statusCode = 405;
            res.end('Method not allowed');
            return;
          }

          try {
            const openRouterApiKey = await getOpenRouterApiKey();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ configured: Boolean(openRouterApiKey), suffix: maskApiKeySuffix(openRouterApiKey) }));
          } catch (error) {
            res.statusCode = 500;
            res.end(error instanceof Error ? error.message : 'OpenRouter key status failed.');
          }
        });

        server.middlewares.use('/api/openrouter/key', async (req, res) => {
          if (req.method === 'POST') {
            try {
              const parsed = await readJsonRequestBody<{ apiKey?: string }>(req, maxOpenRouterKeyBytes);
              const nextKey = parsed.apiKey?.trim() ?? '';
              if (!nextKey) {
                res.statusCode = 400;
                res.end('Missing apiKey.');
                return;
              }

              await upsertOpenRouterApiKey(nextKey);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true, suffix: maskApiKeySuffix(nextKey) }));
              return;
            } catch (error) {
              sendLocalError(res, error, 'Failed to save OpenRouter key.');
              return;
            }
          }

          if (req.method === 'DELETE') {
            try {
              const removed = await removeOpenRouterApiKey();
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
            const parsed = await readJsonRequestBody<{ model?: string; prompt?: string; maxTokens?: number }>(req, maxJsonBodyBytes);
            const model = normalizeOpenRouterModel(parsed.model);
            const prompt = normalizeOpenRouterPrompt(parsed.prompt);
            const maxTokens = normalizeOpenRouterMaxTokens(parsed.maxTokens, 600);
            if (!model || !prompt) {
              res.statusCode = 400;
              res.end('Missing model or prompt.');
              return;
            }

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${openRouterApiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': (req.headers.origin as string | undefined) ?? 'http://localhost:5173',
                'X-Title': 'Dicta MVP (local)',
              },
              body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: maxTokens,
              }),
            });

            const responseBody = await response.text();
            res.statusCode = response.status;
            res.setHeader('Content-Type', response.headers.get('content-type') ?? 'application/json');
            res.end(responseBody);
          } catch (error) {
            sendLocalError(res, error, 'OpenRouter test request failed.');
          }
        });

        server.middlewares.use('/api/openrouter/jobs', async (req, res) => {
          if (req.method === 'GET') {
            const url = new URL(req.url ?? '', 'http://localhost');
            const jobId = url.searchParams.get('id') ?? '';
            const job = localOpenRouterJobs.get(jobId);
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
            const parsed = await readJsonRequestBody<{
              model?: string;
              prompt?: string;
              maxTokens?: number;
              inputMode?: string;
              language?: string;
              slotLabel?: string;
              durationMinutes?: number;
              targetDifficulty?: string;
            }>(req, maxJsonBodyBytes);
            const model = normalizeOpenRouterModel(parsed.model);
            const prompt = normalizeOpenRouterPrompt(parsed.prompt);
            if (!model || !prompt) {
              res.statusCode = 400;
              res.end('Missing model or prompt.');
              return;
            }
            const activeJobCount = [...localOpenRouterJobs.values()].filter((job) => job.status === 'queued' || job.status === 'running').length;
            if (activeJobCount >= openRouterActiveJobLimit) {
              res.statusCode = 429;
              res.end(`Too many active OpenRouter jobs. Wait for one of the ${openRouterActiveJobLimit} active jobs to finish.`);
              return;
            }

            const now = new Date().toISOString();
            const jobId = randomUUID();
            const durationMinutes = Number(parsed.durationMinutes);
            const fallbackMaxTokens = durationMinutes === 2 ? 1000 : durationMinutes === 3 ? 1300 : durationMinutes === 4 ? 1600 : 600;
            const maxTokens = normalizeOpenRouterMaxTokens(parsed.maxTokens, fallbackMaxTokens);
            const requestPayload = {
              model,
              prompt,
              maxTokens,
              inputMode: parsed.inputMode,
              language: parsed.language,
              slotLabel: parsed.slotLabel,
              durationMinutes: parsed.durationMinutes,
              targetDifficulty: parsed.targetDifficulty,
            };
            const job = {
              jobId,
              status: 'queued' as const,
              request: requestPayload,
              result: null,
              error: '',
              createdAt: now,
              updatedAt: now,
              completedAt: null,
            };
            localOpenRouterJobs.set(jobId, job);

            void (async () => {
              const startedAt = new Date().toISOString();
              localOpenRouterJobs.set(jobId, { ...job, status: 'running', updatedAt: startedAt });
              try {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${openRouterApiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': (req.headers.origin as string | undefined) ?? 'http://localhost:5173',
                    'X-Title': 'Dicta MVP (local)',
                  },
                  body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: maxTokens,
                  }),
                });
                const responseBody = await response.text();
                if (!response.ok) throw new Error(responseBody || `OpenRouter request failed (${response.status}).`);
                const payload = JSON.parse(responseBody) as { choices?: Array<{ message?: { content?: string } }> };
                const text = typeof payload.choices?.[0]?.message?.content === 'string' ? payload.choices[0].message.content : '';
                if (!text.trim()) throw new Error('OpenRouter returned an empty response.');
                const completedAt = new Date().toISOString();
                localOpenRouterJobs.set(jobId, {
                  ...job,
                  status: 'succeeded',
                  result: { text, payload, model },
                  updatedAt: completedAt,
                  completedAt,
                });
              } catch (error) {
                const completedAt = new Date().toISOString();
                localOpenRouterJobs.set(jobId, {
                  ...job,
                  status: 'failed',
                  error: error instanceof Error ? error.message : 'OpenRouter job failed.',
                  updatedAt: completedAt,
                  completedAt,
                });
              }
            })();

            res.statusCode = 202;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(job));
          } catch (error) {
            sendLocalError(res, error, 'OpenRouter job request failed.');
          }
        });

        server.middlewares.use('/api/admin/files', async (req, res) => {
          if (req.method !== 'GET') {
            res.statusCode = 405;
            res.end('Method not allowed');
            return;
          }

          try {
            const folders = await Promise.all(
              [
                { label: 'Fixtures', relativePath: 'fixtures' },
                { label: 'Public assets', relativePath: 'public' },
                { label: 'Input #4 cache', relativePath: path.join('public', 'tts-cache') },
              ].map(async (folder) => {
                const absolutePath = path.resolve(process.cwd(), folder.relativePath);
                const files = await listKnownFiles(absolutePath);
                return {
                  label: folder.label,
                  relativePath: folder.relativePath,
                  absolutePath,
                  exists: files !== null,
                  fileCount: files?.length ?? 0,
                  totalBytes: files?.reduce((sum, file) => sum + file.size, 0) ?? 0,
                  wavCount: files?.filter((file) => file.ext === '.wav').length ?? 0,
                  jsonCount: files?.filter((file) => file.ext === '.json').length ?? 0,
                  transcriptCount: files?.filter((file) => file.name.toLowerCase().includes('transcript')).length ?? 0,
                };
              }),
            );

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ projectRoot: process.cwd(), folders }));
          } catch (error) {
            res.statusCode = 500;
            res.end(error instanceof Error ? error.message : 'Admin file inventory error');
          }
        });

        server.middlewares.use('/api/transcribe', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method not allowed');
            return;
          }

          try {
            const parsed = await readJsonRequestBody<{
              fileName?: string;
              audioBase64?: string;
              audioUrl?: string;
              language?: string;
            }>(req, maxTranscribeBodyBytes);
            if ((!parsed.audioBase64 || !parsed.fileName) && !parsed.audioUrl) {
              res.statusCode = 400;
              res.end('Missing audio payload.');
              return;
            }

            const supportedTranscriptionLanguages = new Set(['en', 'es', 'de', 'fr', 'pt']);
            const safeLanguage = supportedTranscriptionLanguages.has(String(parsed.language)) ? String(parsed.language) : 'en';
            const resolvedExt = parsed.fileName
              ? normalizeAudioExtension(parsed.fileName)
              : normalizeAudioExtension(new URL(normalizeRemoteAudioUrl(parsed.audioUrl as string)).pathname);
            const ext = resolvedExt;
            const id = randomUUID();
            const audioPath = path.join(os.tmpdir(), `dicta-${id}${ext}`);
            const outputPath = path.join(os.tmpdir(), `dicta-${id}.json`);
            if (parsed.audioBase64) {
              if (Buffer.byteLength(parsed.audioBase64, 'base64') > maxTranscribeAudioBytes) {
                throw httpError(`Audio payload too large. Limit is ${maxTranscribeAudioBytes} bytes.`, 413);
              }
              await fs.writeFile(audioPath, Buffer.from(parsed.audioBase64, 'base64'));
            } else {
              const remoteUrl = normalizeRemoteAudioUrl(parsed.audioUrl as string);
              const response = await fetch(remoteUrl, {
                redirect: 'follow',
                headers: {
                  'User-Agent': 'DictaLocalMVP/1.0',
                  Accept: 'audio/*,*/*;q=0.8',
                },
              });
              if (!response.ok) {
                res.statusCode = 400;
                res.end(`Failed to fetch audio URL: ${response.status}`);
                return;
              }
              const contentType = response.headers.get('content-type') ?? '';
              if (!contentType.includes('audio') && !contentType.includes('application/octet-stream')) {
                res.statusCode = 400;
                res.end(`URL did not return audio content (received: ${contentType || 'unknown'}).`);
                return;
              }
              const contentLength = Number(response.headers.get('content-length') ?? NaN);
              if (Number.isFinite(contentLength) && contentLength > maxTranscribeAudioBytes) {
                throw httpError(`Remote audio is too large. Limit is ${maxTranscribeAudioBytes} bytes.`, 413);
              }
              const arrayBuffer = await response.arrayBuffer();
              if (arrayBuffer.byteLength > maxTranscribeAudioBytes) {
                throw httpError(`Remote audio is too large. Limit is ${maxTranscribeAudioBytes} bytes.`, 413);
              }
              await fs.writeFile(audioPath, Buffer.from(arrayBuffer));
            }

            const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
            await new Promise<void>((resolve, reject) => {
              execFile(
                pythonCmd,
                ['scripts/transcribe_align.py', '--audio', audioPath, '--output', outputPath, '--language', safeLanguage],
                { cwd: process.cwd() },
                (error, stdout, stderr) => {
                  if (error) {
                    reject(new Error(stderr || stdout || error.message));
                    return;
                  }
                  resolve();
                },
              );
            });

            const transcript = await fs.readFile(outputPath, 'utf-8');
            await fs.rm(audioPath, { force: true });
            await fs.rm(outputPath, { force: true });

            res.setHeader('Content-Type', 'application/json');
            res.end(transcript);
          } catch (error) {
            sendLocalError(res, error, 'Transcription server error');
          }
        });

        server.middlewares.use('/api/kokoro/start', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method not allowed');
            return;
          }

          try {
            if (await isKokoroSidecarHealthy()) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true, started: false, ready: true }));
              return;
            }

            if (kokoroSidecarProcess && !kokoroSidecarProcess.killed) {
              const ready = await waitForKokoroSidecarReady();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: ready, started: false, ready }));
              return;
            }

            const kokoroDir = path.resolve(process.cwd(), 'services', 'kokoro_tts');
            await ensureKokoroVenvReady(kokoroDir);
            const pythonCmd =
              process.platform === 'win32'
                ? path.join(kokoroDir, '.venv', 'Scripts', 'python.exe')
                : path.join(kokoroDir, '.venv', 'bin', 'python');
            const pythonExists = await fileExists(pythonCmd);
            const command = pythonExists ? pythonCmd : process.platform === 'win32' ? 'python' : 'python3';

            kokoroSidecarProcess = spawn(command, ['-m', 'uvicorn', 'app:app', '--host', '127.0.0.1', '--port', '8787'], {
              cwd: kokoroDir,
              stdio: 'ignore',
              windowsHide: true,
            });
            kokoroSidecarProcess.unref();
            kokoroSidecarProcess.on('exit', () => {
              kokoroSidecarProcess = null;
            });

            const ready = await waitForKokoroSidecarReady();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: ready, started: true, ready }));
          } catch (error) {
            res.statusCode = 500;
            res.end(error instanceof Error ? error.message : 'Failed to start Kokoro sidecar.');
          }
        });

        server.middlewares.use('/api/cosyvoice/start', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method not allowed');
            return;
          }

          try {
            if (await isCosyVoiceSidecarHealthy()) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true, started: false, ready: true }));
              return;
            }

            if (cosyvoiceSidecarProcess && !cosyvoiceSidecarProcess.killed) {
              const ready = await waitForCosyVoiceSidecarReady();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: ready, started: false, ready }));
              return;
            }

            const cosyVoiceDir = path.resolve(process.cwd(), 'services', 'cosyvoice_cache');
            await ensureCosyVoiceVenvReady(cosyVoiceDir);
            const pythonCmd =
              process.platform === 'win32'
                ? path.join(cosyVoiceDir, '.venv', 'Scripts', 'python.exe')
                : path.join(cosyVoiceDir, '.venv', 'bin', 'python');
            const pythonExists = await fileExists(pythonCmd);
            const command = pythonExists ? pythonCmd : process.platform === 'win32' ? 'python' : 'python3';

            cosyvoiceSidecarProcess = spawn(command, ['-m', 'uvicorn', 'app:app', '--host', '127.0.0.1', '--port', '8791'], {
              cwd: cosyVoiceDir,
              stdio: 'ignore',
              windowsHide: true,
            });
            cosyvoiceSidecarProcess.unref();
            cosyvoiceSidecarProcess.on('exit', () => {
              cosyvoiceSidecarProcess = null;
            });

            const ready = await waitForCosyVoiceSidecarReady();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: ready, started: true, ready }));
          } catch (error) {
            res.statusCode = 500;
            res.end(error instanceof Error ? error.message : 'Failed to start CosyVoice sidecar.');
          }
        });

        server.middlewares.use('/api/cosyvoice/bootstrap', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method not allowed');
            return;
          }

          try {
            if (cosyvoiceSidecarProcess && !cosyvoiceSidecarProcess.killed) {
              cosyvoiceSidecarProcess.kill();
              cosyvoiceSidecarProcess = null;
            }
            const cosyVoiceDir = path.resolve(process.cwd(), 'services', 'cosyvoice_cache');
            await ensureCosyVoiceVenvReady(cosyVoiceDir);
            await ensureCosyVoiceRepoAndRequirements(cosyVoiceDir);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (error) {
            res.statusCode = 500;
            res.end(error instanceof Error ? error.message : 'Failed to bootstrap CosyVoice.');
          }
        });
      },
    },
  ],
  define: {
    __DICTA_BUILD_INFO__: JSON.stringify(buildDictaBuildInfo()),
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 40,
            },
            {
              name: 'charts-vendor',
              test: /node_modules[\\/](recharts|d3-[^\\/]+|d3|victory-vendor)[\\/]/,
              priority: 30,
            },
            {
              name: 'supabase-vendor',
              test: /node_modules[\\/](@supabase|@noble|@scure)[\\/]/,
              priority: 25,
            },
            {
              name: 'adaptive-core',
              test: /src[\\/]core[\\/]adaptive[\\/]/,
              priority: 15,
              minSize: 20 * 1024,
            },
            {
              name: 'runtime-core',
              test: /src[\\/]core[\\/](supabaseSync|openRouterJobs|perfDiagnostics)\.ts$/,
              priority: 10,
              minSize: 10 * 1024,
            },
          ],
        },
      },
    },
  },
  };
});

function buildDictaBuildInfo(): {
  branch: string;
  commitSha: string;
  shortCommitSha: string;
  commitTimestamp: string;
  commitMessage: string;
  buildTimestamp: string;
} {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || readGitValue(['rev-parse', 'HEAD']);
  const branch = process.env.VERCEL_GIT_COMMIT_REF?.trim() || readGitValue(['rev-parse', '--abbrev-ref', 'HEAD']);
  const commitTimestamp = commitSha ? readGitValue(['show', '-s', '--format=%cI', commitSha]) : '';
  const commitMessage =
    process.env.VERCEL_GIT_COMMIT_MESSAGE?.trim() || (commitSha ? readGitValue(['show', '-s', '--format=%s', commitSha]) : '');

  return {
    branch,
    commitSha,
    shortCommitSha: commitSha.slice(0, 7),
    commitTimestamp,
    commitMessage,
    buildTimestamp: new Date().toISOString(),
  };
}

function readGitValue(args: string[]): string {
  try {
    return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

async function ensureKokoroVenvReady(kokoroDir: string): Promise<void> {
  const venvPython =
    process.platform === 'win32'
      ? path.join(kokoroDir, '.venv', 'Scripts', 'python.exe')
      : path.join(kokoroDir, '.venv', 'bin', 'python');

  if (await fileExists(venvPython)) {
    return;
  }

  {
    const systemPython = process.platform === 'win32' ? 'python' : 'python3';
    await new Promise<void>((resolve, reject) => {
      execFile(systemPython, ['-m', 'venv', '.venv'], { cwd: kokoroDir }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || stdout || error.message));
          return;
        }
        resolve();
      });
    });
  }

  await new Promise<void>((resolve, reject) => {
    execFile(venvPython, ['-m', 'pip', 'install', '-r', 'requirements.txt'], { cwd: kokoroDir }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || stdout || error.message));
        return;
      }
      resolve();
    });
  });
}

async function ensureCosyVoiceVenvReady(cosyVoiceDir: string): Promise<void> {
  const venvPython =
    process.platform === 'win32'
      ? path.join(cosyVoiceDir, '.venv', 'Scripts', 'python.exe')
      : path.join(cosyVoiceDir, '.venv', 'bin', 'python');

  if (await fileExists(venvPython)) {
    return;
  }

  const systemPython = process.platform === 'win32' ? 'python' : 'python3';
  await new Promise<void>((resolve, reject) => {
    execFile(systemPython, ['-m', 'venv', '.venv'], { cwd: cosyVoiceDir }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || stdout || error.message));
        return;
      }
      resolve();
    });
  });

  // Install deps into the new venv
  const pipPython =
    process.platform === 'win32'
      ? path.join(cosyVoiceDir, '.venv', 'Scripts', 'python.exe')
      : path.join(cosyVoiceDir, '.venv', 'bin', 'python');
  await new Promise<void>((resolve, reject) => {
    execFile(pipPython, ['-m', 'pip', 'install', '-r', 'requirements.txt'], { cwd: cosyVoiceDir }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || stdout || error.message));
        return;
      }
      resolve();
    });
  });
}

async function ensureCosyVoiceRepoAndRequirements(cosyVoiceDir: string): Promise<void> {
  const repoDir = path.resolve(process.cwd(), 'third_party', 'CosyVoice');
  if (!(await fileExists(repoDir))) {
    await fs.mkdir(path.dirname(repoDir), { recursive: true });
    await new Promise<void>((resolve, reject) => {
      execFile('git', ['clone', '--depth', '1', 'https://github.com/FunAudioLLM/CosyVoice.git', repoDir], { cwd: process.cwd() }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || stdout || error.message));
          return;
        }
        resolve();
      });
    });
  }

  const venvPython =
    process.platform === 'win32'
      ? path.join(cosyVoiceDir, '.venv', 'Scripts', 'python.exe')
      : path.join(cosyVoiceDir, '.venv', 'bin', 'python');

  // Windows-friendly "minimal import" dependency set. We avoid installing the upstream pinned
  // requirements.txt because it includes compiled pins (grpcio==1.57, pyworld, pyarrow, etc.)
  // that fail on Windows + Python 3.13.
  const deps = [
    'tqdm',
    'HyperPyYAML',
    'modelscope',
    'omegaconf',
    'hydra-core',
    'transformers',
    'diffusers',
    'conformer',
    'inflect',
    'rich',
    'wget',
    'wetext',
    // Required for CosyVoice ONNX assets on Windows.
    'onnxruntime',
  ];

  await new Promise<void>((resolve, reject) => {
    execFile(venvPython, ['-m', 'pip', 'install', ...deps], { cwd: cosyVoiceDir }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || stdout || error.message));
        return;
      }
      resolve();
    });
  });
}

async function listKnownFiles(root: string): Promise<Array<{ name: string; ext: string; size: number }> | null> {
  try {
    const stat = await fs.stat(root);
    if (!stat.isDirectory()) {
      return null;
    }
  } catch {
    return null;
  }

  const found: Array<{ name: string; ext: string; size: number }> = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const stat = await fs.stat(absolutePath);
      found.push({
        name: entry.name,
        ext: path.extname(entry.name).toLowerCase(),
        size: stat.size,
      });
    }
  }

  await walk(root);
  return found;
}

async function fileExists(pathToFile: string): Promise<boolean> {
  try {
    await fs.access(pathToFile);
    return true;
  } catch {
    return false;
  }
}

async function isKokoroSidecarHealthy(): Promise<boolean> {
  try {
    const response = await fetch('http://127.0.0.1:8787/health');
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForKokoroSidecarReady(timeoutMs = 10_000): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isKokoroSidecarHealthy()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function isCosyVoiceSidecarHealthy(): Promise<boolean> {
  try {
    const response = await fetch('http://127.0.0.1:8791/health');
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForCosyVoiceSidecarReady(timeoutMs = 10_000): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isCosyVoiceSidecarHealthy()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

function normalizeRemoteAudioUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw httpError('Remote audio URL must use http or https.', 400);
    }
    if (isBlockedRemoteAudioHostname(url.hostname)) {
      throw httpError('Remote audio URL host is not allowed for local transcription.', 400);
    }
    if (url.hostname.includes('archive.org') && url.pathname.startsWith('/details/')) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 3) {
        const identifier = parts[1];
        const filename = parts.slice(2).join('/');
        url.pathname = `/download/${identifier}/${filename}`;
        url.search = '';
      }
    }
    return url.toString();
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) throw error;
    throw httpError('Invalid remote audio URL.', 400);
  }
}

function isBlockedRemoteAudioHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '').replace(/\.$/, '');
  if (!normalized) return true;
  if (
    normalized === 'localhost' ||
    normalized === 'metadata.google.internal' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local')
  ) {
    return true;
  }
  if (normalized === '::1' || normalized === '::' || normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  const ipv4 = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const [a, b, c, d] = ipv4.slice(1).map(Number);
  if ([a, b, c, d].some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a === 169 && b === 254 ||
    a === 172 && b >= 16 && b <= 31 ||
    a === 192 && b === 168 ||
    a === 100 && b >= 64 && b <= 127 ||
    a >= 224
  );
}

function httpError(message: string, statusCode: number): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode });
}
