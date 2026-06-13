import { describe, expect, it } from 'vitest';
import {
  buildAdaptiveControllerScopeKey,
  getAdaptiveControllerForScope,
  type ScopedAdaptiveControllerRegistry,
} from '../src/app/adaptiveControllerRegistry';

describe('adaptiveControllerRegistry', () => {
  it('reuses the same controller for the same input mode and language', () => {
    const registry: ScopedAdaptiveControllerRegistry = {};

    const first = getAdaptiveControllerForScope(registry, 'browser-tts', 'de');
    const second = getAdaptiveControllerForScope(registry, 'browser-tts', 'de');

    expect(second).toBe(first);
    expect(Object.keys(registry)).toEqual(['browser-tts:de']);
  });

  it('isolates controller state across languages', () => {
    const registry: ScopedAdaptiveControllerRegistry = {};

    const german = getAdaptiveControllerForScope(registry, 'browser-tts', 'de');
    const english = getAdaptiveControllerForScope(registry, 'browser-tts', 'en');

    expect(english).not.toBe(german);
    expect(Object.keys(registry).sort()).toEqual(['browser-tts:de', 'browser-tts:en']);
  });

  it('normalizes unknown or missing language labels into the scope key', () => {
    expect(buildAdaptiveControllerScopeKey('browser-tts', 'unknown')).toBe('browser-tts:unknown');
  });
});
