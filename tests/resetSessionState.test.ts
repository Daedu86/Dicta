import { describe, expect, it } from 'vitest';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';
import { createDefaultTtsPublishedUiState } from '../src/app/activeSessionHydration';
import { buildResetSessionState } from '../src/app/resetSessionState';

describe('reset session state', () => {
  it('builds reset defaults for an unlocked Browser TTS session with source text', () => {
    const state = buildResetSessionState({
      preserveInputSettingsLock: false,
      inputSettingsLocked: true,
      ttsText: ' Hallo Welt ',
      activeInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    });

    expect(state).toEqual({
      nextInputSettingsLocked: false,
      ttsPracticeText: '',
      ttsStatus: 'ready',
      ttsCurrentChunk: '',
      ttsPacingMode: 'balanced',
      ttsSpeechRate: 1,
      running: false,
      rate: 1,
      lagSec: 0,
      lagWords: 0,
      wpm: 0,
      accuracy: 100,
      controllerState: 'hold',
      publishedUi: createDefaultTtsPublishedUiState(),
      sessionStatus: 'ready',
      trainingSubmitMessage: '',
      shouldExpandTtsSetup: true,
      refs: {
        ttsStartedAtMs: null,
        ttsChunkStartMs: null,
        ttsChunkStartWordIndex: 0,
        ttsChunkWordCount: 0,
        ttsCompletedSourceWords: 0,
        ttsLastControllerAction: 'hold',
        ttsUiLastPublishedAt: 0,
        telemetry: null,
      },
    });
  });

  it('keeps the input settings lock when requested', () => {
    const state = buildResetSessionState({
      preserveInputSettingsLock: true,
      inputSettingsLocked: true,
      ttsText: 'Hallo',
      activeInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    });

    expect(state.nextInputSettingsLocked).toBe(true);
    expect(state.shouldExpandTtsSetup).toBe(false);
    expect(state.ttsStatus).toBe('ready');
  });

  it('falls back to idle status when no TTS text remains', () => {
    const state = buildResetSessionState({
      preserveInputSettingsLock: false,
      inputSettingsLocked: false,
      ttsText: '   ',
      activeInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    });

    expect(state.ttsStatus).toBe('idle');
    expect(state.shouldExpandTtsSetup).toBe(true);
  });

  it('does not expand Browser TTS setup for non-Browser TTS modes', () => {
    const state = buildResetSessionState({
      preserveInputSettingsLock: false,
      inputSettingsLocked: true,
      ttsText: 'Hallo',
      activeInputMode: 'keyboard',
    });

    expect(state.nextInputSettingsLocked).toBe(false);
    expect(state.shouldExpandTtsSetup).toBe(false);
  });
  it('builds reset defaults for playback refs without mutating refs directly', () => {
    const state = buildResetSessionState({
      preserveInputSettingsLock: false,
      inputSettingsLocked: false,
      ttsText: 'Hallo',
      activeInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    });

    expect(state.refs).toEqual({
      ttsStartedAtMs: null,
      ttsChunkStartMs: null,
      ttsChunkStartWordIndex: 0,
      ttsChunkWordCount: 0,
      ttsCompletedSourceWords: 0,
      ttsLastControllerAction: 'hold',
      ttsUiLastPublishedAt: 0,
      telemetry: null,
    });
  });

});
