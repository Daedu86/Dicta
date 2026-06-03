import { buildSelectedBenchmarkExportPayload } from './benchmarkJson';
import type { DictationScriptDifficulty } from './dictationScriptValidation';
import { buildDictationScriptPrompt, buildDictationScriptTemplate } from './dictationScriptPrompt';
import { buildBenchmarkFeedbackPromptPackage } from './sessionFeedback';
import { normalizeInputLanguageBenchmarkForRecommendation } from './AdaptiveInputLanguageBenchmarkService';
import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics } from './types';
import { formatSupportedLanguage } from '../languages';

export type OpenRouterGeneratePromptSource =
  | 'compact-adaptive'
  | 'compact-adaptive-v2'
  | 'compact-benchmark-only'
  | 'compact-base'
  | 'original-adaptive'
  | 'original-benchmark-only'
  | 'original-base';

export type OpenRouterDurationMinutes = 1 | 2 | 3 | 4;

export type OpenRouterGenerationPromptArgs = {
  profile: InputLanguageBenchmarkMetrics;
  sessionFeedback: AdaptiveSessionFeedback | null;
  promptSource: OpenRouterGeneratePromptSource;
  durationMinutes: OpenRouterDurationMinutes;
  targetDifficulty?: DictationScriptDifficulty;
  difficultyInstruction?: string;
  diversificationHints?: string[];
};

export type OpenRouterGenerationPromptPayload = {
  prompt: string;
  outputTemplate: string;
};

export type OpenRouterPromptSizeEstimate = {
  characterCount: number;
  approximateTokenCount: number;
  promptMode: OpenRouterGeneratePromptSource;
  durationMinutes: OpenRouterDurationMinutes;
  targetDifficulty?: DictationScriptDifficulty;
  inputMode: InputLanguageBenchmarkMetrics['inputMode'];
  language: InputLanguageBenchmarkMetrics['language'];
};

export function estimateOpenRouterPromptSize(
  prompt: string,
  metadata: Omit<OpenRouterPromptSizeEstimate, 'characterCount' | 'approximateTokenCount'>,
): OpenRouterPromptSizeEstimate {
  return {
    ...metadata,
    characterCount: prompt.length,
    approximateTokenCount: Math.max(1, Math.round(prompt.length / 4)),
  };
}

export function getOpenRouterGenerationMaxTokens(durationMinutes: OpenRouterDurationMinutes): number {
  switch (durationMinutes) {
    case 1:
      return 1_800;
    case 2:
      return 2_600;
    case 3:
      return 3_800;
    case 4:
      return 4_800;
  }
}

