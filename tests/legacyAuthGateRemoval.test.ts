import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();

const removedLegacyGateFiles = [
  'public/login.html',
  'api/auth/login.js',
  'api/auth/logout.js',
];

const runtimeRoots = [
  'src',
  'api',
  'public',
  'dev',
];

const runtimeFileExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.html',
  '.webmanifest',
]);

const forbiddenRuntimePatterns = [
  /\/api\/auth\/login/i,
  /\/api\/auth\/logout/i,
  /login\.html/i,
  /single-password/i,
  /single password/i,
  /password gate/i,
  /admin password/i,
  /APP_PASSWORD/,
  /VITE_APP_PASSWORD/,
  /BASIC_AUTH/,
  /ADMIN_PASSWORD/,
  /AUTH_PASSWORD/,
  /password middleware/i,
  /app gate/i,
];

function extensionOf(path: string): string {
  const match = path.match(/\.[^.]+$/);
  return match?.[0] ?? '';
}

function collectRuntimeFiles(root: string): string[] {
  const absoluteRoot = join(repoRoot, root);
  if (!existsSync(absoluteRoot)) return [];

  const files: string[] = [];
  const stack = [absoluteRoot];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const stat = statSync(current);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(current)) {
        stack.push(join(current, entry));
      }
      continue;
    }

    if (stat.isFile() && runtimeFileExtensions.has(extensionOf(current))) {
      files.push(current);
    }
  }

  return files;
}

describe('legacy auth gate removal', () => {
  it('keeps removed single-password gate files absent', () => {
    for (const path of removedLegacyGateFiles) {
      expect(existsSync(join(repoRoot, path)), `${path} should stay removed`).toBe(false);
    }
  });

  it('does not reintroduce legacy auth gate strings in runtime files', () => {
    const matches: string[] = [];

    for (const root of runtimeRoots) {
      for (const file of collectRuntimeFiles(root)) {
        const text = readFileSync(file, 'utf8');
        for (const pattern of forbiddenRuntimePatterns) {
          if (pattern.test(text)) {
            matches.push(`${relative(repoRoot, file)} matched ${pattern}`);
          }
        }
      }
    }

    expect(matches).toEqual([]);
  });
});
