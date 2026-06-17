import { expect, it } from 'vitest';
import { extractOpenRouterJobSessionJson } from '../../api/openrouter/jobs.js';
import { validScript } from './openRouterJobFixtures';

export function defineOpenRouterJobJsonTests() {
  it('extracts session JSON from surrounding prose', () => {
    const extracted = extractOpenRouterJobSessionJson(`prefix\n${JSON.stringify(validScript)}\nsuffix`);
    expect(JSON.parse(extracted).title).toBe('Ein ruhiger Morgen');
  });
}
