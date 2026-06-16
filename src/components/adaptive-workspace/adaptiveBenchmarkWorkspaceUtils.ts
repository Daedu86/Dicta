import type { InputMode } from '../../core/adaptive/types';
import type { AdaptiveAdapterCardConfig } from './types';

export function isCompactViewport(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 640px)').matches;
}

export function mapSessionInputMode(inputMode: AdaptiveAdapterCardConfig['inputMode']): InputMode {
  if (inputMode === 'browser-tts') return 'browser-tts';
  return 'browser-tts';
}
