export const CANONICAL_INPUT_MODES = ['browser-tts', 'kokoro'] as const;

export type InputMode = (typeof CANONICAL_INPUT_MODES)[number];
export type StoredInputMode = InputMode;

export function normalizeInputMode(value: string | null | undefined): InputMode | null {
  const normalized = (value ?? '').trim();
  return isCanonicalInputMode(normalized) ? normalized : null;
}

export function isCanonicalInputMode(value: string): value is InputMode {
  return (CANONICAL_INPUT_MODES as readonly string[]).includes(value);
}

export function isStoredInputMode(value: string): value is StoredInputMode {
  return isCanonicalInputMode(value);
}

export function formatInputModeLabel(inputMode: string | null | undefined): string {
  const normalized = normalizeInputMode(inputMode);
  switch (normalized) {
    case 'browser-tts':
      return 'Browser TTS';
    case 'kokoro':
      return 'Kokoro';
    default:
      return 'Unknown input';
  }
}
