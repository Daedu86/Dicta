import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(repoRoot, 'src/components/LowLatencyTextarea.tsx');
const source = readFileSync(sourcePath, 'utf-8');

function getTextareaJsx(): string {
  const match = source.match(/return \(\s*<textarea[\s\S]*?\n\s*\/?>\s*\);/);
  if (!match) throw new Error('Could not find LowLatencyTextarea textarea JSX block.');
  return match[0];
}

describe('LowLatencyTextarea low-latency contract', () => {
  it('keeps visible typing uncontrolled and avoids React state for draft text', () => {
    const textareaJsx = getTextareaJsx();

    expect(source).not.toMatch(/\buseState\b/);
    expect(textareaJsx).toContain('defaultValue={value}');
    expect(textareaJsx).not.toMatch(/\svalue=\{value\}/);
    expect(textareaJsx).toContain('onChange={(event) => setLocalAndSchedule(event.target.value)}');
  });

  it('preserves deferred commits and required flush paths', () => {
    expect(source).toContain('scheduleCommit();');
    expect(source).toContain('delayTimerRef.current = window.setTimeout');
    expect(source).toContain('maxDelayTimerRef.current = window.setTimeout');
    expect(source).toContain('flush: commitNow');
    expect(source).toContain('onBlur={(event) => {\n        commitNow();');
    expect(source).toContain('useEffect(() => () => {\n    commitNow();\n  }, []);');
    expect(source).toContain('const syncKeyChanged = syncKey !== lastSyncKeyRef.current;');
    expect(source).toContain('if (syncKeyChanged) {\n      commitNow();');
  });

  it('keeps Browser TTS live evaluation access via immediate local draft updates', () => {
    expect(source).toContain('onImmediateValueChange?: (value: string) => void;');
    expect(source).toContain('onImmediateValueChangeRef.current?.(nextValue);');
  });
});
