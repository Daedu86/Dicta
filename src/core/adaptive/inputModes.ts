export const CANONICAL_INPUT_MODES = ['audio', 'browser-tts', 'kokoro', 'cosyvoice-cache'] as const;
export const LEGACY_INPUT_MODES = ['qwen-cloud'] as const;

export type InputMode = (typeof CANONICAL_INPUT_MODES)[number];
export type LegacyInputMode = (typeof LEGACY_INPUT_MODES)[number];
export type StoredInputMode = InputMode | LegacyInputMode;

export const COSYVOICE_CACHE_INPUT_MODE = 'cosyvoice-cache';
export const LEGACY_QWEN_CLOUD_INPUT_MODE = 'qwen-cloud';

export function normalizeInputMode(value: string | null | undefined): InputMode | null {
  const normalized = (value ?? '').trim();
  if (normalized === LEGACY_QWEN_CLOUD_INPUT_MODE) return COSYVOICE_CACHE_INPUT_MODE;
  return isCanonicalInputMode(normalized) ? normalized : null;
}

export function isCanonicalInputMode(value: string): value is InputMode {
  return (CANONICAL_INPUT_MODES as readonly string[]).includes(value);
}

export function isStoredInputMode(value: string): value is StoredInputMode {
  return isCanonicalInputMode(value) || (LEGACY_INPUT_MODES as readonly string[]).includes(value);
}

export function formatInputModeLabel(inputMode: string | null | undefined): string {
  const normalized = normalizeInputMode(inputMode);
  switch (normalized) {
    case 'audio':
      return 'Audio';
    case 'browser-tts':
      return 'Browser TTS';
    case 'kokoro':
      return 'Kokoro';
    case 'cosyvoice-cache':
      return 'CosyVoice cache';
    default:
      return 'Unknown input';
  }
}
