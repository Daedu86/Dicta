import { describe, expect, it } from 'vitest';
import { configureBrowserTtsUtterance } from '../src/app/browserTtsUtteranceConfiguration';
import {
  createUtterance,
  createVoice,
} from './helpers/browserTtsUtteranceConfigurationFixtures';
import {
  expectInOrder,
  readRepoSource,
} from './helpers/sourceOrderExpectations';

const playbackLoopActionsSource = readRepoSource('src/app/browserTtsPlaybackLoopActions.ts');
const playbackLoopRunnerSource = readRepoSource('src/app/browserTtsPlaybackLoopRunner.ts');
const playbackLoopChunkSpeakerSource = readRepoSource('src/app/browserTtsPlaybackLoopChunkSpeaker.ts');
const playbackLoopChunkHandlersSource = readRepoSource('src/app/browserTtsPlaybackLoopChunkHandlers.ts');
const playbackLoopChunkUtteranceRuntimeSource = readRepoSource('src/app/browserTtsPlaybackLoopChunkUtteranceRuntime.ts');
const playbackLoopUtteranceSource = readRepoSource('src/app/browserTtsPlaybackLoopUtterance.ts');
const playbackLoopChunkCommitSource = readRepoSource('src/app/browserTtsPlaybackLoopChunkCommit.ts');
const playbackLoopErrorHandlerSource = readRepoSource('src/app/browserTtsPlaybackLoopErrorHandler.ts');
const playbackLoopUtteranceLifecycleSource = readRepoSource('src/app/browserTtsUtteranceLifecycle.ts');
const playbackLoopUtteranceHandlersSource = readRepoSource('src/app/browserTtsPlaybackLoopUtteranceHandlers.ts');

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
      'const { utterance, perfUtteranceId } = createBrowserTtsPlaybackLoopChunkUtterance(input, playbackPlan);',
      'commitBrowserTtsPlaybackLoopRuntimeChunk(input, playbackPlan);',
      'attachBrowserTtsPlaybackLoopChunkHandlers({ input, playbackPlan, perfUtteranceId, utterance });',
      'input.telemetryContext.perfDiagnostics.recordTtsSpeak(perfUtteranceId);',
      'input.playbackRuntime.speakBrowserTts(utterance);',
    ]);

    expectInOrder(playbackLoopChunkUtteranceRuntimeSource, [
      'const utteranceRuntime = createBrowserTtsPlaybackUtterance({',
      'input.playbackRuntime.ttsUtteranceRef.current = utteranceRuntime.utterance;',
      'return utteranceRuntime;',
    ]);

    expectInOrder(playbackLoopUtteranceSource, [
      'const utterance = new SpeechSynthesisUtterance(chunk.text);',
      'const voiceCalibration = calibrateBrowserTtsVoiceRate({',
      'requestedRate: rate,',
      'voice: browserTtsVoice,',
      'environment: activeSession?.ttsEnvironment ?? null,',
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
      'voiceCalibration,',
      '}),',
      ');',
      'configureBrowserTtsUtterance({',
      'utterance,',
      'rate: voiceCalibration.effectiveRate,',
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
    expectInOrder(playbackLoopChunkHandlersSource, [
      'attachBrowserTtsPlaybackLoopUtteranceHandlers({',
      'error: (event) => ({',
      'error: event.error,',
      'cancelled,',
      'ttsUtteranceRef: input.playbackRuntime.ttsUtteranceRef,',
      'setTtsStatus: input.uiContext.setTtsStatus,',
      'setError: input.uiContext.setError,',
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
