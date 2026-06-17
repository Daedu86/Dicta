import { act, createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { LowLatencyTextareaHandle } from '../../src/components/LowLatencyTextarea';
import { perfDiagnostics } from '../../src/core/perfDiagnostics';
import {
  inputLowLatencyTextarea,
  renderLowLatencyTextarea,
  textArea,
} from './lowLatencyTextareaHarness';

export function describeLowLatencyTextareaSyncSuite(): void {
  describe('LowLatencyTextarea focus, sync, and diagnostics', () => {
    it('focuses the textarea through the imperative handle and keeps the caret ready at the end', () => {
      const ref = createRef<LowLatencyTextareaHandle>();
      const scrollIntoView = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
      renderLowLatencyTextarea({
        ref,
        value: 'listo',
        onValueChange: () => undefined,
        commitDelayMs: 90,
      });

      act(() => {
        ref.current?.focus();
      });

      expect(document.activeElement).toBe(textArea());
      expect(textArea().selectionStart).toBe(5);
      expect(textArea().selectionEnd).toBe(5);
      expect(scrollIntoView).toHaveBeenCalled();
    });

    it('does not overwrite pending local text during an unrelated parent rerender', () => {
      const commits: string[] = [];
      const props = {
        value: '',
        onValueChange: (value: string) => commits.push(value),
        commitDelayMs: 90,
        syncKey: 'session-a',
      };
      renderLowLatencyTextarea(props);

      act(() => {
        inputLowLatencyTextarea('texto pendiente');
      });

      renderLowLatencyTextarea(props);

      expect(textArea().value).toBe('texto pendiente');
      expect(commits).toEqual([]);
    });

    it('syncs the visible text when the session key changes', () => {
      const commits: string[] = [];
      renderLowLatencyTextarea({
        value: 'old session text',
        onValueChange: (value: string) => commits.push(value),
        commitDelayMs: 90,
        syncKey: 'session-a',
      });

      act(() => {
        inputLowLatencyTextarea('unsaved old edit');
      });

      renderLowLatencyTextarea({
        value: '',
        onValueChange: (value: string) => commits.push(value),
        commitDelayMs: 90,
        syncKey: 'session-b',
      });

      expect(textArea().value).toBe('');
      expect(commits).toEqual(['unsaved old edit']);
    });

    it('reports passive typing diagnostics without changing input behavior', () => {
      const commits: string[] = [];
      renderLowLatencyTextarea({
        value: '',
        onValueChange: (value: string) => commits.push(value),
        commitDelayMs: 90,
      });

      act(() => {
        textArea().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
        inputLowLatencyTextarea('a');
        vi.advanceTimersByTime(90);
        vi.advanceTimersByTime(16);
      });

      const snapshot = perfDiagnostics.snapshot();
      expect(textArea().value).toBe('a');
      expect(commits).toEqual(['a']);
      expect(snapshot.input.latest?.valueLength).toBe(1);
      expect(snapshot.renders.LowLatencyTextarea).toBeGreaterThan(0);
    });
  });
}
