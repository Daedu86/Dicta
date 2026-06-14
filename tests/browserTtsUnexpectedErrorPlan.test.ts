import { describe, expect, it } from 'vitest';
import {
  BROWSER_TTS_UNEXPECTED_ERROR_MESSAGE,
  buildBrowserTtsUnexpectedErrorPlan,
} from '../src/app/browserTtsUnexpectedErrorPlan';

describe('buildBrowserTtsUnexpectedErrorPlan', () => {
  it('normalizes browser TTS errors and requests paused user-visible error state', () => {
    expect(
      buildBrowserTtsUnexpectedErrorPlan({
        error: 'interrupted',
        cancelled: false,
      }),
    ).toEqual({
      recordedError: 'interrupted',
      shouldApplyState: true,
      nextCancelled: true,
      userErrorMessage: BROWSER_TTS_UNEXPECTED_ERROR_MESSAGE,
    });
  });

  it('records unknown when the browser does not provide an error code', () => {
    expect(
      buildBrowserTtsUnexpectedErrorPlan({
        error: undefined,
        cancelled: false,
      }).recordedError,
    ).toBe('unknown');
  });

  it('records the error but skips duplicate state updates after cancellation', () => {
    expect(
      buildBrowserTtsUnexpectedErrorPlan({
        error: 'canceled',
        cancelled: true,
      }),
    ).toEqual({
      recordedError: 'canceled',
      shouldApplyState: false,
      nextCancelled: true,
      userErrorMessage: null,
    });
  });
});
