import { describe, expect, it, vi } from 'vitest';
import { applyPendingTtsPracticePunctuation } from '../src/app/ttsPracticePunctuation';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';

describe('applyPendingTtsPracticePunctuation', () => {
  it('applies punctuation only through the completed Browser TTS word boundary', () => {
    const ttsPracticeLiveTextRef = { current: 'Hola mundo Seguimos' };
    const setTtsPracticeText = vi.fn();

    const nextText = applyPendingTtsPracticePunctuation({
      activeInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
      ttsText: 'Hola, mundo! Seguimos.',
      completedWordCount: 2,
      ttsPracticeLiveTextRef,
      setTtsPracticeText,
    });

    expect(nextText).toBe('Hola, mundo! Seguimos');
    expect(ttsPracticeLiveTextRef.current).toBe('Hola, mundo! Seguimos');
    expect(setTtsPracticeText).toHaveBeenCalledWith('Hola, mundo! Seguimos');
  });

  it('leaves non-Browser TTS text unchanged', () => {
    const ttsPracticeLiveTextRef = { current: 'Hola mundo' };
    const setTtsPracticeText = vi.fn();

    const nextText = applyPendingTtsPracticePunctuation({
      activeInputMode: 'keyboard',
      ttsText: 'Hola, mundo!',
      completedWordCount: 2,
      ttsPracticeLiveTextRef,
      setTtsPracticeText,
      latestPracticeText: 'Hola mundo',
    });

    expect(nextText).toBe('Hola mundo');
    expect(ttsPracticeLiveTextRef.current).toBe('Hola mundo');
    expect(setTtsPracticeText).not.toHaveBeenCalled();
  });
});
