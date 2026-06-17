export const validScript = {
  title: 'Ein ruhiger Morgen',
  language: 'de',
  inputMode: 'browser-tts',
  difficulty: 'easy',
  estimatedDurationSec: 60,
  targetSkills: [],
  recommendedRateRange: [0.8, 0.85],
  recommendedPhraseSize: 'short',
  recommendedPauseMs: 1200,
  phrases: [
    {
      id: 'p01',
      text: 'Heute bereite ich das Frühstück langsam und aufmerksam vor.',
      boundaryType: 'clause',
      pauseAfterMs: 1200,
      canReplayIndependently: true,
      requiresContinuation: false,
      semanticCompleteness: 0.9,
      difficulty: 0.35,
      emphasisWords: [],
      intonationHint: 'neutral',
    },
  ],
};

export const directMobileButtonPayloads = [
  { slotLabel: 'Easy direct session', durationMinutes: 2, targetDifficulty: 'easy' },
  { slotLabel: 'Intermediate direct session', durationMinutes: 2, targetDifficulty: 'normal' },
  { slotLabel: 'Advanced direct session', durationMinutes: 2, targetDifficulty: 'hard' },
] as const;
