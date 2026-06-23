import type { InputMode } from '../../core/adaptive/types';
import type { OpenRouterGeneratePromptSource } from '../../core/adaptive/openRouterGenerationPrompt';
import { SUPPORTED_LANGUAGES } from '../../core/languages';
import { getOpenRouterSlotLabel } from './openRouterViewHelpers';
import type {
  BenchmarkLanguageButton,
  OpenRouterGenerationSlotId,
  OpenRouterGenerationSlotState,
} from './types';

export const OPEN_ROUTER_PROFILE_INPUT_MODE_OPTIONS: Array<{ value: InputMode; label: string; description: string }> = [
  { value: 'browser-tts', label: 'Browser TTS', description: 'Browser SpeechSynthesis' },
];

export const OPEN_ROUTER_PROFILE_LANGUAGE_OPTIONS: Array<{ value: BenchmarkLanguageButton; label: string }> = SUPPORTED_LANGUAGES.map((language) => ({
  value: language,
  label: language.toUpperCase(),
}));

export const OPEN_ROUTER_GENERATE_PROMPT_SOURCE_OPTIONS: Array<{ value: OpenRouterGeneratePromptSource; label: string; description: string }> = [
  { value: 'compact-adaptive-v2', label: 'Compact adaptive v2', description: 'Reduced-duplication benchmark + feedback prompt.' },
  { value: 'compact-adaptive', label: 'Compact adaptive', description: 'Compact benchmark + compact feedback when available.' },
  { value: 'compact-benchmark-only', label: 'Compact benchmark', description: 'Compact benchmark only; skips latest feedback.' },
  { value: 'compact-base', label: 'Compact base', description: 'Base prompt only; smallest prompt.' },
  { value: 'original-adaptive', label: 'Original adaptive', description: 'Full benchmark + full feedback when available.' },
  { value: 'original-benchmark-only', label: 'Original benchmark', description: 'Full benchmark only; skips latest feedback.' },
  { value: 'original-base', label: 'Original base', description: 'Original base prompt only.' },
];

export const OPEN_ROUTER_GENERATE_DURATION_OPTIONS: Array<2 | 3 | 4> = [2, 3, 4];

export function formatOpenRouterPromptSizeHint(value: string): string {
  const normalized = value.trim();
  if (!normalized) return 'Words: 0 · Tokens: ~0';
  const words = normalized.split(/\s+/).filter(Boolean).length;
  const chars = normalized.length;
  const estimatedTokens = Math.max(1, Math.round(chars / 4));
  return `Words: ${words} · Tokens: ~${estimatedTokens}`;
}

export function buildOpenRouterWorkspaceVariantPrompt(
  slotId: OpenRouterGenerationSlotId,
  basePrompt: string,
  slot: OpenRouterGenerationSlotState,
  modelId: string,
): string {
  const slotLabel = getOpenRouterSlotLabel(slotId);
  const notes = slot.notes.trim() || 'No additional variant notes.';
  return [
    basePrompt,
    '',
    `Variant-specific notes for ${slotLabel}:`,
    `Selected model: ${modelId || 'not selected'}.`,
    'Use these notes to make this variant meaningfully different from the other prompt while still obeying the required schema, inputMode, language, and duration.',
    notes,
  ].join('\n');
}
