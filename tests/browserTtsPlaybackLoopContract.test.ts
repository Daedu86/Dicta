import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appSource = readFileSync(resolve(repoRoot, 'src/App.tsx'), 'utf-8');

function getPlayTtsFromWordSection(): string {
  const start = appSource.indexOf('function playTtsFromWord(');
  if (start < 0) throw new Error('Could not find playTtsFromWord in App.tsx.');

  const end = appSource.indexOf('  const { importDictaLocalStorageSnapshot', start);
  if (end < 0) throw new Error('Could not find end of playTtsFromWord section.');

  return appSource.slice(start, end);
}

function getOnEndSection(playbackLoop: string): string {
  const start = playbackLoop.indexOf('utterance.onend = () => {');
  if (start < 0) throw new Error('Could not find utterance.onend in playTtsFromWord.');

  const end = playbackLoop.indexOf('      utterance.onerror =', start);
  if (end < 0) throw new Error('Could not find end of utterance.onend section.');

  return playbackLoop.slice(start, end);
}

function expectInOrder(source: string, labels: string[]): void {
  let cursor = 0;

  for (const label of labels) {
    const index = source.indexOf(label, cursor);
    expect(index, `Expected "${label}" after offset ${cursor}`).toBeGreaterThanOrEqual(0);
    cursor = index + label.length;
  }
}

describe('Browser TTS playback loop contract', () => {
  it('keeps the SpeechSynthesis loop in App while delegating only bounded pure seams', () => {
    const playbackLoop = getPlayTtsFromWordSection();

    expect(playbackLoop).toContain('const speakNext = () => {');
    expect(playbackLoop).toContain('buildBrowserTtsPlaybackStartPlan({');
    expect(playbackLoop).toContain('buildBrowserTtsPlaybackPlan({');
    expect(playbackLoop).toContain('new SpeechSynthesisUtterance(chunk.text)');
    expect(playbackLoop).toContain('utterance.onstart = () => {');
    expect(playbackLoop).toContain('utterance.onend = () => {');
    expect(playbackLoop).toContain('utterance.onerror = (event) => {');
    expect(playbackLoop).toContain('completeBrowserTtsChunk({');
    expect(playbackLoop).toContain('buildBrowserTtsPhraseCompletionTelemetry({');
    expect(playbackLoop).toContain('buildBrowserTtsChunkCompletionDebugUpdate({');
    expect(playbackLoop).toContain('speakBrowserTts(utterance)');
  });

  it('preserves playback start and chunk execution sequencing', () => {
    const playbackLoop = getPlayTtsFromWordSection();

    expectInOrder(playbackLoop, [
      'stopTtsPlayback();',
      'buildBrowserTtsPlaybackStartPlan({',
      'resolveActiveBrowserTtsVoice();',
      'collectBrowserTtsEnvironmentForSession(',
      'const speakNext = () => {',
      'buildBrowserTtsPlaybackPlan({',
      'new SpeechSynthesisUtterance(chunk.text)',
      'ttsUtteranceRef.current = utterance;',
      'recordTtsChunkTelemetry({',
      'recordAdaptiveBenchmark(chunkTelemetry, runtimeDecision, {',
      'utterance.onstart = () => {',
      'utterance.onend = () => {',
      'utterance.onerror = (event) => {',
      'perfDiagnostics.recordTtsSpeak(perfUtteranceId);',
      'speakBrowserTts(utterance);',
    ]);
  });

  it('preserves onend chunk completion, DE completion telemetry, and next-chunk scheduling order', () => {
    const onEnd = getOnEndSection(getPlayTtsFromWordSection());

    expectInOrder(onEnd, [
      'completeBrowserTtsChunk({',
      'ttsCompletedSourceWordsRef.current = chunkCompletion.completedSourceWords;',
      "recordPhrasePlaybackEvent('phrase_completed'",
      "normalizeBenchmarkLanguage(ttsLanguage) === 'de'",
      'applyTtsPerformanceSample();',
      'buildBrowserTtsPhraseCompletionTelemetry({',
      'recordAdaptiveBenchmark(completionTelemetry, runtimeDecision, {',
      "event: 'phrase_completed'",
      'chunkIndex += 1;',
      'macroPhraseIndex = chunkCompletion.nextMacroPhraseIndex;',
      'macroWordOffset = chunkCompletion.nextMacroWordOffset;',
      'ttsSemanticPhraseAdvanceCountRef.current += 1;',
      "recordPhrasePlaybackEvent('phrase_advanced'",
      'setAdaptiveSemanticDebug((current) =>',
      'buildBrowserTtsChunkCompletionDebugUpdate({',
      'scheduleBrowserTtsNextChunk({',
      'shouldPauseBeforeNextChunk: chunkCompletion.shouldPauseBeforeNextChunk,',
      'pauseBeforeNextChunkMs: chunkCompletion.pauseBeforeNextChunkMs,',
      'scheduleTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),',
      'speakNext,',
      '});',
    ]);
  });
});
