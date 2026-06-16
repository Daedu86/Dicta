import { describe, expect, it } from 'vitest';
import { AdaptiveDictationController } from '../../src/core/adaptive/AdaptiveDictationController';
import type { LiveTelemetryFrame } from '../../src/core/adaptive/types';
import { input } from '../helpers/adaptiveControllerFixtures';

describe('AdaptiveDictationController replay behavior', () => {
  it('converts Browser TTS replay pressure into recovery instead of replay execution', () => {
    const controller = new AdaptiveDictationController();
    const decision = controller.decide(
      input({
        lagSec: 3.2,
        lagWords: 8,
        accuracy: 0.74,
        chunkAccuracy: 0.74,
        rollingAccuracyLast3: 0.74,
        rollingAccuracyLast5: 0.76,
        correctionRate: 0.16,
      }),
    );

    expect(decision.mode).toBe('support');
    expect(decision.shouldReplayPhrase).toBe(false);
    expect(decision.nextPhraseSize).toBe('short');
    expect(decision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(1200);
    expect(decision.reason).toContain('replay-disabled-recovery');
  });

  it('keeps real replay available for inputs that support phrase replay', () => {
    const controller = new AdaptiveDictationController();
    const decision = controller.decide({
      ...input({
        inputMode: 'browser-tts',
        language: 'en',
        lagSec: 3.2,
        lagWords: 8,
        accuracy: 0.74,
        chunkAccuracy: 0.74,
        rollingAccuracyLast3: 0.74,
        rollingAccuracyLast5: 0.76,
        correctionRate: 0.16,
      }),
      capabilities: {
        supportsClausePause: true,
        supportsSentencePause: true,
        supportsPhraseReplay: true,
        supportsMidPhraseReplay: true,
        supportsDynamicRateChange: true,
        requiresPreChunking: false,
      },
    });

    expect(decision.mode).toBe('support');
    expect(decision.shouldReplayPhrase).toBe(true);
    expect(decision.reason).toContain('replay-due-to-lag-or-error');
  });

  it('keeps Browser TTS German support behavior isolated from English', () => {
    const germanController = new AdaptiveDictationController();
    const englishController = new AdaptiveDictationController();

    const pressure = {
      lagSec: 4.5,
      lagWords: 12,
      accuracy: 0.7,
      chunkAccuracy: 0.7,
      rollingAccuracyLast3: 0.7,
      rollingAccuracyLast5: 0.72,
      correctionRate: 0.2,
    } satisfies Partial<LiveTelemetryFrame>;

    const germanDecision = germanController.decide(input({ ...pressure, language: 'de' }));
    const englishDecision = englishController.decide(input({ ...pressure, language: 'en' }));

    expect(germanDecision.mode).toBe('support');
    expect(englishDecision.mode).toBe('support');
    expect(germanDecision.shouldReplayPhrase).toBe(false);
    expect(englishDecision.shouldReplayPhrase).toBe(false);
    expect(germanDecision.reason).toContain('replay-disabled-recovery');
    expect(englishDecision.reason).toContain('replay-disabled-recovery');
  });
});
