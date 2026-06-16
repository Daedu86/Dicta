export interface BrowserTtsUtteranceLifecycleInput {
  utterance: SpeechSynthesisUtterance;
  onStart: () => void;
  onEnd: () => void;
  onError: (event: SpeechSynthesisErrorEvent) => void;
}

export function attachBrowserTtsUtteranceLifecycle({
  utterance,
  onStart,
  onEnd,
  onError,
}: BrowserTtsUtteranceLifecycleInput): SpeechSynthesisUtterance {
  utterance.onstart = onStart;
  utterance.onend = onEnd;
  utterance.onerror = onError;

  return utterance;
}
