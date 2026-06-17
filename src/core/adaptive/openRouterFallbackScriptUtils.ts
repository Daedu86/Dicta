import type { DictationScriptDifficulty } from './dictationScriptValidation';
import type { LanguageCode } from './types';
import { formatSupportedLanguage } from '../languages';

export type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

export function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export function rotate<T>(values: T[], offset: number): T[] {
  if (values.length === 0) return values;
  const normalized = ((offset % values.length) + values.length) % values.length;
  return [...values.slice(normalized), ...values.slice(0, normalized)];
}

export function buildFallbackTitle(language: LanguageCode, durationMinutes: number, difficulty: DictationScriptDifficulty): string {
  const languageName = formatSupportedLanguage(language);
  const level = difficulty === 'hard' ? 'advanced' : difficulty === 'easy' ? 'easy' : 'steady';
  return `Local ${languageName} ${level} practice (${durationMinutes} min)`;
}

export function buildTopicSuffix(language: LanguageCode, seed: number): string {
  const topics =
    language === 'de'
      ? ['Cafe', 'Projektplanung', 'Alltag', 'Reise', 'Teammeeting', 'Markt']
      : language === 'es'
        ? ['cafe', 'planificacion', 'rutina', 'viaje', 'reunion', 'mercado']
        : language === 'fr'
          ? ['cafe', 'planification', 'routine', 'voyage', 'reunion', 'marche']
          : language === 'pt'
            ? ['cafe', 'planejamento', 'rotina', 'viagem', 'reuniao', 'mercado']
            : ['cafe', 'planning', 'daily flow', 'travel', 'meeting', 'market'];
  return topics[seed % topics.length];
}
