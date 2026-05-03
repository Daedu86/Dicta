import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let kokoroSidecarProcess: ChildProcess | null = null;
let cosyvoiceSidecarProcess: ChildProcess | null = null;

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-transcribe-api',
      configureServer(server) {
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
            const body = await new Promise<string>((resolve, reject) => {
              let data = '';
              req.on('data', (chunk) => {
                data += chunk;
              });
              req.on('end', () => resolve(data));
              req.on('error', reject);
            });

            const parsed = JSON.parse(body) as {
              fileName?: string;
              audioBase64?: string;
              audioUrl?: string;
              language?: string;
            };
            if ((!parsed.audioBase64 || !parsed.fileName) && !parsed.audioUrl) {
              res.statusCode = 400;
              res.end('Missing audio payload.');
              return;
            }

            const safeLanguage = parsed.language === 'de' ? 'de' : 'en';
            const resolvedExt = parsed.fileName
              ? path.extname(parsed.fileName)
              : path.extname(new URL(parsed.audioUrl as string).pathname);
            const ext = resolvedExt || '.mp3';
            const id = randomUUID();
            const audioPath = path.join(os.tmpdir(), `dicta-${id}${ext}`);
            const outputPath = path.join(os.tmpdir(), `dicta-${id}.json`);
            if (parsed.audioBase64) {
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
              const arrayBuffer = await response.arrayBuffer();
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
            res.statusCode = 500;
            res.end(error instanceof Error ? error.message : 'Transcription server error');
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
});

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
  } catch {
    return rawUrl;
  }
}
