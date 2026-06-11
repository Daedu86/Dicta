import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createDictaLocalDevApiPlugin } from './dev/dictaLocalDevApiPlugin';
import { execFileSync } from 'node:child_process';


export default defineConfig(({ mode }) => {
  loadEnv(mode, process.cwd(), '');

  return {
  plugins: [
    react(),
    createDictaLocalDevApiPlugin(),
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
