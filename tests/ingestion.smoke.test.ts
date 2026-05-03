import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

describe('ingestion smoke test', () => {
  it('runs local pipeline in dry-run mode and emits valid transcript JSON', () => {
    const out = join(process.cwd(), 'fixtures', 'smoke-output.json');
    rmSync(out, { force: true });

    const python = process.platform === 'win32' ? 'python' : 'python3';
    const run = spawnSync(
      python,
      ['scripts/transcribe_align.py', '--audio', 'fixtures/dummy.wav', '--output', out, '--dry-run'],
      { encoding: 'utf-8' },
    );

    expect(run.status).toBe(0);
    expect(existsSync(out)).toBe(true);

    const data = JSON.parse(readFileSync(out, 'utf-8')) as { words: Array<{ word: string; start: number; end: number }> };
    expect(Array.isArray(data.words)).toBe(true);
    expect(data.words.length).toBeGreaterThan(0);
    expect(typeof data.words[0].word).toBe('string');
  });
});
