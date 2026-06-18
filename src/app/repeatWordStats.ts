import type { Transcript } from '../types/dictation';
import type { InputMode } from '../core/adaptive/types';
import type { BenchmarkLanguageButton } from '../components/openrouter/types';
import type { RepeatWordStat } from '../components/adaptive-workspace/types';
import type { StoredSession } from './sessionTypes';
import { evaluateTranscriptAttempt } from '../core/evaluation';
import { normalizeWord } from '../core/normalization';
import { resolveSessionLanguage } from '../core/liveMetrics';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import { SESSION_RETENTION_MS } from './sessionRetentionPolicy';

function mapSessionInputMode(mode: string): InputMode {
  if (mode === BROWSER_TTS_SESSION_INPUT_MODE) return 'browser-tts';
  return 'browser-tts';
}

export function buildTextTranscript(text: string): Transcript | null {
  const words = text
    .split(/\s+/)
    .map((word, index) => {
      const normalized = normalizeWord(word);
      return normalized
        ? { word: normalized, start: index, end: index + 1 }
        : null;
    })
    .filter((word): word is { word: string; start: number; end: number } => Boolean(word));

  return words.length > 0 ? { words } : null;
}

export function buildRepeatWordStats({
  sessions,
  inputMode,
  language,
  now,
}: {
  sessions: StoredSession[];
  inputMode: InputMode;
  language: BenchmarkLanguageButton;
  now: Date;
}): RepeatWordStat[] {
  const cutoffMs = now.getTime() - SESSION_RETENTION_MS;
  const withinWindow = sessions.filter((session) => {
    if (session.status !== 'finished') return false;
    if (mapSessionInputMode(session.inputMode) !== inputMode) return false;
    const resolvedLanguage = resolveSessionLanguage(session);
    if (resolvedLanguage !== language) return false;
    const updatedAtMs = new Date(session.updatedAt).getTime();
    return Number.isFinite(updatedAtMs) && updatedAtMs >= cutoffMs;
  });

  const missed = new Map<string, number>();
  const typos = new Map<string, number>();

  const bump = (bucket: Map<string, number>, word: string, delta = 1) => {
    if (!word) return;
    bucket.set(word, (bucket.get(word) ?? 0) + delta);
  };

  for (const session of withinWindow) {
    const transcript = buildTextTranscript(session.ttsText);
    const typedText = session.ttsPracticeText;

    const evaluation = evaluateTranscriptAttempt(typedText, transcript);
    if (evaluation.targetWords.length === 0) continue;

    const matchedTargetIndices = new Set(evaluation.alignedPairs.map((pair) => pair.targetIndex));
    for (let index = 0; index < evaluation.targetWords.length; index += 1) {
      if (!matchedTargetIndices.has(index)) {
        bump(missed, evaluation.targetWords[index] ?? '');
      }
    }

    for (const pair of evaluation.alignedPairs) {
      if (!pair.exact) {
        bump(typos, evaluation.targetWords[pair.targetIndex] ?? '');
      }
    }
  }

  const words = new Set([...missed.keys(), ...typos.keys()]);
  const combined: RepeatWordStat[] = [];
  for (const word of words) {
    const missedCount = missed.get(word) ?? 0;
    const typoCount = typos.get(word) ?? 0;
    const total = missedCount + typoCount;
    if (total <= 0) continue;
    combined.push({ word, total, missed: missedCount, typos: typoCount });
  }

  return combined
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.missed !== a.missed) return b.missed - a.missed;
      return a.word.localeCompare(b.word);
    })
    .slice(0, 20);
}
