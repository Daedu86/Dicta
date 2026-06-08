import { useCallback, useMemo } from 'react';
import type { ControlAction } from '../types/dictation';

export type TrainingLifecycleInputMode = string;
export type TrainingLifecycleSessionStatus = 'ready' | 'running' | 'paused' | 'finished' | 'error';
export type TrainingLifecyclePlaybackStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'finished';

export type ReadyChecklistItem = {
  label: string;
  ready: boolean;
};

export type TrainingLifecycleStateInput = {
  activeInputMode: TrainingLifecycleInputMode;
  activeSessionPresent: boolean;
  activeSessionFinished: boolean;
  sessionStatus: TrainingLifecycleSessionStatus;
  running: boolean;
  ttsHasText: boolean;
  ttsStatus: TrainingLifecyclePlaybackStatus;
  inputSettingsLocked: boolean;
};

export type TrainingLifecycleDerivedState = {
  inputSettingsReady: boolean;
  setupLocked: boolean;
  canSubmitTtsSession: boolean;
  readyChecklist: ReadyChecklistItem[];
};

type TrainingLifecycleTextState = {
  ttsPracticeText: string;
};

type ResetSessionOptions = {
  preserveInputSettingsLock?: boolean;
};

type TrainingLifecycleActions = {
  resetSession: (options?: ResetSessionOptions) => void;
  playTts: () => void;
  resumeTts: () => void | Promise<void>;
  pauseTts: () => void;
  stopTts: (action?: ControlAction) => void;
  onTtsPracticeChange: (value: string) => void;
  submitTtsSession: (latestTextValue?: string) => void;
  setInputSettingsLocked: (value: boolean) => void;
  setError: (message: string) => void;
  setExportMessage: (message: string) => void;
  collapseSetupPanels: () => void;
};

export type FocusedTrainingLifecycleControls = {
  canPlay: boolean;
  playLabel: string;
  onPlay: () => void;
  canPause: boolean;
  onPause: (latestTextValue?: string) => void;
  canStop: boolean;
  onStop: (latestTextValue?: string) => void;
  canReset: boolean;
  onReset: () => void;
  canSubmit: boolean;
  onSubmit: (latestTextValue?: string) => void;
  submitLabel: string;
};

type TrainingSessionLifecycleOptions = {
  state: TrainingLifecycleStateInput;
  text: TrainingLifecycleTextState;
  actions: TrainingLifecycleActions;
};

export type TrainingSessionLifecycle = TrainingLifecycleDerivedState & {
  lockInputSettings: () => void;
  resetFocusedTrainingAttempt: () => void;
  focusedTrainingControls: FocusedTrainingLifecycleControls;
};

export function deriveTrainingLifecycleState({
  activeInputMode,
  activeSessionFinished,
  sessionStatus,
  ttsHasText,
  inputSettingsLocked,
}: TrainingLifecycleStateInput): TrainingLifecycleDerivedState {
  const isBrowserTts = activeInputMode === 'input2';
  const inputSettingsReady = isBrowserTts && ttsHasText;
  const setupLocked = activeSessionFinished || sessionStatus === 'error' || inputSettingsLocked;
  const canSubmitTtsSession = isBrowserTts && !activeSessionFinished && sessionStatus !== 'error' && ttsHasText;

  return {
    inputSettingsReady,
    setupLocked,
    canSubmitTtsSession,
    readyChecklist: [{ label: 'TTS source loaded', ready: ttsHasText }],
  };
}

export function useTrainingSessionLifecycle({
  state,
  text,
  actions,
}: TrainingSessionLifecycleOptions): TrainingSessionLifecycle {
  const derivedState = useMemo(() => deriveTrainingLifecycleState(state), [state]);

  const resetFocusedTrainingAttempt = useCallback((): void => {
    actions.resetSession({ preserveInputSettingsLock: true });
  }, [actions]);

  const lockInputSettings = useCallback((): void => {
    if (state.inputSettingsLocked) return;
    if (!derivedState.inputSettingsReady) {
      actions.setError('Paste TTS text before locking this input.');
      return;
    }
    actions.setInputSettingsLocked(true);
    actions.collapseSetupPanels();
    actions.setError('');
    actions.setExportMessage('Input settings locked for this session.');
  }, [actions, derivedState.inputSettingsReady, state.inputSettingsLocked]);

  const focusedTrainingControls = useMemo<FocusedTrainingLifecycleControls>(() => {
    const canPlay = state.activeInputMode === 'input2' && state.ttsHasText && state.ttsStatus !== 'playing' && !state.activeSessionFinished;
    const playLabel = state.ttsStatus === 'paused' ? 'Resume' : 'Play';

    return {
      canPlay,
      playLabel,
      onPlay: () => {
        void (state.ttsStatus === 'paused' ? actions.resumeTts() : actions.playTts());
      },
      canPause: state.ttsStatus === 'playing',
      onPause: (latestTextValue?: string) => {
        if (latestTextValue !== undefined && latestTextValue !== text.ttsPracticeText) actions.onTtsPracticeChange(latestTextValue);
        actions.pauseTts();
      },
      canStop: state.ttsStatus !== 'idle',
      onStop: (latestTextValue?: string) => {
        if (latestTextValue !== undefined && latestTextValue !== text.ttsPracticeText) actions.onTtsPracticeChange(latestTextValue);
        actions.stopTts('stop');
      },
      canReset: state.activeSessionPresent,
      onReset: resetFocusedTrainingAttempt,
      canSubmit: derivedState.canSubmitTtsSession,
      onSubmit: (latestTextValue?: string) => {
        actions.submitTtsSession(latestTextValue);
      },
      submitLabel: 'Submit / Check',
    };
  }, [actions, derivedState.canSubmitTtsSession, resetFocusedTrainingAttempt, state, text.ttsPracticeText]);

  return {
    ...derivedState,
    lockInputSettings,
    resetFocusedTrainingAttempt,
    focusedTrainingControls,
  };
}
