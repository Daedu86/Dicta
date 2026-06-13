import { describe, expect, it } from 'vitest';
import {
  buildAdaptiveControllerScopeKey,
  getAdaptiveControllerForScope,
  resetAdaptiveControllerForScope,
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

  it('resets a scoped controller without affecting other languages', () => {
    const registry: ScopedAdaptiveControllerRegistry = {};

    const germanBeforeReset = getAdaptiveControllerForScope(registry, 'browser-tts', 'de');
    const english = getAdaptiveControllerForScope(registry, 'browser-tts', 'en');
    const germanAfterReset = resetAdaptiveControllerForScope(registry, 'browser-tts', 'de');

    expect(germanAfterReset).not.toBe(germanBeforeReset);
    expect(getAdaptiveControllerForScope(registry, 'browser-tts', 'de')).toBe(germanAfterReset);
    expect(getAdaptiveControllerForScope(registry, 'browser-tts', 'en')).toBe(english);
  });

  it('normalizes unknown or missing language labels into the scope key', () => {
    expect(buildAdaptiveControllerScopeKey('browser-tts', 'unknown')).toBe('browser-tts:unknown');
  });
});
