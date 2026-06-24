import type { DictationScriptDifficulty } from './dictationScriptValidation';
import type { OpenRouterDurationMinutes } from './openRouterGenerationPrompt';
import type { InputLanguageBenchmarkMetrics, ListeningTrainingPrescription } from './types';
import { formatSupportedLanguage } from '../languages';

type DurationTargets = {
  durationLabel: string;
  targetSpokenWords: number;
  minSpokenWords: number;
  maxSpokenWords: number;
  minimumPhraseCount: number;
};

type BuildHardRulesPromptArgs = {
  normalizedProfile: InputLanguageBenchmarkMetrics;
  outputTemplate: string;
  durationMinutes: OpenRouterDurationMinutes;
  trainingPrescription: ListeningTrainingPrescription;
  targetDifficulty?: DictationScriptDifficulty;
  difficultyInstruction?: string;
  diversificationHints?: string[];
  topicContext?: string;
};

type BuildCompactAdaptiveV2PromptArgs = BuildHardRulesPromptArgs & {
  compactAdaptiveV2Context: string;
};

export function buildOpenRouterHardRulesPrompt({
  normalizedProfile,
  outputTemplate,
  durationMinutes,
  trainingPrescription,
  targetDifficulty,
  difficultyInstruction,
  diversificationHints,
  topicContext,
}: BuildHardRulesPromptArgs): string {
  const { durationLabel, targetSpokenWords, minSpokenWords, maxSpokenWords, minimumPhraseCount } =
    getDurationTargets(durationMinutes, trainingPrescription);

  return [
    'Return only a single JSON object. Do not wrap it in Markdown.',
    `The returned JSON field "inputMode" must be exactly "${normalizedProfile.inputMode}".`,
    `The returned JSON field "language" must be exactly "${normalizedProfile.language}".`,
    ...(targetDifficulty ? [`The returned JSON field "difficulty" must be exactly "${targetDifficulty}".`] : []),
    ...(difficultyInstruction ? [difficultyInstruction] : []),
    ...buildTopicContextPromptLines(topicContext),
    `Generate a training script with voice playback duration of ${durationLabel} and set "estimatedDurationSec" close to ${durationMinutes * 60}.`,
    `The combined spoken text across all phrases should be ${minSpokenWords}-${maxSpokenWords} words, approximately ${targetSpokenWords} words total, so the actual dictation lasts about ${durationLabel}.`,
    `Create at least ${minimumPhraseCount} phrases unless the phrases are unusually long; each phrase should usually contain 10-18 spoken words.`,
    'The word budget already accounts for Browser TTS rate and phrase pauses. Stay within the word range and complete the JSON.',
    'Do not satisfy the duration by changing only "estimatedDurationSec"; generate enough phrase text for the requested voice/audio length.',
    '"estimatedDurationSec" means the expected time the learner hears the voice/audio, not total attempt or typing time.',
    'The JSON must validate against the DictationScript output template.',
    ...buildDiversificationPromptLines(diversificationHints),
    ...buildAdaptivePolicyConstraintsSection(trainingPrescription),
    '',
    'Output template:',
    outputTemplate,
  ].join('\n');
}

export function buildCompactAdaptiveV2Prompt({
  normalizedProfile,
  trainingPrescription,
  outputTemplate,
  durationMinutes,
  targetDifficulty,
  difficultyInstruction,
  diversificationHints,
  topicContext,
  compactAdaptiveV2Context,
}: BuildCompactAdaptiveV2PromptArgs): string {
  const { durationLabel, targetSpokenWords, minSpokenWords, maxSpokenWords, minimumPhraseCount } =
    getDurationTargets(durationMinutes, trainingPrescription);
  const languageName = formatSupportedLanguage(normalizedProfile.language);

  return [
    'Generate the next Dicta dictation training session.',
    'Return only valid JSON. Do not use Markdown or code fences.',
    `Use exactly inputMode "${normalizedProfile.inputMode}" and language "${normalizedProfile.language}".`,
    `Write all phrase text naturally in ${languageName}.`,
    'Generate phrase text only; Dicta controls playback, rate, pauses, chunking, recovery, and replay at runtime.',
    'Use the resolved trainer constraints below as the source of truth; benchmark and feedback context are secondary.',
    `Set "difficulty" exactly to "${trainingPrescription.difficulty}".`,
    `Set "recommendedRateRange" to ${JSON.stringify(trainingPrescription.targetRateRange)}.`,
    `Set "recommendedPhraseSize" to "${trainingPrescription.targetPhraseSize}".`,
    `Set "recommendedPauseMs" close to ${trainingPrescription.targetPauseMs}.`,
    `Keep phrase-level "difficulty" values in ${trainingPrescription.phraseDifficultyRange[0].toFixed(2)}-${trainingPrescription.phraseDifficultyRange[1].toFixed(2)}.`,
    ...buildTrainingPrescriptionRequestNotes(trainingPrescription, targetDifficulty, difficultyInstruction),
    ...buildTopicContextPromptLines(topicContext),
    `Target voice playback duration: ${durationLabel}; set "estimatedDurationSec" close to ${durationMinutes * 60}.`,
    `Combined spoken phrase text: ${minSpokenWords}-${maxSpokenWords} words, approximately ${targetSpokenWords} words total.`,
    `Create at least ${minimumPhraseCount} phrases unless phrases are unusually long; each phrase should usually contain 10-18 spoken words.`,
    'The word budget already accounts for Browser TTS rate and phrase pauses. Stay within the word range and complete the JSON.',
    'Generate natural semantic phrases for dictation.',
    'Use safe semantic boundaries, replayable phrases when possible, the prescribed phrase difficulty range, content guidance, and pacing-compatible phrase lengths.',
    'Do not satisfy duration by changing only "estimatedDurationSec"; generate enough phrase text for the requested voice/audio length.',
    ...buildAdaptivePolicyConstraintsSection(trainingPrescription),
    ...buildDiversificationPromptLines(diversificationHints),
    '',
    'Required output JSON schema/template:',
    outputTemplate,
    '',
    'Compact adaptive context:',
    compactAdaptiveV2Context,
  ].join('\n');
}

