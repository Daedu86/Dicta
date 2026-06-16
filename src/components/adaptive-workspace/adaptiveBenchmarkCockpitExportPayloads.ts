import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics } from '../../core/adaptive/types';
import { buildSelectedBenchmarkExportPayload } from '../../core/adaptive/benchmarkJson';
import { buildDictationScriptPrompt, buildDictationScriptTemplate } from '../../core/adaptive/dictationScriptPrompt';
import {
  buildBenchmarkFeedbackPackage,
  buildBenchmarkFeedbackPromptPackage,
  buildSessionFeedbackJsonPayload,
} from '../../core/adaptive/sessionFeedback';
import type { derivePlaybackDiagnosticsFromTimeline } from '../../core/adaptive/sessionFeedback';

export type AdaptiveBenchmarkCockpitExportPayloadsInput = {
  profile: InputLanguageBenchmarkMetrics;
  sessionFeedback: AdaptiveSessionFeedback | null;
  fallbackDiagnostics: ReturnType<typeof derivePlaybackDiagnosticsFromTimeline>;
  humanFeedbackDraft: string;
};

export function formatPromptSizeHint(value: string): string {
  const normalized = value.trim();
  if (!normalized) return 'Words: 0 · Tokens: ~0';
  const words = normalized.split(/\s+/).filter(Boolean).length;
  const chars = normalized.length;
  const estimatedTokens = Math.max(1, Math.round(chars / 4));
  return `Words: ${words} · Tokens: ~${estimatedTokens}`;
}

export function buildAdaptiveBenchmarkCockpitExportPayloads({
  profile,
  sessionFeedback,
  fallbackDiagnostics,
  humanFeedbackDraft,
}: AdaptiveBenchmarkCockpitExportPayloadsInput) {
  const activeSessionStatus = undefined;
  const benchmarkJson = JSON.stringify(buildSelectedBenchmarkExportPayload(profile), null, 2);
  const llmPrompt = buildDictationScriptPrompt(profile);
  const outputTemplate = buildDictationScriptTemplate(profile.inputMode, profile.language);
  const benchmarkOnlyPackage = `Benchmark JSON context:\n${benchmarkJson}\n\nLLM prompt:\n${llmPrompt}`;

  const benchmarkFeedbackPackage = buildBenchmarkFeedbackPackage(profile, sessionFeedback, { activeSessionStatus }) as Record<string, unknown>;
  const diagnosticPackage = JSON.stringify(benchmarkFeedbackPackage, null, 2);
  const promptPackage = buildBenchmarkFeedbackPromptPackage(profile, sessionFeedback, llmPrompt, { activeSessionStatus });
  const sessionFeedbackJson = JSON.stringify(
    buildSessionFeedbackJsonPayload(profile.inputMode, profile.language, sessionFeedback, {
      activeSessionStatus,
      fallbackDiagnostics,
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
      profileKey: `${profile.inputMode}/${profile.language}`,
      sessionCount: profile.sessionCount,
      sampleCount: profile.sampleCount,
      lastUpdatedAt: profile.lastUpdatedAt ?? null,
      recommendation: profile.recommendation,
      weakAreas: profile.weakAreas,
      kpis: {
        sweetSpotScore: profile.sweetSpotScore,
        semanticFidelityScore: profile.semanticFidelityScore,
        controlFidelityScore: profile.controlFidelityScore,
        learningEffectivenessScore: profile.learningEffectivenessScore,
        flowStabilityScore: profile.flowStabilityScore,
        averageAccuracy: profile.averageAccuracy,
        averageWpm: profile.averageWpm,
        averageLagSec: profile.averageLagSec,
        preferredPlaybackRate: profile.preferredPlaybackRate,
        preferredPhraseSize: profile.preferredPhraseSize,
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
      : {
          verdict: 'n/a',
          fallbackDiagnostics,
        },
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
