import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appRuntimeSource = readFileSync(resolve(repoRoot, 'src/app/DictaAppRuntimeRoot.tsx'), 'utf-8');
const dictaRootFocusedTrainingSource = readFileSync(resolve(repoRoot, 'src/app/useDictaRootFocusedTrainingRuntime.ts'), 'utf-8');
const dictaFocusedTrainingSource = readFileSync(resolve(repoRoot, 'src/app/useDictaFocusedTrainingRuntime.ts'), 'utf-8');
const focusedTrainingSource = readFileSync(resolve(repoRoot, 'src/app/useFocusedTrainingRuntime.ts'), 'utf-8');
const orchestrationSource = readFileSync(resolve(repoRoot, 'src/app/useTtsSessionOrchestrationRuntime.ts'), 'utf-8');
const playbackLoopSource = readFileSync(resolve(repoRoot, 'src/app/useBrowserTtsPlaybackLoop.ts'), 'utf-8');
const playbackLoopChunkCommitSource = readFileSync(resolve(repoRoot, 'src/app/browserTtsPlaybackLoopChunkCommit.ts'), 'utf-8');
const playbackLoopCompletionSource = readFileSync(resolve(repoRoot, 'src/app/browserTtsPlaybackLoopCompletionHandler.ts'), 'utf-8');

describe('Browser TTS playback loop contract', () => {
  it('keeps DictaAppRuntime delegating playback through root, focused training, and TTS orchestration runtimes', () => {
    expect(appRuntimeSource).toContain("import { useDictaRootFocusedTrainingRuntime } from './useDictaRootFocusedTrainingRuntime';");
    expect(appRuntimeSource).toContain('useDictaRootFocusedTrainingRuntime({');
    expect(appRuntimeSource).not.toContain("import { useDictaFocusedTrainingRuntime } from './useDictaFocusedTrainingRuntime';");
    expect(appRuntimeSource).not.toContain("import { useFocusedTrainingRuntime } from './useFocusedTrainingRuntime';");
    expect(appRuntimeSource).not.toContain('useFocusedTrainingRuntime({');

    expect(dictaRootFocusedTrainingSource).toContain("import { useDictaFocusedTrainingRuntime } from './useDictaFocusedTrainingRuntime';");
    expect(dictaRootFocusedTrainingSource).toContain('useDictaFocusedTrainingRuntime({');

    expect(dictaFocusedTrainingSource).toContain("import { useFocusedTrainingRuntime } from './useFocusedTrainingRuntime';");
    expect(dictaFocusedTrainingSource).toContain('useFocusedTrainingRuntime({');

    expect(appRuntimeSource).not.toContain("import { useBrowserTtsPlaybackLoop } from './useBrowserTtsPlaybackLoop';");
    expect(appRuntimeSource).not.toContain('useBrowserTtsPlaybackLoop({');
    expect(appRuntimeSource).not.toContain('function playTtsFromWord(');

    expect(focusedTrainingSource).toContain("import { useTtsSessionOrchestrationRuntime } from './useTtsSessionOrchestrationRuntime';");
    expect(focusedTrainingSource).toContain('useTtsSessionOrchestrationRuntime({');

    expect(orchestrationSource).toContain("import { useBrowserTtsPlaybackLoop } from './useBrowserTtsPlaybackLoop';");
    expect(orchestrationSource).toContain('useBrowserTtsPlaybackLoop({');
    expect(orchestrationSource).not.toContain('function playTtsFromWord(');
  });

  it('keeps the playback loop owning chunked browser TTS playback internals through extracted seams', () => {
    expect(playbackLoopSource).toContain('function playTtsFromWord(');
    expect(playbackLoopSource).toContain('commitBrowserTtsPlaybackLoopChunk({');
    expect(playbackLoopSource).toContain('handleBrowserTtsPlaybackLoopChunkEnd({');
    expect(playbackLoopSource).toContain('speakBrowserTts(utterance);');
    expect(playbackLoopChunkCommitSource).toContain('recordTtsChunkTelemetry({');
    expect(playbackLoopCompletionSource).toContain('applyTtsPerformanceSample(');
  });
});
