import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type DictaManifest = {
  start_url?: string;
};

function loadManifest(): DictaManifest {
  const manifestPath = resolve(process.cwd(), 'public/manifest.webmanifest');
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as DictaManifest;
}

describe('PWA manifest', () => {
  it('starts installed users on the Supabase-aware training route', () => {
    const manifest = loadManifest();

    expect(manifest.start_url).toBe('/training');
  });

  it('does not start installed users on the legacy password page', () => {
    const manifest = loadManifest();

    expect(manifest.start_url).not.toContain('login.html');
  });
});
