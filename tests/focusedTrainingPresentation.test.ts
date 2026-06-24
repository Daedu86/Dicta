import { describe, expect, it } from 'vitest';
import {
  buildFocusedProgressLabel,
  buildFocusedSourceLabel,
  buildFocusedTrainingMessage,
  buildFocusedTrainingMessageTone,
  buildFocusedTrainingPresentationState,
  clampFocusedProgress,
} from '../src/app/focusedTrainingPresentation';

describe('focused training presentation state', () => {
  it('clamps focused progress percentages', () => {
    expect(clampFocusedProgress(-10, 0, 100)).toBe(0);
    expect(clampFocusedProgress(50, 0, 100)).toBe(50);
    expect(clampFocusedProgress(150, 0, 100)).toBe(100);
  });

  it('builds TTS player progress values from transcript word count and spoken index', () => {
    const state = buildFocusedTrainingPresentationState({
      ttsTranscriptWordCount: 10,
      ttsHasText: true,
      ttsSpokenWordIndex: 5,
      ttsSpeechRate: 2,
      ttsLanguage: 'de',
      ttsBaseWordsPerSecond: 2,
      adaptiveSemanticCurrentPhraseIndex: 0,
      adaptiveSemanticTotalPhrases: 0,
      activeSessionFinished: false,
      ttsPracticeText: 'typed text',
      error: '',
      trainingSubmitMessage: '',
      exportMessage: '',
      openRouterJobStatus: '',
      openRouterError: '',
    });

    expect(state.ttsPlayerWordCount).toBe(10);
    expect(state.ttsPlayerCurrentWord).toBe(5);
    expect(state.ttsPlayerWordsPerSecond).toBe(4);
    expect(state.ttsPlayerDurationSec).toBe(2.5);
    expect(state.ttsPlayerCurrentSec).toBe(1.25);
    expect(state.ttsPlayerProgressPercent).toBe(50);
    expect(state.focusedProgressLabel).toBe('Word 5/10');
  });

  it('uses semantic phrase progress before word progress', () => {
    expect(
      buildFocusedProgressLabel({
        adaptiveSemanticCurrentPhraseIndex: 2,
        adaptiveSemanticTotalPhrases: 4,
        ttsPlayerCurrentWord: 8,
        ttsPlayerWordCount: 20,
      }),
    ).toBe('Phrase 3/4');
  });

  it('uses no-source progress and source labels when TTS has no text', () => {
    expect(
      buildFocusedProgressLabel({
        adaptiveSemanticCurrentPhraseIndex: 0,
        adaptiveSemanticTotalPhrases: 0,
        ttsPlayerCurrentWord: 0,
        ttsPlayerWordCount: 0,
      }),
    ).toBe('No source loaded');

    expect(
      buildFocusedSourceLabel({
        ttsHasText: false,
        ttsTranscriptWordCount: 0,
        ttsLanguage: 'de',
      }),
    ).toBe('TTS source not loaded');
  });

  it('builds focused source labels from loaded TTS text', () => {
    expect(
      buildFocusedSourceLabel({
        ttsHasText: true,
        ttsTranscriptWordCount: 12,
        ttsLanguage: 'es',
      }),
    ).toBe('12 words \u00b7 ES');
  });

  it('preserves focused text placeholder behavior', () => {
    const activeState = buildFocusedTrainingPresentationState({
      ttsTranscriptWordCount: 0,
      ttsHasText: false,
      ttsSpokenWordIndex: 0,
      ttsSpeechRate: 1,
      ttsLanguage: 'de',
      ttsBaseWordsPerSecond: 2.6,
      adaptiveSemanticCurrentPhraseIndex: 0,
      adaptiveSemanticTotalPhrases: 0,
      activeSessionFinished: false,
      ttsPracticeText: 'typed text',
      error: '',
      trainingSubmitMessage: '',
      exportMessage: '',
      openRouterJobStatus: '',
      openRouterError: '',
    });

    const finishedState = buildFocusedTrainingPresentationState({
      ...activeState,
      ttsTranscriptWordCount: 0,
      ttsHasText: false,
      ttsSpokenWordIndex: 0,
      ttsSpeechRate: 1,
      ttsLanguage: 'de',
      ttsBaseWordsPerSecond: 2.6,
      adaptiveSemanticCurrentPhraseIndex: 0,
      adaptiveSemanticTotalPhrases: 0,
      activeSessionFinished: true,
      ttsPracticeText: 'typed text',
      error: '',
      trainingSubmitMessage: '',
      exportMessage: '',
      openRouterJobStatus: '',
      openRouterError: '',
    });

    expect(activeState.focusedTextValue).toBe('typed text');
    expect(activeState.focusedTextPlaceholder).toBe('Type the dictation here...');
    expect(finishedState.focusedTextPlaceholder).toBe('Session submitted.');
  });

  it('prioritizes focused training messages and tones like App.tsx did', () => {
    expect(
      buildFocusedTrainingMessage({
        error: 'Hard error',
        trainingSubmitMessage: 'Saved',
        exportMessage: 'Exported',
        openRouterJobStatus: 'Running',
        openRouterError: 'Model error',
      }),
    ).toBe('Hard error');
    expect(buildFocusedTrainingMessageTone({ error: 'Hard error', trainingSubmitMessage: 'Saved' })).toBe('error');

    expect(
      buildFocusedTrainingMessage({
        error: '',
        trainingSubmitMessage: 'Saved',
        exportMessage: 'Exported',
        openRouterJobStatus: 'Running',
        openRouterError: 'Model error',
      }),
    ).toBe('Saved');
    expect(buildFocusedTrainingMessageTone({ error: '', trainingSubmitMessage: 'Saved' })).toBe('success');

    expect(
      buildFocusedTrainingMessage({
        error: '',
        trainingSubmitMessage: '',
        exportMessage: 'Exported',
        openRouterJobStatus: 'Running',
        openRouterError: '',
      }),
    ).toBe('Exported Running');
    expect(buildFocusedTrainingMessageTone({ error: '', trainingSubmitMessage: '' })).toBe('hint');
  });
});
