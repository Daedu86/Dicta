import type { DictationScript } from '../src/core/adaptive/dictationScriptValidation';

export const validScript: DictationScript = {
  title: 'Generated Dictation',
  language: 'en',
  inputMode: 'browser-tts',
  difficulty: 'normal',
  estimatedDurationSec: 90,
  targetSkills: [],
  recommendedRateRange: [0.9, 1],
  recommendedPhraseSize: 'medium',
  recommendedPauseMs: 600,
  phrases: [
    {
      id: 'p01',
      text: 'This is the first phrase.',
      boundaryType: 'sentence',
      pauseAfterMs: 600,
      canReplayIndependently: true,
      requiresContinuation: false,
      semanticCompleteness: 0.9,
      difficulty: 0.4,
      emphasisWords: [],
      intonationHint: 'falling',
    },
    {
      id: 'p02',
      text: 'This phrase stays second.',
      boundaryType: 'sentence',
      pauseAfterMs: 600,
      canReplayIndependently: true,
      requiresContinuation: false,
      semanticCompleteness: 0.85,
      difficulty: 0.45,
      emphasisWords: [],
      intonationHint: 'falling',
    },
  ],
};
