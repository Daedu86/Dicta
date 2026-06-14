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

function getUtteranceSetupSection(playbackLoop: string): string {
  const start = playbackLoop.indexOf('const utterance = new SpeechSynthesisUtterance(chunk.text);');
  if (start < 0) throw new Error('Could not find SpeechSynthesisUtterance setup.');

  const end = playbackLoop.indexOf('      utterance.onstart = () => {', start);
  if (end < 0) throw new Error('Could not find utterance handler setup boundary.');

  return playbackLoop.slice(start, end);
}

function getErrorHandlerSection(playbackLoop: string): string {
  const start = playbackLoop.indexOf('utterance.onerror = (event) => {');
  if (start < 0) throw new Error('Could not find utterance.onerror in playTtsFromWord.');

  const end = playbackLoop.indexOf('      perfDiagnostics.recordTtsSpeak(perfUtteranceId);', start);
  if (end < 0) throw new Error('Could not find end of utterance.onerror section.');

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

describe('Browser TTS utterance configuration contract', () => {
  it('keeps SpeechSynthesisUtterance configuration as a bounded extraction seam', () => {
    const setup = getUtteranceSetupSection(getPlayTtsFromWordSection());

    expectInOrder(setup, [
      'const utterance = new SpeechSynthesisUtterance(chunk.text);',
      'const perfUtteranceId = perfDiagnostics.beginTtsUtterance({',
      'chunkIndex,',
      'phraseLengthWords: chunk.wordCount,',
      'phraseLengthChars: chunk.text.length,',
      'language: ttsLanguage,',
      'pacingMode,',
      'voiceName: browserTtsVoice?.name,',
      'voiceURI: browserTtsVoice?.voiceURI ?? activeSession?.ttsVoiceURI ?? null,',
      'voiceLang: browserTtsVoice?.lang,',
      'voiceResolved: Boolean(browserTtsVoice),',
      'availableVoiceCount: browserTtsVoices.length,',
      'matchingVoiceCount: browserTtsVoices.filter((voice) => voice.lang.toLowerCase().startsWith(ttsLanguage)).length,',
      'utterance.rate = rate;',
      'utterance.pitch = 1;',
      'utterance.volume = 1;',
      'utterance.lang = getTtsVoiceLang(ttsLanguage);',
      'if (browserTtsVoice) {',
      'utterance.voice = browserTtsVoice;',
      'ttsUtteranceRef.current = utterance;',
    ]);
  });

  it('publishes current chunk state after the utterance is fully configured', () => {
    const setup = getUtteranceSetupSection(getPlayTtsFromWordSection());

    expectInOrder(setup, [
      'ttsUtteranceRef.current = utterance;',
      'setTtsCurrentChunk(chunk.text);',
      'setTtsPacingMode(pacingMode);',
      'setTtsSpeechRate(rate);',
      'ttsChunkStartMsRef.current = performance.now();',
      'ttsChunkStartWordIndexRef.current = chunk.startWordIndex;',
      'ttsChunkWordCountRef.current = chunk.wordCount;',
      'ttsCompletedSourceWordsRef.current = chunk.startWordIndex;',
      'recordTtsChunkTelemetry({',
      'recordAdaptiveBenchmark(chunkTelemetry, runtimeDecision, {',
      'setAdaptiveSemanticDebug((current) =>',
    ]);
  });

  it('keeps unexpected SpeechSynthesis errors paused, detached from the active utterance, and user-visible', () => {
    const onError = getErrorHandlerSection(getPlayTtsFromWordSection());

    expectInOrder(onError, [
      'perfDiagnostics.recordTtsError(perfUtteranceId, event.error || \'unknown\');',
      'if (cancelled) return;',
      'cancelled = true;',
      'ttsUtteranceRef.current = null;',
      "setTtsStatus('paused');",
      "setError('TTS playback stopped unexpectedly.');",
    ]);
  });
});
