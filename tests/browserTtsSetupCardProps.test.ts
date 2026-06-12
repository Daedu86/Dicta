import { describe, expect, it, vi } from 'vitest';
import { createBrowserTtsSetupCardProps } from '../src/app/useBrowserTtsSetupCardProps';
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

describe('createBrowserTtsSetupCardProps', () => {
  it('returns the setup card props unchanged', () => {
    const props = createProps();

    expect(createBrowserTtsSetupCardProps(props)).toEqual(props);
  });

  it('returns a distinct props object', () => {
    const props = createProps();

    expect(createBrowserTtsSetupCardProps(props)).not.toBe(props);
  });

  it('reflects changed setup props', () => {
    const props = createProps({ ttsExpanded: false });

    expect(createBrowserTtsSetupCardProps(props).ttsExpanded).toBe(false);
  });
});
