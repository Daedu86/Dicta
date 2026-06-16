import type { InputMode } from '../../core/adaptive/types';
import { buildSelectedBenchmarkExportPayload } from '../../core/adaptive/benchmarkJson';
import { buildDictationScriptPrompt, buildDictationScriptTemplate } from '../../core/adaptive/dictationScriptPrompt';
import type { OpenRouterGeneratePromptSource } from '../../core/adaptive/openRouterGenerationPrompt';
import {
  buildBenchmarkFeedbackPackage,
  buildBenchmarkFeedbackPromptPackage,
  buildSessionFeedbackJsonPayload,
  derivePlaybackDiagnosticsFromTimeline,
} from '../../core/adaptive/sessionFeedback';
import { SUPPORTED_LANGUAGES } from '../../core/languages';
import { getOpenRouterSlotLabel } from './openRouterViewHelpers';
import type { BenchmarkLanguageButton, OpenRouterGenerationSlotId, OpenRouterGenerationSlotState, OpenRouterWorkspaceProps } from './types';

export const OPEN_ROUTER_PROFILE_INPUT_MODE_OPTIONS: Array<{ value: InputMode; label: string; description: string }> = [
  { value: 'browser-tts', label: 'Browser TTS', description: 'Browser SpeechSynthesis' },
];

export const OPEN_ROUTER_PROFILE_LANGUAGE_OPTIONS: Array<{ value: BenchmarkLanguageButton; label: string }> = SUPPORTED_LANGUAGES.map((language) => ({
  value: language,
  label: language.toUpperCase(),
}));

export const OPEN_ROUTER_GENERATE_PROMPT_SOURCE_OPTIONS: Array<{ value: OpenRouterGeneratePromptSource; label: string; description: string }> = [
  { value: 'compact-adaptive-v2', label: 'Compact adaptive v2', description: 'Reduced-duplication benchmark + feedback prompt.' },
  { value: 'compact-adaptive', label: 'Compact adaptive', description: 'Compact benchmark + compact feedback when available.' },
  { value: 'compact-benchmark-only', label: 'Compact benchmark', description: 'Compact benchmark only; skips latest feedback.' },
  { value: 'compact-base', label: 'Compact base', description: 'Base prompt only; smallest prompt.' },
  { value: 'original-adaptive', label: 'Original adaptive', description: 'Full benchmark + full feedback when available.' },
  { value: 'original-benchmark-only', label: 'Original benchmark', description: 'Full benchmark only; skips latest feedback.' },
  { value: 'original-base', label: 'Original base', description: 'Original base prompt only.' },
];

export const OPEN_ROUTER_GENERATE_DURATION_OPTIONS: Array<2 | 3 | 4> = [2, 3, 4];

type BuildOpenRouterWorkspaceExportPayloadsArgs = Pick<
  OpenRouterWorkspaceProps,
  'exportActiveSessionStatus' | 'exportProfile' | 'exportSessionFeedback'
> & {
  humanFeedbackDraft: string;
};

export function formatOpenRouterPromptSizeHint(value: string): string {
  const normalized = value.trim();
  if (!normalized) return 'Words: 0 · Tokens: ~0';
  const words = normalized.split(/\s+/).filter(Boolean).length;
  const chars = normalized.length;
  const estimatedTokens = Math.max(1, Math.round(chars / 4));
  return `Words: ${words} · Tokens: ~${estimatedTokens}`;
}

export function buildOpenRouterWorkspaceVariantPrompt(
  slotId: OpenRouterGenerationSlotId,
  basePrompt: string,
  slot: OpenRouterGenerationSlotState,
  modelId: string,
): string {
  const slotLabel = getOpenRouterSlotLabel(slotId);
  const notes = slot.notes.trim() || 'No additional variant notes.';
  return [
    basePrompt,
    '',
    `Variant-specific notes for ${slotLabel}:`,
    `Selected model: ${modelId || 'not selected'}.`,
    'Use these notes to make this variant meaningfully different from the other prompt while still obeying the required schema, inputMode, language, and duration.',
    notes,
  ].join('\n');
}

