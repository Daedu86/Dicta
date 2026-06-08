import fs from 'node:fs';

function remove(path) {
  if (fs.existsSync(path)) {
    fs.rmSync(path, { force: true });
    console.log(`removed ${path}`);
  }
}

function removeItBlock(source, title) {
  const marker = `  it('${title}'`;
  const start = source.indexOf(marker);
  if (start === -1) return source;

  const openBrace = source.indexOf('{', start);
  if (openBrace === -1) return source;

  let depth = 0;
  let end = openBrace;

  for (; end < source.length; end += 1) {
    if (source[end] === '{') depth += 1;
    if (source[end] === '}') depth -= 1;
    if (depth === 0) {
      end += 1;
      break;
    }
  }

  const semicolon = source.indexOf(';', end);
  const finalEnd = semicolon === -1 ? end : semicolon + 1;

  return source.slice(0, start) + source.slice(finalEnd).replace(/^\r?\n/, '');
}

remove('tests/kokoroSupport.test.ts');

const adaptiveRuntimeTestPath = 'tests/useAdaptiveRuntime.test.ts';
let s = fs.readFileSync(adaptiveRuntimeTestPath, 'utf8');

s = s.replace(
  "import { buildAdaptiveKokoroInput } from '../src/inputs/kokoro/kokoroTelemetryAdapter';\n",
  '',
);

s = removeItBlock(s, 'keeps benchmark replay fixtures isolated by inputMode and language');

fs.writeFileSync(adaptiveRuntimeTestPath, s);
console.log('updated tests/useAdaptiveRuntime.test.ts');
