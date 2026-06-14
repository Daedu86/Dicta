export const BROWSER_TTS_UNEXPECTED_ERROR_MESSAGE = 'TTS playback stopped unexpectedly.';

export interface BrowserTtsUnexpectedErrorPlanInput {
  error: string | undefined;
  cancelled: boolean;
}

export type BrowserTtsUnexpectedErrorPlan =
  | {
      recordedError: string;
      shouldApplyState: false;
      nextCancelled: true;
      userErrorMessage: null;
    }
  | {
      recordedError: string;
      shouldApplyState: true;
      nextCancelled: true;
      userErrorMessage: string;
    };

export function buildBrowserTtsUnexpectedErrorPlan({
  error,
  cancelled,
}: BrowserTtsUnexpectedErrorPlanInput): BrowserTtsUnexpectedErrorPlan {
  const recordedError = error || 'unknown';

  if (cancelled) {
    return {
      recordedError,
      shouldApplyState: false,
      nextCancelled: true,
      userErrorMessage: null,
    };
  }

  return {
    recordedError,
    shouldApplyState: true,
    nextCancelled: true,
    userErrorMessage: BROWSER_TTS_UNEXPECTED_ERROR_MESSAGE,
  };
}
