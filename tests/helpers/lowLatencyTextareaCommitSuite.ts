import { act, createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { LowLatencyTextareaHandle } from '../../src/components/LowLatencyTextarea';
import {
  inputLowLatencyTextarea,
  renderLowLatencyTextarea,
  textArea,
} from './lowLatencyTextareaHarness';

export function describeLowLatencyTextareaCommitSuite(): void {
  describe('LowLatencyTextarea commit behavior', () => {
    it('updates the visible textarea immediately while delaying the parent commit', () => {
      const commits: string[] = [];
      renderLowLatencyTextarea({
        value: '',
        onValueChange: (value: string) => commits.push(value),
        commitDelayMs: 90,
      });

      act(() => {
        inputLowLatencyTextarea('hola');
      });

      expect(textArea().value).toBe('hola');
      expect(commits).toEqual([]);

      act(() => {
        vi.advanceTimersByTime(90);
      });

      expect(commits).toEqual(['hola']);
    });

    it('flushes the latest visible value through the imperative handle', () => {
      const commits: string[] = [];
      const ref = createRef<LowLatencyTextareaHandle>();
      renderLowLatencyTextarea({
        ref,
        value: '',
        onValueChange: (value: string) => commits.push(value),
        commitDelayMs: 90,
      });

      act(() => {
        inputLowLatencyTextarea('texto final');
      });

      let flushed = '';
      act(() => {
        flushed = ref.current?.flush() ?? '';
      });

      expect(flushed).toBe('texto final');
      expect(commits).toEqual(['texto final']);
    });

    it('flushes on blur so navigation or submit-adjacent focus changes do not lose text', () => {
      const commits: string[] = [];
      renderLowLatencyTextarea({
        value: '',
        onValueChange: (value: string) => commits.push(value),
        commitDelayMs: 90,
      });

      act(() => {
        inputLowLatencyTextarea('antes de salir');
        textArea().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      });

      expect(commits).toEqual(['antes de salir']);
    });
  });
}
