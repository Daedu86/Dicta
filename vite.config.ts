import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createDictaLocalDevApiPlugin } from './dev/dictaLocalDevApiPlugin';
import { execFileSync } from 'node:child_process';


type DictaBuildInfo = {
  branch: string;
  commitSha: string;
  shortCommitSha: string;
  commitTimestamp: string;
  commitMessage: string;
  buildTimestamp: string;
};

export default defineConfig(({ mode }) => {
  loadEnv(mode, process.cwd(), '');
  const dictaBuildInfo = buildDictaBuildInfo();

  return {
  plugins: [
    react(),
    createDictaBuildInfoJsonPlugin(dictaBuildInfo),
    createDictaLocalDevApiPlugin(),
  ],
  define: {
    __DICTA_BUILD_INFO__: JSON.stringify(dictaBuildInfo),
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

function createDictaBuildInfoJsonPlugin(buildInfo: DictaBuildInfo): Plugin {
  const source = `${JSON.stringify(buildInfo, null, 2)}\n`;

  return {
    name: 'dicta-build-info-json',
    configureServer(server) {
      server.middlewares.use('/version.json', (_request, response) => {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store, max-age=0');
        response.end(source);
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source,
      });
    },
  };
}

function buildDictaBuildInfo(): DictaBuildInfo {
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
