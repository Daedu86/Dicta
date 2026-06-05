import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appSource = readFileSync(resolve(repoRoot, 'src/App.tsx'), 'utf-8');

function getFunctionBody(name: string): string {
  const start = appSource.indexOf(`function ${name}`);
  if (start === -1) throw new Error(`Missing function ${name}.`);
  const paramsStart = appSource.indexOf('(', start);
  let paramsDepth = 0;
  let paramsEnd = -1;
  for (let index = paramsStart; index < appSource.length; index += 1) {
    const char = appSource[index];
    if (char === '(') paramsDepth += 1;
    if (char === ')') paramsDepth -= 1;
    if (paramsDepth === 0) {
      paramsEnd = index;
      break;
    }
  }
  if (paramsEnd === -1) throw new Error(`Could not parse parameters for function ${name}.`);
  const bodyStart = appSource.indexOf('{', paramsEnd);
  let depth = 0;
  for (let index = bodyStart; index < appSource.length; index += 1) {
    const char = appSource[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return appSource.slice(bodyStart + 1, index);
  }
  throw new Error(`Could not parse function ${name}.`);
}

describe('training OpenRouter language contract', () => {
  it('uses the global Dicta language selector for focused-training generation paths', () => {
    for (const functionName of [
      'openOpenRouterGenerateForActiveInput',
      'generateDirectSessionFromOpenRouter',
      'openAdaptiveExportsForActiveInput',
    ]) {
      const body = getFunctionBody(functionName);
      expect(body).toContain('const language: BenchmarkLanguageButton = dictaLanguageView;');
      expect(body).not.toContain('resolveStoredSessionLanguage(activeSession)');
    }
  });

  it('wires the focused-training header selector to the same global language state', () => {
    expect(appSource).toContain('selectedLanguage={dictaLanguageView}');
    expect(appSource).toContain('onChangeLanguage={setDictaLanguageView}');
  });
});
