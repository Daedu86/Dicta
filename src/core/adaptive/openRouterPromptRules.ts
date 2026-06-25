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

const BASE_SPOKEN_WORDS_PER_SECOND = 2.6;
const MIN_WORD_FACTOR = 0.85;
const MAX_WORD_FACTOR = 1.1;

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
    getDurationTargets(durationMinutes);

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
    'The word budget scales with the selected duration. Stay within the word range and complete the JSON.',
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
  durationMinutes,
  targetDifficulty,
  difficultyInstruction,
  diversificationHints,
  topicContext,
  compactAdaptiveV2Context,
}: BuildCompactAdaptiveV2PromptArgs): string {
  const { durationLabel, targetSpokenWords, minSpokenWords, maxSpokenWords, minimumPhraseCount } =
    getDurationTargets(durationMinutes);
  const languageName = formatSupportedLanguage(normalizedProfile.language);

  return [
    'Generate the next Dicta dictation training session.',
    'Return only valid compact JSON. Do not use Markdown or code fences.',
    'Required output shape: {"title":"short specific title","chunks":["semantic chunk one","semantic chunk two"]}.',
    'The title is optional but preferred; chunks must be a non-empty array of natural text strings.',
    'Do not include per-phrase metadata, playback metadata, schema templates, or extra fields. Dicta builds the full DictationScript locally.',
    `Target Dicta profile: inputMode "${normalizedProfile.inputMode}", language "${normalizedProfile.language}".`,
    `Write all chunk text naturally in ${languageName}.`,
    'Generate content chunks only; Dicta controls playback, rate, pauses, chunking, recovery, and replay at runtime.',
    'Use the resolved trainer constraints below as the source of truth; benchmark and feedback context are secondary.',
    `Resolved content difficulty: "${trainingPrescription.difficulty}".`,
    `Use ${trainingPrescription.targetPhraseSize} semantic chunks with content complexity in the ${trainingPrescription.phraseDifficultyRange[0].toFixed(2)}-${trainingPrescription.phraseDifficultyRange[1].toFixed(2)} training zone.`,
    ...buildTrainingPrescriptionRequestNotes(trainingPrescription, targetDifficulty, difficultyInstruction),
    ...buildTopicContextPromptLines(topicContext),
    `Target voice playback duration: ${durationLabel}; Dicta will set duration metadata locally.`,
    `Combined spoken chunk text: ${minSpokenWords}-${maxSpokenWords} words, approximately ${targetSpokenWords} words total.`,
    `Create at least ${minimumPhraseCount} chunks unless chunks are unusually long; each chunk should usually contain 10-18 spoken words.`,
    'The word budget scales with the selected duration. Stay within the word range and complete the compact JSON.',
    'Generate natural semantic chunks for dictation.',
    'Use safe semantic boundaries, replayable ideas when possible, the prescribed difficulty range, content guidance, and pacing-compatible chunk lengths.',
    'Do not satisfy duration by adding metadata; generate enough chunk text for the requested voice/audio length.',
    ...buildAdaptivePolicyConstraintsSection(trainingPrescription),
    ...buildDiversificationPromptLines(diversificationHints),
    '',
    'Compact adaptive context:',
    compactAdaptiveV2Context,
  ].join('\n');
}

function getDurationTargets(durationMinutes: OpenRouterDurationMinutes): DurationTargets {
  const targetSpokenWords = Math.round(durationMinutes * 60 * BASE_SPOKEN_WORDS_PER_SECOND);
  const minimumPhraseCount = durationMinutes * 10;
  return {
    durationLabel: formatDurationMinutes(durationMinutes),
    targetSpokenWords,
    minSpokenWords: Math.round(targetSpokenWords * MIN_WORD_FACTOR),
    maxSpokenWords: Math.round(targetSpokenWords * MAX_WORD_FACTOR),
    minimumPhraseCount,
  };
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
