import { describe, expect, it } from 'vitest';
import { createMockSpeechSynthesisHarness } from './helpers/mockSpeechSynthesisHarness';

describe('mock SpeechSynthesis harness', () => {
  it('records utterance creation, speak, start, and end lifecycle order', () => {
    const harness = createMockSpeechSynthesisHarness();
    const lifecycle: string[] = [];
    const utterance = harness.createUtterance('eins zwei');

    utterance.onstart = () => lifecycle.push('onstart');
    utterance.onend = () => lifecycle.push('onend');

    harness.speechSynthesis.speak(utterance);
    harness.fireStart(utterance);
    harness.fireEnd(utterance);

    expect(harness.spokenUtterances).toEqual([utterance]);
    expect(lifecycle).toEqual(['onstart', 'onend']);
    expect(harness.events).toEqual([
      'utterance:eins zwei',
      'speak:eins zwei',
      'start:eins zwei',
      'end:eins zwei',
    ]);
  });

  it('records next-chunk scheduling and callback execution order', () => {
    const harness = createMockSpeechSynthesisHarness();
    const utterance = harness.createUtterance('chunk one');
    let speakNextCount = 0;

    utterance.onend = () => {
      harness.scheduleTimeout(() => {
        speakNextCount += 1;
      }, 250);
    };

    harness.speechSynthesis.speak(utterance);
    harness.fireEnd(utterance);

    expect(harness.scheduledTimeouts).toHaveLength(1);
    expect(harness.scheduledTimeouts[0]?.delayMs).toBe(250);

    harness.runNextScheduledTimeout();

    expect(speakNextCount).toBe(1);
    expect(harness.events).toEqual([
      'utterance:chunk one',
      'speak:chunk one',
      'end:chunk one',
      'timeout:250',
      'timeout:run:250',
    ]);
  });

  it('records SpeechSynthesis error delivery without implying a completion event', () => {
    const harness = createMockSpeechSynthesisHarness();
    const utterance = harness.createUtterance('problem chunk');
    let recordedError = '';

    utterance.onerror = (event) => {
      recordedError = event.error;
      harness.speechSynthesis.cancel();
    };

    harness.speechSynthesis.speak(utterance);
    harness.fireError('interrupted', utterance);

    expect(recordedError).toBe('interrupted');
    expect(harness.events).toEqual([
      'utterance:problem chunk',
      'speak:problem chunk',
      'error:interrupted:problem chunk',
      'cancel',
    ]);
  });
});
