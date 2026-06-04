import type { InputLanguageBenchmarkMetrics, InputMode, LanguageCode } from './types';

function inputSpecificGuidance(inputMode: InputMode): string {
  const guidance: Record<InputMode, string> = {
    audio: 'Use simple, transcript-friendly sentences with natural sentence boundaries.',
    'browser-tts': 'Use clean clauses and conservative pauses that browser/system TTS can speak predictably.',
    kokoro: 'Use precise phrase-level chunks with complete metadata for local Kokoro generation.',
    'cosyvoice-cache': 'Use cache-friendly and replay-safe chunks for reusable CosyVoice cached audio.',
  };
  return guidance[inputMode];
}

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function buildDictationScriptPrompt(profile: InputLanguageBenchmarkMetrics): string {
  const targetRateRange = profile.recommendation.targetRateRange;
  const targetPhraseSize = profile.recommendation.targetPhraseSize;
  const targetPauseMs = profile.recommendation.targetPauseMs;
  const weakAreas = profile.weakAreas.length > 0 ? profile.weakAreas : ['none_detected'];

  return [
    'You are generating the next dictation training script for Dicta.',
    '',
    'Output ONLY valid JSON. Do not output markdown. Do not output explanations. Do not wrap the JSON in code fences.',
    '',
    'Benchmark context:',
    `inputMode: ${profile.inputMode}`,
    `language: ${profile.language}`,
    `weakAreas: ${stringify(weakAreas)}`,
    `recommendation: ${stringify(profile.recommendation)}`,
    `targetRateRange: ${stringify(targetRateRange)}`,
    `targetPhraseSize: ${targetPhraseSize}`,
    `targetPauseMs: ${targetPauseMs}`,
    `inputSpecificGuidance: ${inputSpecificGuidance(profile.inputMode)}`,
    '',
    'Generation rules:',
    '- Set "title" to a short, specific, human-readable title in the target language that describes this script content.',
    '- Do not use generic titles such as "Generated Dictation", "Dictation", "Training Script", or "Untitled".',
    '- Generate semantic phrases, not raw text chunks.',
    '- Avoid unsafe mid-grammar splits.',
    '- Keep phrases replayable independently when possible.',
    '- Use continuation intonation for incomplete clauses.',
    '- Use falling intonation for full sentences.',
    '- Keep difficulty in the learner training zone, based on the benchmark recommendation.',
    '- Set estimatedDurationSec to the expected voice/audio playback duration only; do not include learner typing or submit time.',
    '- Target the weakAreas listed above.',
    '- Use sentence/clause/minor boundaries when safe; use unsafe only when the text truly requires continuation.',
    '',
    'Return JSON that exactly follows this schema:',
    stringify({
      title: 'string',
      language: 'string',
      inputMode: 'string',
      difficulty: 'easy | normal | hard',
      estimatedDurationSec: 'number',
      targetSkills: ['string'],
      recommendedRateRange: ['number', 'number'],
      recommendedPhraseSize: 'short | medium | long',
      recommendedPauseMs: 'number',
      phrases: [
        {
          id: 'string',
          text: 'string',
          boundaryType: 'sentence | clause | minor | unsafe',
          pauseAfterMs: 'number',
          canReplayIndependently: 'boolean',
          requiresContinuation: 'boolean',
          semanticCompleteness: 'number from 0 to 1',
          difficulty: 'number from 0 to 1',
          emphasisWords: ['string'],
          intonationHint: 'falling | continuation | contrast | question | neutral',
        },
      ],
    }),
  ].join('\n');
}

export function buildDictationScriptTemplate(inputMode: InputMode, language: LanguageCode): string {
  return stringify({
    title: 'Specific content title in the target language',
    language,
    inputMode,
    difficulty: 'normal',
    estimatedDurationSec: 90,
    targetSkills: [],
    recommendedRateRange: [0.9, 1],
    recommendedPhraseSize: 'medium',
    recommendedPauseMs: 600,
    phrases: [
      {
        id: 'p01',
        text: '',
        boundaryType: 'clause',
        pauseAfterMs: 600,
        canReplayIndependently: true,
        requiresContinuation: false,
        semanticCompleteness: 0.8,
        difficulty: 0.6,
        emphasisWords: [],
        intonationHint: 'neutral',
      },
    ],
  });
}
