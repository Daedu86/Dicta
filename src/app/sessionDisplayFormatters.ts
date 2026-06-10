import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';

export function formatSessionInputMode(mode: string): string {
  if (mode === BROWSER_TTS_SESSION_INPUT_MODE) {
    return 'Browser TTS';
  }

  return 'Removed legacy input';
}

export function formatInputModeLabel(mode: string): string {
  if (mode === 'browser-tts') {
    return 'Browser TTS';
  }

  return 'Removed legacy input';
}

export function formatSessionGenerationOrigin(origin: string): string {
  if (origin === 'openrouter') {
    return 'OpenRouter generated';
  }

  if (origin === 'fallback-template') {
    return 'Local fallback template';
  }

  return 'Manual/imported';
}

export function formatAdaptiveModeFromSession(session: { metrics: { trend: string } }): string {
  if (session.metrics.trend === 'declining') {
    return 'Support';
  }

  if (session.metrics.trend === 'improving') {
    return 'Flow';
  }

  return 'Balanced';
}

export function buildAdaptiveAdapterCards() {
  return [
    {
      inputMode: BROWSER_TTS_SESSION_INPUT_MODE,
      title: 'Browser TTS',
      adapter: 'browserTtsTelemetryAdapter',
      execution: 'Controls browser utterance rate, phrase chunk size, and pause timing from typed progress.',
      controls: 'Rate + chunks + pauses',
    },
  ];
}
