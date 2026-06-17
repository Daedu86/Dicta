import { describe, expect, it } from 'vitest';
import { extractOpenRouterJobSessionJson } from '../../api/openrouter/jobs.js';
import { validScript } from './openRouterJobFixtures';

export function registerOpenRouterJobJsonExtractionSuite(): void {
  describe('OpenRouter jobs route JSON extraction', () => {
    it('extracts valid session JSON from prose before accepting a job result', () => {
      const extracted = extractOpenRouterJobSessionJson(`We need to produce JSON only.\n${JSON.stringify(validScript)}\nDone.`);
      expect(JSON.parse(extracted).title).toBe('Ein ruhiger Morgen');
    });

    it('repairs trailing commas before storing extracted session JSON', () => {
      const sloppyJson = JSON.stringify(validScript, null, 2)
        .replace('"intonationHint": "neutral"\n    }', '"intonationHint": "neutral",\n    }')
        .replace(/\n}$/, ',\n}');
      const extracted = extractOpenRouterJobSessionJson(`\`\`\`json\n${sloppyJson}\n\`\`\``);
      expect(JSON.parse(extracted).phrases[0].text).toBe(validScript.phrases[0].text);
    });

    it('extracts double-encoded session JSON returned as a JSON string', () => {
      const extracted = extractOpenRouterJobSessionJson(JSON.stringify(JSON.stringify(validScript)));
      expect(JSON.parse(extracted).inputMode).toBe('browser-tts');
    });

    it('extracts session JSON nested in a model wrapper string', () => {
      const extracted = extractOpenRouterJobSessionJson(
        JSON.stringify({
          reasoning: 'I will provide the final Dicta session JSON.',
          session_json: JSON.stringify(validScript),
        }),
      );
      expect(JSON.parse(extracted).title).toBe('Ein ruhiger Morgen');
    });

    it('rejects reasoning-only text without a valid session JSON object', () => {
      expect(
        extractOpenRouterJobSessionJson(
          'We need to produce JSON with specified fields. Let us craft about 12 phrases, each around 13 words.',
        ),
      ).toBe('');
    });
  });
}
