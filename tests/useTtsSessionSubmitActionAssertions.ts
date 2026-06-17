import { expect, vi } from 'vitest';
import type { TtsSessionSubmitActionOptions } from './useTtsSessionSubmitActionOptions';

export function expectTtsSubmitRejected(
  options: TtsSessionSubmitActionOptions,
  endPerfSpan: ReturnType<typeof vi.fn>,
): void {
  expect(options.setError).toHaveBeenCalledWith(
    'Paste TTS text and type your attempt before submitting.',
  );
  expect(options.setTrainingSubmitMessage).toHaveBeenCalledWith('');
  expect(options.applyTtsPerformanceSample).not.toHaveBeenCalled();
  expect(options.persistAndPushSessionsNow).not.toHaveBeenCalled();
  expect(endPerfSpan).toHaveBeenCalledTimes(1);
}

export function expectValidTtsSubmitFinalization(
  options: TtsSessionSubmitActionOptions,
  endPerfSpan: ReturnType<typeof vi.fn>,
): void {
  expect(options.setTtsPracticeText).toHaveBeenCalledWith('eins zwei');
  expect(options.applyTtsPerformanceSample).toHaveBeenCalledWith({
    action: 'submit',
    finalize: true,
    practiceTextOverride: 'eins zwei',
  });
  expect(options.resolveBrowserTtsVoiceForSession).toHaveBeenCalledWith(options.activeSession, 'de');
  expect(options.collectBrowserTtsEnvironmentForSession).toHaveBeenCalledWith(
    options.activeSession,
    expect.objectContaining({ voiceURI: 'voice-1' }),
    'voice-1',
  );
  expect(options.setSessions).toHaveBeenCalledWith([
    expect.objectContaining({
      id: 'session-1',
      status: 'finished',
      ttsPracticeText: 'eins zwei',
      ttsVoiceURI: 'voice-1',
      updatedAt: '2026-06-14T10:01:00.000Z',
    }),
  ]);
  expect(options.persistAndPushSessionsNow).toHaveBeenCalledWith(expect.any(Array), {
    criticalSessionIds: ['session-1'],
  });
  expect(options.stopTtsPlayback).toHaveBeenCalledTimes(1);
  expect(options.setRunning).toHaveBeenCalledWith(false);
  expect(options.setSessionStatus).toHaveBeenCalledWith('finished');
  expect(options.setTtsStatus).toHaveBeenCalledWith('finished');
  expect(options.completeAdaptiveSessionFeedback).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'session-1', status: 'finished' }),
  );
  expect(options.setError).toHaveBeenCalledWith('');
  expect(options.setTrainingSubmitMessage).toHaveBeenCalledWith(
    expect.stringContaining('Submitted to leaderboard.'),
  );
  expect(endPerfSpan).toHaveBeenCalledTimes(1);
}
