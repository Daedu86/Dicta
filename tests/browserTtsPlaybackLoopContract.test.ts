import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appSource = readFileSync(resolve(repoRoot, 'src/App.tsx'), 'utf-8');
const focusedTrainingSource = readFileSync(resolve(repoRoot, 'src/app/useFocusedTrainingRuntime.ts'), 'utf-8');
const orchestrationSource = readFileSync(resolve(repoRoot, 'src/app/useTtsSessionOrchestrationRuntime.ts'), 'utf-8');
const playbackLoopSource = readFileSync(resolve(repoRoot, 'src/app/useBrowserTtsPlaybackLoop.ts'), 'utf-8');

describe('Browser TTS playback loop contract', () => {
  it('keeps App delegating playback through the focused training and TTS orchestration runtimes', () => {
    expect(appSource).toContain("import { useFocusedTrainingRuntime } from './app/useFocusedTrainingRuntime';");
    expect(appSource).toContain('useFocusedTrainingRuntime({');
    expect(appSource).not.toContain("import { useBrowserTtsPlaybackLoop } from './app/useBrowserTtsPlaybackLoop';");
    expect(appSource).not.toContain('useBrowserTtsPlaybackLoop({');
    expect(appSource).not.toContain('function playTtsFromWord(');

    expect(focusedTrainingSource).toContain("import { useTtsSessionOrchestrationRuntime } from './useTtsSessionOrchestrationRuntime';");
    expect(focusedTrainingSource).toContain('useTtsSessionOrchestrationRuntime({');

    expect(orchestrationSource).toContain("import { useBrowserTtsPlaybackLoop } from './useBrowserTtsPlaybackLoop';");
    expect(orchestrationSource).toContain('useBrowserTtsPlaybackLoop({');
    expect(orchestrationSource).not.toContain('function playTtsFromWord(');
  });

  it('keeps the playback loop owning chunked browser TTS playback internals', () => {
    expect(playbackLoopSource).toContain('function playTtsFromWord(');
    expect(playbackLoopSource).toContain('speakBrowserTts(utterance);');
    expect(playbackLoopSource).toContain('recordTtsChunkTelemetry(');
    expect(playbackLoopSource).toContain('applyTtsPerformanceSample(');
  });
});
