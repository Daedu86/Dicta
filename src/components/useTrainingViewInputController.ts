import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';
import { perfDiagnostics } from '../core/perfDiagnostics';
import type { LowLatencyTextareaHandle } from './LowLatencyTextarea';

type UseTrainingViewInputControllerArgs = {
  currentTextValue: string;
  onTextChange: (value: string) => void;
  onImmediateTextChange?: (value: string) => void;
  onTextKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

export function useTrainingViewInputController({
  currentTextValue,
  onTextChange,
  onImmediateTextChange,
  onTextKeyDown,
}: UseTrainingViewInputControllerArgs) {
  const textInputRef = useRef<LowLatencyTextareaHandle | null>(null);
  const onTextChangeRef = useRef(onTextChange);
  const onImmediateTextChangeRef = useRef(onImmediateTextChange);
  const onTextKeyDownRef = useRef(onTextKeyDown);
  const trainingViewRenderCountRef = useRef(0);
  trainingViewRenderCountRef.current += 1;

  useEffect(() => {
    onTextChangeRef.current = onTextChange;
  }, [onTextChange]);

  useEffect(() => {
    onImmediateTextChangeRef.current = onImmediateTextChange;
  }, [onImmediateTextChange]);

  useEffect(() => {
    onTextKeyDownRef.current = onTextKeyDown;
  }, [onTextKeyDown]);

  useEffect(() => {
    perfDiagnostics.recordRender('TrainingView', trainingViewRenderCountRef.current);
  });

  const handleTextChange = useCallback((value: string) => {
    onTextChangeRef.current(value);
  }, []);

  const handleImmediateTextChange = useCallback((value: string) => {
    onImmediateTextChangeRef.current?.(value);
  }, []);

  const handleTextKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    onTextKeyDownRef.current(event);
  }, []);

  function flushTextInput(): string {
    return textInputRef.current?.flush() ?? currentTextValue;
  }

  function focusTextInput(): void {
    window.requestAnimationFrame(() => {
      textInputRef.current?.focus();
    });
  }

  return {
    textInputRef,
    handleTextChange,
    handleImmediateTextChange,
    handleTextKeyDown,
    flushTextInput,
    focusTextInput,
  };
}
