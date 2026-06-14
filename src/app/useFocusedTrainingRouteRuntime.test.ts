import { describe, expect, it } from 'vitest';
import { useFocusedTrainingRouteRuntime } from './useFocusedTrainingRouteRuntime';

describe('useFocusedTrainingRouteRuntime', () => {
  it('exports the route runtime hook', () => {
    expect(typeof useFocusedTrainingRouteRuntime).toBe('function');
  });
});