export function buildOpenRouterGenerationPrompt({
  profile,
  sessionFeedback,
  promptSource,
  durationMinutes,
  targetDifficulty,
  difficultyInstruction,
  diversificationHints,
}: OpenRouterGenerationPromptArgs): OpenRouterGenerationPromptPayload {
  const normalizedProfile = normalizeInputLanguageBenchmarkForRecommendation(profile);
  const benchmarkJson = JSON.stringify(buildSelectedBenchmarkExportPayload(normalizedProfile), null, 2);
  const llmPrompt = buildDictationScriptPrompt(normalizedProfile);
  const outputTemplate = buildDictationScriptTemplate(normalizedProfile.inputMode, normalizedProfile.language);
  const hasSessionFeedback = Boolean(sessionFeedback);
  const compactBenchmark = JSON.stringify(
    {
      profileKey: `${normalizedProfile.inputMode}/${normalizedProfile.language}`,
      sessionCount: normalizedProfile.sessionCount,
      sampleCount: normalizedProfile.sampleCount,
      lastUpdatedAt: normalizedProfile.lastUpdatedAt ?? null,
      recommendation: normalizedProfile.recommendation,
      weakAreas: normalizedProfile.weakAreas,
      kpis: {
        sweetSpotScore: normalizedProfile.sweetSpotScore,
        semanticFidelityScore: normalizedProfile.semanticFidelityScore,
        controlFidelityScore: normalizedProfile.controlFidelityScore,
        learningEffectivenessScore: normalizedProfile.learningEffectivenessScore,
        flowStabilityScore: normalizedProfile.flowStabilityScore,
        averageAccuracy: normalizedProfile.averageAccuracy,
        averageWpm: normalizedProfile.averageWpm,
        averageLagSec: normalizedProfile.averageLagSec,
        preferredPlaybackRate: normalizedProfile.preferredPlaybackRate,
        preferredPhraseSize: normalizedProfile.preferredPhraseSize,
      },
    },
    null,
    2,
  );
  const compactSessionFeedback = JSON.stringify(
    sessionFeedback
      ? {
          verdict: sessionFeedback.verdict,
          improvementDelta: sessionFeedback.improvementDelta,
          playbackIssues: {
            repeatedPhraseCount: sessionFeedback.playbackIssues.repeatedPhraseCount,
            maxRepeatCountForSinglePhrase: sessionFeedback.playbackIssues.maxRepeatCountForSinglePhrase,
            skippedPhraseCount: sessionFeedback.playbackIssues.skippedPhraseCount,
            outOfOrderAdvanceCount: sessionFeedback.playbackIssues.outOfOrderAdvanceCount,
            replayAdvancedPhraseCount: sessionFeedback.playbackIssues.replayAdvancedPhraseCount,
            phraseIndexJumpCount: sessionFeedback.playbackIssues.phraseIndexJumpCount,
          },
          phraseStats: sessionFeedback.phraseStats,
          notes: sessionFeedback.notes.slice(0, 8),
        }
      : { verdict: 'n/a' },
    null,
    2,
  );
  const compactPromptPackage = JSON.stringify(
    {
      benchmark: JSON.parse(compactBenchmark) as Record<string, unknown>,
      latestSessionFeedback: JSON.parse(compactSessionFeedback) as Record<string, unknown>,
      llmPrompt,
    },
    null,
    2,
  );
  const compactAdaptiveV2Context = JSON.stringify(
    {
      profileKey: `${normalizedProfile.inputMode}/${normalizedProfile.language}`,
      inputMode: normalizedProfile.inputMode,
      language: normalizedProfile.language,
      sessionCount: normalizedProfile.sessionCount,
      sampleCount: normalizedProfile.sampleCount,
      weakAreas: normalizedProfile.weakAreas,
      recommendation: normalizedProfile.recommendation,
      kpis: {
        sweetSpotScore: normalizedProfile.sweetSpotScore,
        semanticFidelityScore: normalizedProfile.semanticFidelityScore,
        controlFidelityScore: normalizedProfile.controlFidelityScore,
        learningEffectivenessScore: normalizedProfile.learningEffectivenessScore,
        flowStabilityScore: normalizedProfile.flowStabilityScore,
        averageAccuracy: normalizedProfile.averageAccuracy,
        averageWpm: normalizedProfile.averageWpm,
        averageLagSec: normalizedProfile.averageLagSec,
        preferredPlaybackRate: normalizedProfile.preferredPlaybackRate,
        preferredPhraseSize: normalizedProfile.preferredPhraseSize,
      },
      ...(sessionFeedback
        ? {
            latestSessionFeedback: {
              verdict: sessionFeedback.verdict,
              improvementDelta: sessionFeedback.improvementDelta,
              playbackIssues: {
                repeatedPhraseCount: sessionFeedback.playbackIssues.repeatedPhraseCount,
                maxRepeatCountForSinglePhrase: sessionFeedback.playbackIssues.maxRepeatCountForSinglePhrase,
                skippedPhraseCount: sessionFeedback.playbackIssues.skippedPhraseCount,
                outOfOrderAdvanceCount: sessionFeedback.playbackIssues.outOfOrderAdvanceCount,
                replayAdvancedPhraseCount: sessionFeedback.playbackIssues.replayAdvancedPhraseCount,
                phraseIndexJumpCount: sessionFeedback.playbackIssues.phraseIndexJumpCount,
              },
              phraseStats: sessionFeedback.phraseStats,
              notes: sessionFeedback.notes.slice(0, 8),
            },
          }
        : {}),
    },
    null,
    2,
  );
  const compactBenchmarkOnlyPackage = `Compact benchmark context:\n${compactBenchmark}\n\nLLM prompt:\n${llmPrompt}`;
  const originalBenchmarkOnlyPackage = `Benchmark JSON context:\n${benchmarkJson}\n\nLLM prompt:\n${llmPrompt}`;
  const originalAdaptivePackage = buildBenchmarkFeedbackPromptPackage(normalizedProfile, sessionFeedback, llmPrompt, {
    activeSessionStatus: undefined,
  });
  const targetSpokenWords = Math.round(durationMinutes * 60 * 2.6);
  const minSpokenWords = Math.round(targetSpokenWords * 0.85);
  const maxSpokenWords = Math.round(targetSpokenWords * 1.1);
  const minimumPhraseCount = durationMinutes * 10;
  const durationLabel = formatDurationMinutes(durationMinutes);
  const hardRules = [
    'Return only a single JSON object. Do not wrap it in Markdown.',
    `The returned JSON field "inputMode" must be exactly "${normalizedProfile.inputMode}".`,
    `The returned JSON field "language" must be exactly "${normalizedProfile.language}".`,
    ...(targetDifficulty ? [`The returned JSON field "difficulty" must be exactly "${targetDifficulty}".`] : []),
    ...(difficultyInstruction ? [difficultyInstruction] : []),
    `Generate a training script with voice playback duration of ${durationLabel} and set "estimatedDurationSec" close to ${durationMinutes * 60}.`,
    `The combined spoken text across all phrases should be ${minSpokenWords}-${maxSpokenWords} words, approximately ${targetSpokenWords} words total, so the actual dictation lasts about ${durationLabel}.`,
    `Create at least ${minimumPhraseCount} phrases unless the phrases are unusually long; each phrase should usually contain 10-18 spoken words.`,
    'If unsure, prefer a slightly longer script over a short one. Do not satisfy the duration by changing only "estimatedDurationSec"; generate enough phrase text to match the requested audio length.',
    '"estimatedDurationSec" means the expected time the learner hears the voice/audio, not total attempt or typing time.',
    'The JSON must validate against the DictationScript output template.',
    ...(diversificationHints && diversificationHints.length > 0
      ? [
          'Diversification constraints:',
          ...diversificationHints.map((hint, index) => `${index + 1}. ${hint}`),
        ]
      : []),
    '',
    'Output template:',
    outputTemplate,
  ].join('\n');
  const languageName = formatSupportedLanguage(normalizedProfile.language);
  const compactAdaptiveV2Prompt = [
    'Generate the next Dicta dictation training session.',
    'Return only valid JSON. Do not use Markdown or code fences.',
    `Use exactly inputMode "${normalizedProfile.inputMode}" and language "${normalizedProfile.language}".`,
    `Write all phrase text naturally in ${languageName}.`,
    ...(targetDifficulty ? [`Set "difficulty" exactly to "${targetDifficulty}".`] : []),
    ...(difficultyInstruction ? [difficultyInstruction] : []),
    `Target voice playback duration: ${durationLabel}; set "estimatedDurationSec" close to ${durationMinutes * 60}.`,
    `Combined spoken phrase text: ${minSpokenWords}-${maxSpokenWords} words, approximately ${targetSpokenWords} words total.`,
    `Create at least ${minimumPhraseCount} phrases unless phrases are unusually long; each phrase should usually contain 10-18 spoken words.`,
    'Use semantic phrase boundaries. Avoid unsafe mid-grammar splits. Keep phrases replayable independently when possible.',
    'Use the adaptive context to target weakAreas, recommendation, and latest feedback when present.',
    'Do not satisfy duration by changing only "estimatedDurationSec"; generate enough phrase text.',
    ...(diversificationHints && diversificationHints.length > 0
      ? [
          'Diversification constraints:',
          ...diversificationHints.map((hint, index) => `${index + 1}. ${hint}`),
        ]
      : []),
    '',
    'Required output JSON schema/template:',
    outputTemplate,
    '',
    'Compact adaptive context:',
    compactAdaptiveV2Context,
  ].join('\n');
  const sourcePayload = (() => {
    switch (promptSource) {
      case 'compact-adaptive':
        return hasSessionFeedback ? compactPromptPackage : compactBenchmarkOnlyPackage;
      case 'compact-adaptive-v2':
        return null;
      case 'compact-benchmark-only':
        return compactBenchmarkOnlyPackage;
      case 'compact-base':
        return llmPrompt;
      case 'original-adaptive':
        return hasSessionFeedback ? originalAdaptivePackage : originalBenchmarkOnlyPackage;
      case 'original-benchmark-only':
        return originalBenchmarkOnlyPackage;
      case 'original-base':
        return llmPrompt;
    }
  })();

  if (promptSource === 'compact-adaptive-v2') {
    return {
      prompt: compactAdaptiveV2Prompt,
      outputTemplate,
    };
  }

  return {
    prompt: `${hardRules}\n\nGeneration context:\n${sourcePayload}`,
    outputTemplate,
  };
}

function formatDurationMinutes(minutes: OpenRouterDurationMinutes): string {
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}
