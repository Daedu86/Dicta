import { normalizeWord } from './normalization';
import { BROWSER_TTS_SESSION_INPUT_MODE } from './sessionInputModes';

export type SessionPointsSource = {
  inputMode?: string;
  ttsText?: string | null;
};

export function computeSessionMaxPoints(session: SessionPointsSource | null | undefined): number | null {
  if (!session) return null;

  let maxPoints = 0;
  if (session.inputMode === BROWSER_TTS_SESSION_INPUT_MODE) {
    maxPoints = countNormalizedTextWords(session.ttsText ?? '');
  }

  return maxPoints > 0 ? maxPoints : null;
}

export function formatSessionPointsLabel(points: number, maxPoints: number | null): string {
  const earned = Number.isFinite(points) ? Math.max(0, Math.round(points)) : 0;
  return maxPoints !== null ? `${earned}/${maxPoints}` : String(earned);
}

export function formatSessionPointsForSession(points: number, session: SessionPointsSource | null | undefined): string {
  return formatSessionPointsLabel(points, computeSessionMaxPoints(session));
}

export function buildSessionPointsHelpText(maxPoints: number | null): string {
  const totalText = maxPoints !== null ? ` Maximum ${maxPoints} points for this session.` : '';
  return `1 point per matched target word; exact and one-character typo matches count; missed/extra words do not.${totalText}`;
}

function countNormalizedTextWords(text: string): number {
  return text
    .split(/\s+/)
    .map((word) => normalizeWord(word))
    .filter(Boolean).length;
}
