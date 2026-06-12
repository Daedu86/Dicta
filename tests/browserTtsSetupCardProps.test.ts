import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useBrowserTtsSetupCardProps } from '../src/app/useBrowserTtsSetupCardProps';
import type { BrowserTtsSetupCardProps } from '../src/components/runtime-workspaces/BrowserTtsSetupCard';

function createProps(overrides: Partial<BrowserTtsSetupCardProps> = {}): BrowserTtsSetupCardProps {
  return {
    activeInputLabel: 'Input # 2 - Text to Speech (TTS)',
    activeInputFeatureLabel: 'Built-in browser feature',
    ttsExpanded: true,
    ttsHasText: true,
    ttsText: 'Hallo Welt',
    ttsLanguage: 'de',
    ttsStatus: 'ready',
    ttsSpeechRate: 1,
    ttsPacingMode: 'balanced',
    ttsCurrentChunk: '',
    supportedLanguages: ['de', 'en', 'es'],
    setupLocked: false,
    inputSettingsReady: true,
    onToggleExpanded: vi.fn(),
    onTtsTextChange: vi.fn(),
    onTtsLanguageChange: vi.fn(),
    onLockInputSettings: vi.fn(),
    formatTtsPacingMode: (mode) => mode,
    ...overrides,
  };
}

describe('useBrowserTtsSetupCardProps', () => {
  it('returns the setup card props unchanged', () => {
    const props = createProps();

    const { result } = renderHook(() => useBrowserTtsSetupCardProps(props));

    expect(result.current).toEqual(props);
  });

  it('keeps the same object while all inputs are stable', () => {
    const props = createProps();

    const { result, rerender } = renderHook(() => useBrowserTtsSetupCardProps(props));
    const initialProps = result.current;

    rerender();

    expect(result.current).toBe(initialProps);
  });

  it('returns a new object when a setup prop changes', () => {
    const initialProps = createProps();
    const updatedProps = createProps({ ttsExpanded: false });

    const { result, rerender } = renderHook(
      ({ props }) => useBrowserTtsSetupCardProps(props),
      { initialProps: { props: initialProps } },
    );
    const firstResult = result.current;

    rerender({ props: updatedProps });

    expect(result.current).not.toBe(firstResult);
    expect(result.current.ttsExpanded).toBe(false);
  });
});
