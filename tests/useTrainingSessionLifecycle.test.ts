/**
 * @vitest-environment jsdom
 */

import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { deriveTrainingLifecycleState } from '../src/app/useTrainingSessionLifecycle';
import {
  cleanupTrainingSessionLifecycleHarness,
  createDefaultState,
  renderTrainingSessionLifecycle,
} from './helpers/trainingSessionLifecycleHarness';

afterEach(async () => {
  await cleanupTrainingSessionLifecycleHarness();
});

describe('deriveTrainingLifecycleState', () => {
  it('marks Browser TTS input settings ready only when TTS text exists', () => {
    expect(deriveTrainingLifecycleState(createDefaultState())).toMatchObject({
      inputSettingsReady: true,
      setupLocked: false,
      canSubmitTtsSession: true,
      readyChecklist: [{ label: 'TTS source loaded', ready: true }],
    });

    expect(deriveTrainingLifecycleState(createDefaultState({ ttsHasText: false }))).toMatchObject({
      inputSettingsReady: false,
      canSubmitTtsSession: false,
      readyChecklist: [{ label: 'TTS source loaded', ready: false }],
    });
  });

  it('locks setup for finished, error, or input-settings-locked sessions', () => {
    expect(deriveTrainingLifecycleState(createDefaultState({ activeSessionFinished: true })).setupLocked).toBe(true);
    expect(deriveTrainingLifecycleState(createDefaultState({ sessionStatus: 'error' })).setupLocked).toBe(true);
    expect(deriveTrainingLifecycleState(createDefaultState({ inputSettingsLocked: true })).setupLocked).toBe(true);
  });
});

describe('useTrainingSessionLifecycle', () => {
  it('resets focused training attempts while preserving the input settings lock', async () => {
    const { lifecycle, actions } = await renderTrainingSessionLifecycle();

    act(() => {
      lifecycle.resetFocusedTrainingAttempt();
    });

    expect(actions.resetSession).toHaveBeenCalledTimes(1);
    expect(actions.resetSession).toHaveBeenCalledWith({ preserveInputSettingsLock: true });
  });

  it('wires the focused reset control to the same preserve-lock reset action', async () => {
    const { lifecycle, actions } = await renderTrainingSessionLifecycle();

    act(() => {
      lifecycle.focusedTrainingControls.onReset();
    });

    expect(lifecycle.focusedTrainingControls.canReset).toBe(true);
    expect(actions.resetSession).toHaveBeenCalledWith({ preserveInputSettingsLock: true });
  });

  it('blocks input locking until Browser TTS text is available', async () => {
    const { lifecycle, actions } = await renderTrainingSessionLifecycle({
      state: createDefaultState({ ttsHasText: false }),
    });

    act(() => {
      lifecycle.lockInputSettings();
    });

    expect(actions.setError).toHaveBeenCalledWith('Paste TTS text before locking this input.');
    expect(actions.setInputSettingsLocked).not.toHaveBeenCalled();
    expect(actions.collapseSetupPanels).not.toHaveBeenCalled();
  });

  it('locks ready input settings and collapses setup panels', async () => {
    const { lifecycle, actions } = await renderTrainingSessionLifecycle();

    act(() => {
      lifecycle.lockInputSettings();
    });

    expect(actions.setInputSettingsLocked).toHaveBeenCalledWith(true);
    expect(actions.collapseSetupPanels).toHaveBeenCalledTimes(1);
    expect(actions.setError).toHaveBeenCalledWith('');
    expect(actions.setExportMessage).toHaveBeenCalledWith('Input settings locked for this session.');
  });

  it('updates edited text before pausing or stopping playback', async () => {
    const { lifecycle, actions } = await renderTrainingSessionLifecycle({
      state: createDefaultState({ ttsStatus: 'playing' }),
      text: { ttsPracticeText: 'old text' },
    });

    act(() => {
      lifecycle.focusedTrainingControls.onPause('new text');
      lifecycle.focusedTrainingControls.onStop('newer text');
    });

    expect(actions.onTtsPracticeChange).toHaveBeenNthCalledWith(1, 'new text');
    expect(actions.pauseTts).toHaveBeenCalledTimes(1);
    expect(actions.onTtsPracticeChange).toHaveBeenNthCalledWith(2, 'newer text');
    expect(actions.stopTts).toHaveBeenCalledWith('stop');
  });

  it('resumes paused Browser TTS playback instead of starting a new play action', async () => {
    const { lifecycle, actions } = await renderTrainingSessionLifecycle({
      state: createDefaultState({ ttsStatus: 'paused' }),
    });

    act(() => {
      lifecycle.focusedTrainingControls.onPlay();
    });

    expect(lifecycle.focusedTrainingControls.playLabel).toBe('Resume');
    expect(actions.resumeTts).toHaveBeenCalledTimes(1);
    expect(actions.playTts).not.toHaveBeenCalled();
  });
});
