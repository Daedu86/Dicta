import { describe, expect, it } from 'vitest';
import { extractOpenRouterJobText, isOpenRouterJobTerminal } from '../src/core/openRouterJobs';

describe('openRouterJobs', () => {
  it('extracts stored OpenRouter text from a normalized job result', () => {
    expect(extractOpenRouterJobText({ text: '  {"title":"ok"}  ' })).toBe('  {"title":"ok"}  ');
  });

  it('extracts text from a raw OpenRouter payload fallback', () => {
    expect(
      extractOpenRouterJobText({
        payload: {
          choices: [{ message: { content: '{"title":"from payload"}' } }],
        },
      }),
    ).toBe('{"title":"from payload"}');
  });

  it('treats only succeeded and failed jobs as terminal', () => {
    expect(isOpenRouterJobTerminal('queued')).toBe(false);
    expect(isOpenRouterJobTerminal('running')).toBe(false);
    expect(isOpenRouterJobTerminal('succeeded')).toBe(true);
    expect(isOpenRouterJobTerminal('failed')).toBe(true);
  });
});
