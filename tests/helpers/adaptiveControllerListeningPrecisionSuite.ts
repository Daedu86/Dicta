import { expect, it } from 'vitest';
import { AdaptiveDictationController } from '../../src/core/adaptive/AdaptiveDictationController';
import { createDefaultListeningPrecisionMetrics } from '../../src/core/adaptive/listeningPrecisionMetrics';
import { input } from './adaptiveControllerFixtures';

function primeSpanishFlow(controller: AdaptiveDictationController, accuracy: number, wpm: number): void {
  controller.decide(input({ language: 'es', accuracy, rollingAccuracyLast3: accuracy, lagSec: 0.1, wpm }));
  controller.decide(input({ language: 'es', accuracy, rollingAccuracyLast3: accuracy, lagSec: 0.1, wpm }));
}

export function runAdaptiveControllerListeningPrecisionSuite(): void {
  it('keeps rate under the ceiling while listening precision is unstable', () => {
    const controller = new AdaptiveDictationController();
    primeSpanishFlow(controller, 0.98, 60);

    const decision = controller.decide(
      input({
        language: 'es',
        accuracy: 0.98,
        chunkAccuracy: 0.98,
        rollingAccuracyLast3: 0.98,
        rollingAccuracyLast5: 0.98,
        lagSec: 0.1,
        correctionRate: 0.01,
        phraseDifficulty: 0.2,
        wpm: 60,
        listeningPrecision: {
          ...createDefaultListeningPrecisionMetrics(),
          listeningRecallScore: 0.82,
          contentWordRecall: 0.8,
          detailPrecisionScore: 0.7,
          functionWordAccuracy: 0.75,
          wordOrderAccuracy: 0.76,
          lateCompletionRate: 0.4,
        },
      }),
    );

    expect(decision.playbackRate).toBeLessThanOrEqual(0.98);
    expect(decision.reason).toContain('listening-precision-rate-ceiling');
  });

  it('leaves rate uncapped once listening precision is strong', () => {
    const controller = new AdaptiveDictationController();
    primeSpanishFlow(controller, 0.99, 65);

    const decision = controller.decide(
      input({
        language: 'es',
        accuracy: 0.99,
        chunkAccuracy: 0.99,
        rollingAccuracyLast3: 0.99,
        rollingAccuracyLast5: 0.99,
        lagSec: 0.1,
        correctionRate: 0.01,
        phraseDifficulty: 0.2,
        wpm: 65,
        listeningPrecision: createDefaultListeningPrecisionMetrics(),
      }),
    );

    expect(decision.reason).not.toContain('listening-precision-rate-ceiling');
  });
}
