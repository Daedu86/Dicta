import { expect, it } from 'vitest';
import { extractOpenRouterJobSessionJson } from '../../api/openrouter/jobs.js';
import { validScript } from './openRouterJobFixtures';

const fence = String.fromCharCode(96).repeat(3);

export function defineOpenRouterJobJsonTests() {
  it('extracts session JSON from surrounding prose', () => {
    const extracted = extractOpenRouterJobSessionJson(`prefix\n${JSON.stringify(validScript)}\nsuffix`);
    expect(JSON.parse(extracted).title).toBe('Ein ruhiger Morgen');
  });

  it('repairs trailing commas before storing extracted session JSON', () => {
    const sloppyJson = JSON.stringify(validScript, null, 2)
      .replace('"intonationHint": "neutral"\n    }', '"intonationHint": "neutral",\n    }')
      .replace(/\n}$/, ',\n}');
    const extracted = extractOpenRouterJobSessionJson(`${fence}json\n${sloppyJson}\n${fence}`);
    expect(JSON.parse(extracted).phrases[0].text).toBe(validScript.phrases[0].text);
  });

  it('extracts double-encoded session JSON returned as a JSON string', () => {
    const extracted = extractOpenRouterJobSessionJson(JSON.stringify(JSON.stringify(validScript)));
    expect(JSON.parse(extracted).inputMode).toBe('browser-tts');
  });

  it('extracts session JSON nested in a wrapper string', () => {
    const extracted = extractOpenRouterJobSessionJson(
      JSON.stringify({
        note: 'Wrapper metadata.',
        session_json: JSON.stringify(validScript),
      }),
    );
    expect(JSON.parse(extracted).title).toBe('Ein ruhiger Morgen');
  });

  it('rejects plain text without a valid session JSON object', () => {
    expect(extractOpenRouterJobSessionJson('Plain narrative without the required object.')).toBe('');
  });
}
