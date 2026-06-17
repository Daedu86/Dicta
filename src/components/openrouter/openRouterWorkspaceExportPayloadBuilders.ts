import { buildSelectedBenchmarkExportPayload } from '../../core/adaptive/benchmarkJson';
import { buildDictationScriptPrompt, buildDictationScriptTemplate } from '../../core/adaptive/dictationScriptPrompt';
import {
  buildBenchmarkFeedbackPackage,
  buildBenchmarkFeedbackPromptPackage,
  buildSessionFeedbackJsonPayload,
  derivePlaybackDiagnosticsFromTimeline,
} from '../../core/adaptive/sessionFeedback';
import type {
  BuildOpenRouterWorkspaceExportPayloadsArgs,
  OpenRouterWorkspaceExportContext,
} from './openRouterWorkspaceRuntimeHelpers';

const SESSION_FEEDBACK_TIMELINE_LIMIT = 60;

export function buildOpenRouterWorkspaceExportPayloads(args: BuildOpenRouterWorkspaceExportPayloadsArgs) {
  const activeSessionStatus = args.exportActiveSessionStatus;
  const llmPrompt = buildDictationScriptPrompt(args.exportProfile);
  const context: OpenRouterWorkspaceExportContext = { ...args, activeSessionStatus, llmPrompt };
  const compactBenchmarkObject = buildCompactBenchmarkObject(context);
  const compactSessionFeedbackObject = buildCompactSessionFeedbackObject(context);
  const benchmarkFeedbackPackage = buildBenchmarkFeedbackRecord(context);

  return {
    benchmarkJson: stringifyOpenRouterPackage(buildSelectedBenchmarkExportPayload(args.exportProfile)),
    llmPrompt,
    outputTemplate: buildDictationScriptTemplate(args.exportProfile.inputMode, args.exportProfile.language),
    benchmarkOnlyPackage: buildBenchmarkOnlyPackage(context),
    diagnosticPackage: stringifyOpenRouterPackage(benchmarkFeedbackPackage),
    promptPackage: buildBenchmarkFeedbackPromptPackage(args.exportProfile, args.exportSessionFeedback, llmPrompt, {
      activeSessionStatus,
    }),
    sessionFeedbackJson: stringifyOpenRouterPackage(buildSessionFeedbackPayload(context)),
    humanNotesPackage: stringifyOpenRouterPackage(buildHumanNotesPackage(context, benchmarkFeedbackPackage)),
    compactBenchmark: stringifyOpenRouterPackage(compactBenchmarkObject),
    compactSessionFeedback: stringifyOpenRouterPackage(compactSessionFeedbackObject),
    compactPromptPackage: stringifyOpenRouterPackage({
      benchmark: compactBenchmarkObject,
      latestSessionFeedback: compactSessionFeedbackObject,
      llmPrompt,
    }),
  };
}

function stringifyOpenRouterPackage(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function buildBenchmarkOnlyPackage({ exportProfile, llmPrompt }: OpenRouterWorkspaceExportContext): string {
  const benchmarkJson = stringifyOpenRouterPackage(buildSelectedBenchmarkExportPayload(exportProfile));
  return `Benchmark JSON context:\n${benchmarkJson}\n\nLLM prompt:\n${llmPrompt}`;
}

function buildBenchmarkFeedbackRecord({
  exportProfile,
  exportSessionFeedback,
  activeSessionStatus,
}: OpenRouterWorkspaceExportContext): Record<string, unknown> {
  return buildBenchmarkFeedbackPackage(exportProfile, exportSessionFeedback, { activeSessionStatus }) as Record<string, unknown>;
}

function buildSessionFeedbackPayload({
  exportProfile,
  exportSessionFeedback,
  activeSessionStatus,
}: OpenRouterWorkspaceExportContext): unknown {
  return buildSessionFeedbackJsonPayload(exportProfile.inputMode, exportProfile.language, exportSessionFeedback, {
    activeSessionStatus,
    fallbackDiagnostics: derivePlaybackDiagnosticsFromTimeline(exportProfile.timeline.slice(-SESSION_FEEDBACK_TIMELINE_LIMIT)),
  });
}

function buildHumanNotesPackage(
  { llmPrompt, humanFeedbackDraft }: OpenRouterWorkspaceExportContext,
  benchmarkFeedbackPackage: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...benchmarkFeedbackPackage,
    llmPrompt,
    humanFeedback: humanFeedbackDraft.trim(),
  };
}

function buildCompactBenchmarkObject({ exportProfile }: OpenRouterWorkspaceExportContext): Record<string, unknown> {
  return {
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
  };
}

function buildCompactSessionFeedbackObject({ exportSessionFeedback }: OpenRouterWorkspaceExportContext): Record<string, unknown> {
  if (!exportSessionFeedback) return { verdict: 'n/a' };

  return {
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
  };
}
