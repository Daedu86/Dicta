export type MockSpeechSynthesisUtteranceError = {
  error: string;
};

export class MockSpeechSynthesisUtterance {
  readonly text: string;
  lang = '';
  rate = 1;
  voice: unknown = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: MockSpeechSynthesisUtteranceError) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

export type ScheduledSpeechSynthesisTimeout = {
  callback: () => void;
  delayMs: number;
};

export function createMockSpeechSynthesisHarness() {
  const events: string[] = [];
  const spokenUtterances: MockSpeechSynthesisUtterance[] = [];
  const scheduledTimeouts: ScheduledSpeechSynthesisTimeout[] = [];

  function getLastSpokenUtterance(): MockSpeechSynthesisUtterance {
    const utterance = spokenUtterances.at(-1);
    if (!utterance) throw new Error('No spoken utterance is available.');
    return utterance;
  }

  return {
    events,
    spokenUtterances,
    scheduledTimeouts,
    speechSynthesis: {
      speak(utterance: MockSpeechSynthesisUtterance): void {
        events.push(`speak:${utterance.text}`);
        spokenUtterances.push(utterance);
      },
      cancel(): void {
        events.push('cancel');
      },
      pause(): void {
        events.push('pause');
      },
      resume(): void {
        events.push('resume');
      },
    },
    createUtterance(text: string): MockSpeechSynthesisUtterance {
      events.push(`utterance:${text}`);
      return new MockSpeechSynthesisUtterance(text);
    },
    scheduleTimeout(callback: () => void, delayMs: number): number {
      events.push(`timeout:${delayMs}`);
      scheduledTimeouts.push({ callback, delayMs });
      return scheduledTimeouts.length;
    },
    runNextScheduledTimeout(): void {
      const scheduledTimeout = scheduledTimeouts.shift();
      if (!scheduledTimeout) throw new Error('No scheduled timeout is available.');
      events.push(`timeout:run:${scheduledTimeout.delayMs}`);
      scheduledTimeout.callback();
    },
    fireStart(utterance = getLastSpokenUtterance()): void {
      events.push(`start:${utterance.text}`);
      utterance.onstart?.();
    },
    fireEnd(utterance = getLastSpokenUtterance()): void {
      events.push(`end:${utterance.text}`);
      utterance.onend?.();
    },
    fireError(error: string, utterance = getLastSpokenUtterance()): void {
      events.push(`error:${error}:${utterance.text}`);
      utterance.onerror?.({ error });
    },
  };
}
