import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  describe,
  expect,
  it,
} from 'vitest';

const repoRoot = resolve(__dirname, '..');
const source = [
  readFileSync(resolve(repoRoot, 'src/App.tsx'), 'utf-8'),
  readFileSync(resolve(repoRoot, 'src/app/AppRouteRenderer.tsx'), 'utf-8'),
  readFileSync(resolve(repoRoot, 'src/app/useOpenRouterGenerationActions.ts'), 'utf-8'),
].join('\n');

function findMatchingBrace(sourceText: string, bodyStart: number): number {
  let depth = 0;
  for (let index = bodyStart; index < sourceText.length; index += 1) {
    const character = sourceText[index];
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function getFunctionBody(name: string): string {
  const constStart = source.indexOf(`const ${name} =`);
  let bodyStart: number;

  if (constStart !== -1) {
    const arrowStart = source.indexOf('=>', constStart);
    if (arrowStart === -1) throw new Error(`Could not parse callback for function ${name}.`);
    bodyStart = source.indexOf('{', arrowStart);
  } else {
    const functionStart = source.indexOf(`function ${name}(`);
    if (functionStart === -1) throw new Error(`Missing function ${name}.`);
    bodyStart = source.indexOf('{', functionStart);
  }

  if (bodyStart === -1) throw new Error(`Could not parse body for function ${name}.`);
  const bodyEnd = findMatchingBrace(source, bodyStart);
  if (bodyEnd === -1) throw new Error(`Could not parse complete body for function ${name}.`);

  return source.slice(bodyStart, bodyEnd + 1);
}

describe('training OpenRouter language contract', () => {
  it('uses the global Dicta language selector for focused-training generation paths', () => {
    const openOpenRouterGenerateBody = getFunctionBody('openOpenRouterGenerateForActiveInput');

    expect(source).toContain('dictaLanguageView');
    expect(openOpenRouterGenerateBody).toContain('dictaLanguageView');
    expect(openOpenRouterGenerateBody).toContain('setSelectedBenchmarkLanguage(plan.language)');
    expect(openOpenRouterGenerateBody).not.toContain("setSelectedBenchmarkLanguage('en')");
    expect(openOpenRouterGenerateBody).not.toContain("setSelectedBenchmarkLanguage('es')");
    expect(openOpenRouterGenerateBody).not.toContain("setSelectedBenchmarkLanguage('de')");
    expect(openOpenRouterGenerateBody).not.toContain("setSelectedBenchmarkLanguage('fr')");
    expect(openOpenRouterGenerateBody).not.toContain("setSelectedBenchmarkLanguage('pt')");
  });

  it('wires the focused-training header selector to the same global language state', () => {
    expect(source).toContain('selectedLanguage={dictaLanguageView}');
    expect(source).toContain('onChangeLanguage={setDictaLanguageView}');
  });
});