function getDurationTargets(
  durationMinutes: OpenRouterDurationMinutes,
  trainingPrescription: ListeningTrainingPrescription,
): DurationTargets {
  if (durationMinutes === 6) {
    return getRuntimeAwareSixMinuteTargets(trainingPrescription);
  }

  const targetSpokenWords = Math.round(durationMinutes * 60 * 2.6);
  return {
    durationLabel: formatDurationMinutes(durationMinutes),
    targetSpokenWords,
    minSpokenWords: Math.round(targetSpokenWords * 0.85),
    maxSpokenWords: Math.round(targetSpokenWords * 1.1),
    minimumPhraseCount: durationMinutes * 10,
  };
}

function getRuntimeAwareSixMinuteTargets(trainingPrescription: ListeningTrainingPrescription): DurationTargets {
  const durationMinutes: OpenRouterDurationMinutes = 6;
  const minimumPhraseCount = 42;
  const [lowRate, highRate] = trainingPrescription.targetRateRange;
  const averageRate = clampFinite((lowRate + highRate) / 2, 0.55, 1.1);
  const pauseSec = clampFinite(trainingPrescription.targetPauseMs / 1000, 0.5, 4);
  const targetVoiceSeconds = durationMinutes * 60;
  const estimatedPauseSeconds = minimumPhraseCount * pauseSec * 0.75;
  const spokenSeconds = Math.max(120, targetVoiceSeconds - estimatedPauseSeconds);
  const targetSpokenWords = Math.round(clampFinite(spokenSeconds * 2.6 * averageRate, 430, 760));

  return {
    durationLabel: formatDurationMinutes(durationMinutes),
    targetSpokenWords,
    minSpokenWords: Math.round(targetSpokenWords * 0.85),
    maxSpokenWords: Math.round(targetSpokenWords * 1.1),
    minimumPhraseCount,
  };
}

function clampFinite(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function formatDurationMinutes(minutes: OpenRouterDurationMinutes): string {
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

function buildTopicContextPromptLines(topicContext?: string): string[] {
  const trimmed = topicContext?.trim();
  if (!trimmed) return [];

  return [
    'User topic context:',
    trimmed,
    'Use the topic as the semantic theme for the session, but keep the resolved trainer difficulty, phrase length, language, and pacing constraints above the topic preference.',
  ];
}

function buildDiversificationPromptLines(diversificationHints?: string[]): string[] {
  if (!diversificationHints || diversificationHints.length === 0) return [];

  return ['Diversification constraints:', ...diversificationHints.map((hint, index) => `${index + 1}. ${hint}`)];
}

function buildTrainingPrescriptionRequestNotes(
  trainingPrescription: ListeningTrainingPrescription,
  targetDifficulty?: DictationScriptDifficulty,
  difficultyInstruction?: string,
): string[] {
  const notes: string[] = [];
  if (targetDifficulty) {
    notes.push(
      `User requested difficulty "${targetDifficulty}", resolved trainer difficulty "${trainingPrescription.difficulty}". Use the resolved trainer difficulty.`,
    );
  }
  if (difficultyInstruction) {
    notes.push(`Original difficulty note is secondary to trainingPrescription: ${difficultyInstruction}`);
  }
  return notes;
}

function buildAdaptivePolicyConstraintsSection(trainingPrescription: ListeningTrainingPrescription): string[] {
  const { runtimePolicy, learningPolicy } = trainingPrescription;
  const contentGuidance = learningPolicy.contentGuidance.length > 0 ? learningPolicy.contentGuidance.join('; ') : 'n/a';

  return [
    '',
    'Adaptive policy constraints:',
    `Runtime policy: target rate range ${JSON.stringify(runtimePolicy.targetRateRange)}, pause ${runtimePolicy.targetPauseMs}ms, phrase size ${runtimePolicy.targetPhraseSize}, boundary policy ${runtimePolicy.boundaryPolicy}.`,
    `Learning policy: difficulty ${learningPolicy.difficulty}, phrase difficulty range ${learningPolicy.phraseDifficultyRange[0].toFixed(2)}-${learningPolicy.phraseDifficultyRange[1].toFixed(2)}, phrase policy ${learningPolicy.phrasePolicy}, content guidance ${contentGuidance}.`,
    'Generation rule: follow the learning policy for content complexity. Do not compensate for runtime instability by generating harder content.',
    'If runtime policy is recovery or stabilization, prefer short safe semantic phrases, everyday vocabulary, and avoid dense sentence nesting.',
  ];
}
