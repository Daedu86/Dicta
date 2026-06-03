import { defineConfig, devices } from '@playwright/test';

const e2eBaseUrl = 'http://127.0.0.1:4174';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  use: {
    baseURL: e2eBaseUrl,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4174',
    url: `${e2eBaseUrl}/e2e-training.html`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
