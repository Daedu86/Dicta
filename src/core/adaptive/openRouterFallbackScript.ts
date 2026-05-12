import type { DictationScript, DictationScriptDifficulty, DictationScriptIntonationHint } from './dictationScriptValidation';
import type { InputMode, LanguageCode, PhraseBoundaryType, PhraseSize } from './types';

type FallbackScriptOptions = {
  inputMode: InputMode;
  language: LanguageCode;
  durationMinutes: 2 | 3 | 4;
  targetDifficulty?: DictationScriptDifficulty;
};

type UnknownRecord = Record<string, unknown>;

const FALLBACK_PHRASES: Record<LanguageCode, string[]> = {
  de: [
    'Heute planen wir eine ruhige Uebung mit klaren Saetzen und kurzen Pausen.',
    'Die Aufgabe bleibt einfach, damit du dich auf Rhythmus und Genauigkeit konzentrierst.',
    'Nach jedem Satz kannst du den Text pruefen und dann kontrolliert weiter tippen.',
    'Wenn ein Wort schwierig ist, halte kurz inne und wiederhole den ganzen Abschnitt.',
    'Der Morgen beginnt mit Kaffee, Notizen und einem geordneten Blick auf den Tag.',
    'Im Buero werden Termine verglichen, Aufgaben verteilt und offene Fragen gesammelt.',
    'Eine gute Mitschrift braucht Geduld, saubere Satzzeichen und gleichmaessiges Tempo.',
    'Zum Schluss kontrollierst du Namen, Zahlen und die wichtigsten Verben noch einmal.',
  ],
  en: [
    'This practice session uses clear sentences, steady pacing, and short pauses.',
    'Focus on accuracy first, then let your typing speed rise naturally.',
    'After each phrase, check the words before moving to the next line.',
    'If a sentence feels difficult, pause briefly and repeat the full idea.',
    'The morning report includes plans, notes, and a careful review of priorities.',
    'During the meeting, the team compares options and records the next actions.',
    'A reliable transcript needs patience, punctuation, and consistent attention.',
    'At the end, review names, numbers, and the most important verbs again.',
  ],
  es: [
    'Esta practica usa frases claras, ritmo estable y pausas breves.',
    'Concetrate primero en la precision y despues aumenta la velocidad poco a poco.',
    'Despues de cada frase, revisa las palabras antes de continuar.',
    'Si una oracion parece dificil, haz una pausa y repite la idea completa.',
    'El informe de la manana incluye planes, notas y prioridades del dia.',
    'Durante la reunion, el equipo compara opciones y registra las proximas tareas.',
    'Una transcripcion fiable necesita paciencia, puntuacion y atencion constante.',
    'Al final, revisa nombres, numeros y los verbos mas importantes otra vez.',
  ],
};

const HARD_FALLBACK_PHRASES: Record<LanguageCode, string[]> = {
  de: [
    'Obwohl der Zeitplan eng bleibt, muessen die wichtigsten Entscheidungen praezise dokumentiert werden.',
    'Die Analyse vergleicht mehrere Vorschlaege, bevor ein tragfaehiger Kompromiss formuliert wird.',
    'Besonders anspruchsvoll sind lange Nebensaetze, wechselnde Betonungen und unerwartete Fachbegriffe.',
    'Am Ende entsteht ein Protokoll, das Ursachen, Folgen und konkrete naechste Schritte trennt.',
  ],
  en: [
    'Although the schedule remains tight, the most important decisions must be documented precisely.',
    'The analysis compares several proposals before a workable compromise is finally written down.',
    'Long clauses, shifting emphasis, and unexpected technical terms make the exercise more demanding.',
    'The final note separates causes, consequences, and concrete next steps for the team.',
  ],
  es: [
    'Aunque el horario sigue ajustado, las decisiones principales deben documentarse con precision.',
    'El analisis compara varias propuestas antes de formular un compromiso practico.',
    'Las frases largas, los cambios de enfasis y los terminos tecnicos aumentan la dificultad.',
    'La nota final separa causas, consecuencias y proximos pasos concretos para el equipo.',
  ],
};

export function buildFallbackOpenRouterSessionScript(options: FallbackScriptOptions): DictationScript {
  const difficulty = options.targetDifficulty ?? 'normal';
  const basePhrases = difficulty === 'hard'
    ? [...FALLBACK_PHRASES[options.language], ...HARD_FALLBACK_PHRASES[options.language]]
    : FALLBACK_PHRASES[options.language];
  const phraseCount = options.durationMinutes === 4 ? 24 : options.durationMinutes === 3 ? 18 : 12;
  const difficultyScore = difficulty === 'hard' ? 0.78 : difficulty === 'easy' ? 0.35 : 0.55;

  return {
    title: buildFallbackTitle(options.language, options.durationMinutes, difficulty),
    language: options.language,
    inputMode: options.inputMode,
    difficulty,
    estimatedDurationSec: options.durationMinutes * 60,
    targetSkills: ['accuracy', 'steady pacing', 'phrase recall'],
    recommendedRateRange: options.language === 'de' ? [0.8, 0.88] : [0.9, 1],
    recommendedPhraseSize: 'medium' satisfies PhraseSize,
    recommendedPauseMs: options.language === 'de' ? 800 : 650,
    phrases: Array.from({ length: phraseCount }, (_, index) => ({
      id: `local-fallback-${options.language}-${index + 1}`,
      text: basePhrases[index % basePhrases.length],
      boundaryType: 'sentence' satisfies PhraseBoundaryType,
      pauseAfterMs: options.language === 'de' ? 850 : 700,
      canReplayIndependently: true,
      requiresContinuation: false,
      semanticCompleteness: 1,
      difficulty: difficultyScore,
      emphasisWords: [],
      intonationHint: 'falling' satisfies DictationScriptIntonationHint,
    })),
  };
}

export function isTransientOpenRouterGenerationError(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized.includes('failed to reach openrouter endpoint') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('timed out') ||
    normalized.includes('timeout') ||
    normalized.includes('network') ||
    normalized.includes('function_invocation_timeout') ||
    normalized.includes('deployment function') ||
    normalized.includes('session expired') ||
    normalized.includes('sign in to dicta') ||
    normalized.includes('unauthorized')
  );
}

export function isTransientGenerationErrorSessionLike(value: unknown): boolean {
  const record = asRecord(value);
  const name = typeof record.name === 'string' ? record.name.toLowerCase() : '';
  const message = typeof record.generationError === 'string' ? record.generationError : '';
  return record.status === 'error' && name.includes('generation error') && isTransientOpenRouterGenerationError(message);
}

function buildFallbackTitle(language: LanguageCode, durationMinutes: number, difficulty: DictationScriptDifficulty): string {
  const languageName = language === 'de' ? 'German' : language === 'es' ? 'Spanish' : 'English';
  const level = difficulty === 'hard' ? 'advanced' : difficulty === 'easy' ? 'easy' : 'steady';
  return `Local ${languageName} ${level} practice (${durationMinutes} min)`;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {};
}
