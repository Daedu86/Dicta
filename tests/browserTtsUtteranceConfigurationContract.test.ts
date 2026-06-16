import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { configureBrowserTtsUtterance } from '../src/app/browserTtsUtteranceConfiguration';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const playbackLoopActionsSource = readFileSync(resolve(repoRoot, 'src/app/browserTtsPlaybackLoopActions.ts'), 'utf-8');
const playbackLoopRunnerSource = readFileSync(resolve(repoRoot, 'src/app/browserTtsPlaybackLoopRunner.ts'), 'utf-8');
const playbackLoopChunkSpeakerSource = readFileSync(resolve(repoRoot, 'src/app/browserTtsPlaybackLoopChunkSpeaker.ts'), 'utf-8');
const playbackLoopUtteranceSource = readFileSync(resolve(repoRoot, 'src/app/browserTtsPlaybackLoopUtterance.ts'), 'utf-8');
const playbackLoopChunkCommitSource = readFileSync(resolve(repoRoot, 'src/app/browserTtsPlaybackLoopChunkCommit.ts'), 'utf-8');
const playbackLoopErrorHandlerSource = readFileSync(
  resolve(repoRoot, 'src/app/browserTtsPlaybackLoopErrorHandler.ts'),
  'utf-8',
);
const playbackLoopUtteranceLifecycleSource = readFileSync(
  resolve(repoRoot, 'src/app/browserTtsUtteranceLifecycle.ts'),
  'utf-8',
);
const playbackLoopUtteranceHandlersSource = readFileSync(
  resolve(repoRoot, 'src/app/browserTtsPlaybackLoopUtteranceHandlers.ts'),
  'utf-8',
);


function expectInOrder(source: string, labels: string[]): void {
  let cursor = 0;

  for (const label of labels) {
    const index = source.indexOf(label, cursor);
    expect(index, `Expected "${label}" after offset ${cursor}`).toBeGreaterThanOrEqual(0);
    cursor = index + label.length;
  }
}

function createUtterance(): SpeechSynthesisUtterance {
  return {
    rate: 0,
    pitch: 0,
    volume: 0,
    lang: '',
  } as SpeechSynthesisUtterance;
}

function createVoice(overrides: Partial<SpeechSynthesisVoice> = {}): SpeechSynthesisVoice {
  return {
    default: false,
    lang: 'de-DE',
    localService: true,
    name: 'Anna',
    voiceURI: 'voice-de',
    ...overrides,
  } as SpeechSynthesisVoice;
}

describe('configureBrowserTtsUtterance', () => {
  it('sets playback parameters, resolved language, and resolved voice on the utterance', () => {
    const voice = createVoice({ name: 'Anna', lang: 'de-DE', voiceURI: 'anna-de' });
    const utterance = createUtterance();

    const configured = configureBrowserTtsUtterance({
      utterance,
      rate: 0.85,
      language: 'de',
      voice,
    });

    expect(configured).toBe(utterance);
    expect(utterance.rate).toBe(0.85);
    expect(utterance.pitch).toBe(1);
    expect(utterance.volume).toBe(1);
    expect(utterance.lang).toBe('de-DE');
    expect(utterance.voice).toBe(voice);
  });

  it('keeps voice unset when no browser voice is resolved', () => {
    const utterance = createUtterance();

    configureBrowserTtsUtterance({
      utterance,
      rate: 1.15,
      language: 'es',
      voice: null,
    });

    expect(utterance.rate).toBe(1.15);
    expect(utterance.pitch).toBe(1);
    expect(utterance.volume).toBe(1);
    expect(utterance.lang).toBe('es-ES');
    expect('voice' in utterance).toBe(false);
  });
});

describe('Browser TTS utterance configuration contract', () => {
  it('keeps SpeechSynthesisUtterance configuration as a bounded extraction seam', () => {
    expect(playbackLoopActionsSource).toContain('function playTtsFromWord(');
    expect(playbackLoopActionsSource).toContain('runBrowserTtsPlaybackLoop({');
    expect(playbackLoopRunnerSource).toContain('speakBrowserTtsPlaybackLoopChunk(');

    expectInOrder(playbackLoopChunkSpeakerSource, [
      'const { utterance, perfUtteranceId } = createBrowserTtsPlaybackUtterance({',
      'input.playbackRuntime.ttsUtteranceRef.current = utterance;',
      'commitBrowserTtsPlaybackLoopChunk({',
      'attachBrowserTtsPlaybackLoopUtteranceHandlers({',
      'input.telemetryContext.perfDiagnostics.recordTtsSpeak(perfUtteranceId);',
      'input.playbackRuntime.speakBrowserTts(utterance);',
    ]);

    expectInOrder(playbackLoopUtteranceSource, [
      'const utterance = new SpeechSynthesisUtterance(chunk.text);',
      'const perfUtteranceId = perfDiagnostics.beginTtsUtterance(',
      'buildBrowserTtsUtterancePerfMetadata({',
      'playId: perfPlayId,',
      'chunkIndex,',
      'phraseLengthWords: chunk.wordCount,',
      'phraseLengthChars: chunk.text.length,',
      'language: ttsLanguage,',
      'pacingMode,',
      'voice: browserTtsVoice,',
      'sessionVoiceURI: activeSession?.ttsVoiceURI ?? null,',
      'availableVoices: browserTtsVoices,',
      '}),',
      ');',
      'configureBrowserTtsUtterance({',
      'utterance,',
      'rate,',
      'language: ttsLanguage,',
      'voice: browserTtsVoice,',
      'return { utterance, perfUtteranceId };',
    ]);
  });

  it('publishes current chunk state after the utterance is fully configured', () => {
    expectInOrder(playbackLoopChunkCommitSource, [
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
    expectInOrder(playbackLoopChunkSpeakerSource, [
      'attachBrowserTtsPlaybackLoopUtteranceHandlers({',
      'error: (event) => ({',
      'error: event.error,',
      'cancelled,',
      'ttsUtteranceRef',
      'setTtsStatus',
      'setError',
      'setCancelled: (nextCancelled: boolean) => {',
      'cancelled = nextCancelled;',
    ]);

    expectInOrder(playbackLoopUtteranceHandlersSource, [
      'onError:',
      'handleBrowserTtsPlaybackLoopError(error(event));',
    ]);

    expectInOrder(playbackLoopErrorHandlerSource, [
      'const errorPlan = buildBrowserTtsUnexpectedErrorPlan({',
      'error,',
      'cancelled,',
      '});',
      'perfDiagnostics.recordTtsError(perfUtteranceId, errorPlan.recordedError);',
      'if (!errorPlan.shouldApplyState) return;',
      'setCancelled(errorPlan.nextCancelled);',
      'ttsUtteranceRef.current = null;',
      "setTtsStatus('paused');",
      'setError(errorPlan.userErrorMessage);',
    ]);

    expectInOrder(playbackLoopUtteranceLifecycleSource, [
      'utterance.onstart = onStart;',
      'utterance.onend = onEnd;',
      'utterance.onerror = onError;',
    ]);
  });

});
