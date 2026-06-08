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
  kokoroHasText: boolean;
  kokoroStatus: TrainingLifecyclePlaybackStatus;
  inputSettingsLocked: boolean;
};

export type TrainingLifecycleDerivedState = {
  inputSettingsReady: boolean;
  setupLocked: boolean;
  canSubmitTtsSession: boolean;
  canSubmitKokoroSession: boolean;
  readyChecklist: ReadyChecklistItem[];
};

type TrainingLifecycleTextState = {
  ttsPracticeText: string;
  kokoroPracticeText: string;
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
  playKokoro: () => void | Promise<void>;
  resumeKokoro: () => void | Promise<void>;
  pauseKokoro: () => void;
  stopKokoro: (action?: ControlAction) => void;
  onKokoroPracticeChange: (value: string) => void;
  submitKokoroSession: (latestTextValue?: string) => void;
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
  kokoroHasText,
  inputSettingsLocked,
}: TrainingLifecycleStateInput): TrainingLifecycleDerivedState {
  const inputSettingsReady = activeInputMode === 'input2' ? ttsHasText : kokoroHasText;
  const setupLocked = activeSessionFinished || sessionStatus === 'error' || inputSettingsLocked;
  const canSubmitTtsSession = activeInputMode === 'input2' && !activeSessionFinished && sessionStatus !== 'error' && ttsHasText;
  const canSubmitKokoroSession = activeInputMode === 'input3' && !activeSessionFinished && sessionStatus !== 'error' && kokoroHasText;

  return {
    inputSettingsReady,
    setupLocked,
    canSubmitTtsSession,
    canSubmitKokoroSession,
    readyChecklist:
      activeInputMode === 'input3'
        ? [{ label: 'Kokoro source loaded', ready: kokoroHasText }]
        : [{ label: 'TTS source loaded', ready: ttsHasText }],
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
      if (state.activeInputMode === 'input2') {
        actions.setError('Paste TTS text before locking this input.');
      } else {
        actions.setError('Paste Kokoro source text before locking Input #3.');
      }
      return;
    }
    actions.setInputSettingsLocked(true);
    actions.collapseSetupPanels();
    actions.setError('');
    actions.setExportMessage('Input settings locked for this session.');
  }, [actions, derivedState.inputSettingsReady, state.activeInputMode, state.inputSettingsLocked]);

  const focusedTrainingControls = useMemo<FocusedTrainingLifecycleControls>(() => {
    const isKokoro = state.activeInputMode === 'input3';
    const canPlay = isKokoro
        ? state.kokoroHasText && state.kokoroStatus !== 'playing' && !state.activeSessionFinished
        : state.ttsHasText && state.ttsStatus !== 'playing' && !state.activeSessionFinished;
    const playLabel = isKokoro
        ? state.kokoroStatus === 'paused'
          ? 'Resume'
          : 'Play'
        : state.ttsStatus === 'paused'
          ? 'Resume'
          : 'Play';

    return {
      canPlay,
      playLabel,
      onPlay: () => {
        if (isKokoro) {
          void (state.kokoroStatus === 'paused' ? actions.resumeKokoro() : actions.playKokoro());
        } else {
          void (state.ttsStatus === 'paused' ? actions.resumeTts() : actions.playTts());
        }
      },
      canPause: isKokoro
          ? state.kokoroStatus === 'playing'
          : state.ttsStatus === 'playing',
      onPause: (latestTextValue?: string) => {
        if (isKokoro) {
          if (latestTextValue !== undefined && latestTextValue !== text.kokoroPracticeText) actions.onKokoroPracticeChange(latestTextValue);
          actions.pauseKokoro();
        } else {
          if (latestTextValue !== undefined && latestTextValue !== text.ttsPracticeText) actions.onTtsPracticeChange(latestTextValue);
          actions.pauseTts();
        }
      },
      canStop: isKokoro
          ? state.kokoroStatus !== 'idle'
          : state.ttsStatus !== 'idle',
      onStop: (latestTextValue?: string) => {
        if (isKokoro) {
          if (latestTextValue !== undefined && latestTextValue !== text.kokoroPracticeText) actions.onKokoroPracticeChange(latestTextValue);
          actions.stopKokoro('stop');
        } else {
          if (latestTextValue !== undefined && latestTextValue !== text.ttsPracticeText) actions.onTtsPracticeChange(latestTextValue);
          actions.stopTts('stop');
        }
      },
      canReset: state.activeSessionPresent,
      onReset: resetFocusedTrainingAttempt,
      canSubmit: isKokoro
          ? derivedState.canSubmitKokoroSession
          : derivedState.canSubmitTtsSession,
      onSubmit: (latestTextValue?: string) => {
        if (isKokoro) {
          actions.submitKokoroSession(latestTextValue);
        } else {
          actions.submitTtsSession(latestTextValue);
        }
      },
      submitLabel: 'Submit / Check',
    };
  }, [actions, derivedState, resetFocusedTrainingAttempt, state, text]);

  return {
    ...derivedState,
    lockInputSettings,
    resetFocusedTrainingAttempt,
    focusedTrainingControls,
  };
}