export function buildOpenRouterWorkspaceExportPayloads({
  exportActiveSessionStatus,
  exportProfile,
  exportSessionFeedback,
  humanFeedbackDraft,
}: BuildOpenRouterWorkspaceExportPayloadsArgs) {
  const activeSessionStatus = exportActiveSessionStatus;
  const benchmarkJson = JSON.stringify(buildSelectedBenchmarkExportPayload(exportProfile), null, 2);
  const llmPrompt = buildDictationScriptPrompt(exportProfile);
  const outputTemplate = buildDictationScriptTemplate(exportProfile.inputMode, exportProfile.language);
  const benchmarkOnlyPackage = `Benchmark JSON context:\n${benchmarkJson}\n\nLLM prompt:\n${llmPrompt}`;
  const benchmarkFeedbackPackage = buildBenchmarkFeedbackPackage(exportProfile, exportSessionFeedback, { activeSessionStatus }) as Record<
    string,
    unknown
  >;
  const diagnosticPackage = JSON.stringify(benchmarkFeedbackPackage, null, 2);
  const promptPackage = buildBenchmarkFeedbackPromptPackage(exportProfile, exportSessionFeedback, llmPrompt, { activeSessionStatus });
  const sessionFeedbackJson = JSON.stringify(
    buildSessionFeedbackJsonPayload(exportProfile.inputMode, exportProfile.language, exportSessionFeedback, {
      activeSessionStatus,
      fallbackDiagnostics: derivePlaybackDiagnosticsFromTimeline(exportProfile.timeline.slice(-60)),
    }),
    null,
    2,
  );
  const humanNotesPackage = JSON.stringify(
    {
      ...benchmarkFeedbackPackage,
      llmPrompt,
      humanFeedback: humanFeedbackDraft.trim(),
    },
    null,
    2,
  );

  const compactBenchmark = JSON.stringify(
    {
      profileKey: `${exportProfile.inputMode}/${exportProfile.language}`,
      sessionCount: exportProfile.sessionCount,
      sampleCount: exportProfile.sampleCount,
      lastUpdatedAt: exportProfile.lastUpdatedAt ?? null,
      recommendation: exportProfile.recommendation,
      weakAreas: exportProfile.weakAreas,
      kpis: {
        sweetSpotScore: exportProfile.sweetSpotScore,
        semanticFidelityScore: exportProfile.semanticFidelityScore,
        controlFidelityScore: exportProfile.controlFidelityScore,
        learningEffectivenessScore: exportProfile.learningEffectivenessScore,
        flowStabilityScore: exportProfile.flowStabilityScore,
        averageAccuracy: exportProfile.averageAccuracy,
        averageWpm: exportProfile.averageWpm,
        averageLagSec: exportProfile.averageLagSec,
        preferredPlaybackRate: exportProfile.preferredPlaybackRate,
        preferredPhraseSize: exportProfile.preferredPhraseSize,
      },
    },
    null,
    2,
  );

  const compactSessionFeedback = JSON.stringify(
    exportSessionFeedback
      ? {
          verdict: exportSessionFeedback.verdict,
          improvementDelta: exportSessionFeedback.improvementDelta,
          playbackIssues: {
            repeatedPhraseCount: exportSessionFeedback.playbackIssues.repeatedPhraseCount,
            maxRepeatCountForSinglePhrase: exportSessionFeedback.playbackIssues.maxRepeatCountForSinglePhrase,
            skippedPhraseCount: exportSessionFeedback.playbackIssues.skippedPhraseCount,
            outOfOrderAdvanceCount: exportSessionFeedback.playbackIssues.outOfOrderAdvanceCount,
            replayAdvancedPhraseCount: exportSessionFeedback.playbackIssues.replayAdvancedPhraseCount,
            phraseIndexJumpCount: exportSessionFeedback.playbackIssues.phraseIndexJumpCount,
          },
          phraseStats: exportSessionFeedback.phraseStats,
          notes: exportSessionFeedback.notes.slice(0, 8),
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

  return {
    benchmarkJson,
    llmPrompt,
    outputTemplate,
    benchmarkOnlyPackage,
    diagnosticPackage,
    promptPackage,
    sessionFeedbackJson,
    humanNotesPackage,
    compactBenchmark,
    compactSessionFeedback,
    compactPromptPackage,
  };
}
