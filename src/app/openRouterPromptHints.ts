import type { DictationScriptDifficulty } from '../core/adaptive/dictationScriptValidation';
import type { OpenRouterDurationMinutes } from '../core/adaptive/openRouterGenerationPrompt';

export function buildOpenRouterDiversificationHints({
  durationMinutes,
  targetDifficulty,
  recentSessions,
  activityHints = [],
}: {
  durationMinutes: OpenRouterDurationMinutes;
  targetDifficulty?: DictationScriptDifficulty;
  recentSessions: Array<{ title: string; opener: string }>;
  activityHints?: string[];
}): string[] {
  const hints: string[] = [
    `Create clearly different content from the last generated scripts while keeping the requested ${durationMinutes}-minute length.`,
    ...activityHints,
  ];

  if (targetDifficulty === 'hard') {
    hints.push('Challenge intent: use richer grammar and vocabulary only if the trainer prescription keeps the session in challenge/hard mode.');
  } else if (targetDifficulty === 'normal') {
    hints.push('Progress intent: keep medium complexity unless the trainer prescription selects recovery or stabilization.');
  } else if (targetDifficulty === 'easy') {
    hints.push('Recovery intent: use simpler vocabulary, shorter clauses, and everyday topics when the trainer prescription selects easy recovery.');
  }

  const recentOpeners = recentSessions
    .map((session) => session.opener.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 3);

  if (recentOpeners.length > 0) {
    hints.push(`Do not start phrases with these recent openings: ${recentOpeners.join(' | ')}`);
  }

  const recentTitles = recentSessions
    .map((session) => session.title.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (recentTitles.length > 0) {
    hints.push(`Avoid repeating these recent themes/titles: ${recentTitles.join(' | ')}`);
  }

  return hints;
}
