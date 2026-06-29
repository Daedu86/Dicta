import { spawn } from 'node:child_process';

const root = process.cwd();
const baseUrl = 'http://127.0.0.1:4174';
const trainingUrl = `${baseUrl}/e2e-training.html`;
const startupTimeoutMs = 120_000;

let viteProcess;
let stoppingVite = false;

function spawnNode(args, options = {}) {
  return spawn(process.execPath, args, {
    cwd: root,
    stdio: options.stdio ?? 'inherit',
    env: {
      ...process.env,
      ...options.env,
    },
    windowsHide: true,
  });
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < startupTimeoutMs) {
    try {
      const response = await fetch(trainingUrl, { method: 'GET' });
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${trainingUrl}`);
}

function stopVite() {
  if (!viteProcess || viteProcess.killed) return Promise.resolve();
  stoppingVite = true;
  return new Promise((resolve) => {
    viteProcess.once('exit', () => resolve());
    viteProcess.kill();
    setTimeout(resolve, 2000);
  });
}

async function run() {
  viteProcess = spawnNode([
    './node_modules/vite/bin/vite.js',
    '--host',
    '127.0.0.1',
    '--port',
    '4174',
  ]);

  viteProcess.on('exit', (code, signal) => {
    if (stoppingVite) return;
    if (code !== null && code !== 0) {
      console.error(`Vite exited early with code ${code}.`);
    } else if (signal) {
      console.error(`Vite exited early from signal ${signal}.`);
    }
  });

  await waitForServer();

  const playwrightProcess = spawnNode([
    './node_modules/@playwright/test/cli.js',
    'test',
    '--config=playwright.config.ts',
  ], {
    env: {
      DICTA_E2E_EXTERNAL_SERVER: '1',
    },
  });

  const exitCode = await new Promise((resolve) => {
    playwrightProcess.on('exit', (code) => resolve(code ?? 1));
  });

  await stopVite();
  process.exit(exitCode);
}

process.on('SIGINT', async () => {
  await stopVite();
  process.exit(130);
});

process.on('SIGTERM', async () => {
  await stopVite();
  process.exit(143);
});

run().catch((error) => {
  void stopVite().finally(() => {
    console.error(error);
    process.exit(1);
  });
});
