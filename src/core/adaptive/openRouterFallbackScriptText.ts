import { formatSupportedLanguage } from '../languages';
import type { DictationScriptDifficulty } from './dictationScriptValidation';
import type { LanguageCode } from './types';

export function buildFallbackTitle(
  language: LanguageCode,
  durationMinutes: number,
  difficulty: DictationScriptDifficulty,
): string {
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
