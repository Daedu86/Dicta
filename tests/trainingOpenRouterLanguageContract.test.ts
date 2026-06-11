import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appSource = readFileSync(resolve(repoRoot, 'src/App.tsx'), 'utf-8');
const openRouterGenerationActionsSource = readFileSync(resolve(repoRoot, 'src/app/useOpenRouterGenerationActions.ts'), 'utf-8');

function getFunctionBody(source: string, name: string): string {
  const functionStart = source.indexOf(`function ${name}`);
  if (functionStart !== -1) return getBlockAfterParameters(source, functionStart, name);

  const constStart = source.indexOf(`const ${name} =`);
  if (constStart === -1) throw new Error(`Missing function ${name}.`);
  const arrowStart = source.indexOf('=>', constStart);
  if (arrowStart === -1) throw new Error(`Could not parse callback for function ${name}.`);
  return getBalancedBlock(source, source.indexOf('{', arrowStart), name);
}

function getBlockAfterParameters(source: string, start: number, name: string): string {
  const paramsStart = source.indexOf('(', start);
  const paramsEnd = findMatchingParen(source, paramsStart, name);
  return getBalancedBlock(source, source.indexOf('{', paramsEnd), name);
}

function findMatchingParen(source: string, start: number, name: string): number {
  if (start === -1) throw new Error(`Missing function ${name}.`);
  let paramsDepth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') paramsDepth += 1;
    if (char === ')') paramsDepth -= 1;
    if (paramsDepth === 0) return index;
  }
  throw new Error(`Could not parse parameters for function ${name}.`);
}

function getBalancedBlock(source: string, bodyStart: number, name: string): string {
  if (bodyStart === -1) throw new Error(`Could not find body for function ${name}.`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return source.slice(bodyStart + 1, index);
  }
  throw new Error(`Could not parse function ${name}.`);
}

describe('training OpenRouter language contract', () => {
  it('uses the global Dicta language selector for focused-training generation paths', () => {
    for (const [source, functionName] of [
      [openRouterGenerationActionsSource, 'openOpenRouterGenerateForActiveInput'],
      [openRouterGenerationActionsSource, 'generateDirectSessionFromOpenRouter'],
      [appSource, 'openAdaptiveExportsForActiveInput'],
    ] as const) {
      const body = getFunctionBody(source, functionName);
      expect(body).toContain('const language: BenchmarkLanguageButton = dictaLanguageView;');
      expect(body).not.toContain('resolveStoredSessionLanguage(activeSession)');
    }
  });

  it('wires the focused-training header selector to the same global language state', () => {
    expect(appSource).toContain('selectedLanguage={dictaLanguageView}');
    expect(appSource).toContain('onChangeLanguage={setDictaLanguageView}');
  });
});
