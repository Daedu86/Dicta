import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function readRepoSource(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf-8');
}

export function expectInOrder(source: string, labels: string[]): void {
  let cursor = 0;

  for (const label of labels) {
    const index = source.indexOf(label, cursor);
    expect(index, `Expected "${label}" after offset ${cursor}`).toBeGreaterThanOrEqual(0);
    cursor = index + label.length;
  }
}
