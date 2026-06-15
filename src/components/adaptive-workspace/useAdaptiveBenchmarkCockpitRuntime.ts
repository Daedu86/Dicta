import { useEffect, useMemo, useState } from 'react';
import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics } from '../../core/adaptive/types';
import { buildBrowserTtsDeDiagnostics } from '../../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildSelectedBenchmarkExportPayload } from '../../core/adaptive/benchmarkJson';
import { buildDictationScriptPrompt, buildDictationScriptTemplate } from '../../core/adaptive/dictationScriptPrompt';
import {
  buildBenchmarkFeedbackPackage,
  buildBenchmarkFeedbackPromptPackage,
  buildSessionFeedbackJsonPayload,
  derivePlaybackDiagnosticsFromTimeline,
} from '../../core/adaptive/sessionFeedback';
import { formatBenchmarkLanguage } from './adaptiveWorkspaceViewHelpers';
import type { AdaptiveWorkspaceFocusAnchor, RepeatWordStat } from './types';

type AdaptiveBenchmarkCockpitRuntimeParams = {
  profile: InputLanguageBenchmarkMetrics;
  focusAnchor?: AdaptiveWorkspaceFocusAnchor;
  repeatWordStats: RepeatWordStat[];
  sessionFeedback: AdaptiveSessionFeedback | null;
};

export function useAdaptiveBenchmarkCockpitRuntime({
  profile,
  focusAnchor,
  repeatWordStats,
  sessionFeedback,
}: AdaptiveBenchmarkCockpitRuntimeParams) {
  const languageLabel = formatBenchmarkLanguage(profile.language);
  const recommendedRange = `${profile.recommendation.targetRateRange[0].toFixed(2)}x-${profile.recommendation.targetRateRange[1].toFixed(2)}x`;
  const debugLatest = profile.timeline[profile.timeline.length - 1] ?? null;
  const fallbackDiagnostics = derivePlaybackDiagnosticsFromTimeline(profile.timeline.slice(-60));
  const hasBenchmarkData = profile.sampleCount > 0 || profile.sessionCount > 0;
  const hasSessionFeedback = Boolean(sessionFeedback);
  const repeatWordSummary = repeatWordStats.slice(0, 20);
  const topRepeatWords = repeatWordStats.slice(0, 8);
  const maxRepeatWordTotal = Math.max(1, ...topRepeatWords.map((entry) => entry.total));
  const confidenceState = profile.recommendation.confidence >= 0.55 ? 'Reliable' : profile.recommendation.confidence >= 0.25 ? 'Learning' : 'Collecting data';
  const weakAreaSummary = profile.weakAreas.slice(0, 4);
  const browserTtsDeDiagnostics = buildBrowserTtsDeDiagnostics(profile);
  const browserTtsDePauseNote =
    browserTtsDeDiagnostics && browserTtsDeDiagnostics.pauseGapMs > 0 ? browserTtsDeDiagnostics.note : null;
  const browserTtsDeSemanticNote = browserTtsDeDiagnostics?.semanticPressureNote ?? null;
  const sequencingClean = sessionFeedback
    ? sessionFeedback.playbackIssues.repeatedPhraseCount === 0 &&
      sessionFeedback.playbackIssues.skippedPhraseCount === 0 &&
      sessionFeedback.playbackIssues.outOfOrderAdvanceCount === 0 &&
      sessionFeedback.playbackIssues.replayAdvancedPhraseCount === 0 &&
      sessionFeedback.playbackIssues.phraseIndexJumpCount === 0
    : fallbackDiagnostics.repeatedPhraseCount === 0 &&
      fallbackDiagnostics.replayCount === 0 &&
      fallbackDiagnostics.phraseIndexJumpCount === 0;
  const feedbackIssueCount = sessionFeedback
    ? sessionFeedback.playbackIssues.repeatedPhraseCount +
      sessionFeedback.playbackIssues.skippedPhraseCount +
      sessionFeedback.playbackIssues.outOfOrderAdvanceCount +
      sessionFeedback.playbackIssues.replayAdvancedPhraseCount +
      sessionFeedback.playbackIssues.phraseIndexJumpCount
    : fallbackDiagnostics.repeatedPhraseCount + fallbackDiagnostics.replayCount + fallbackDiagnostics.phraseIndexJumpCount;
  const [workspaceSubsectionsExpanded, setWorkspaceSubsectionsExpanded] = useState({
    kpis: false,
    coach: true,
    feedback: true,
    deepMetrics: false,
    timeline: false,
  });
  const [humanFeedbackEditorOpen, setHumanFeedbackEditorOpen] = useState(false);
  const [humanFeedbackDraft, setHumanFeedbackDraft] = useState('');
  const [exportStatusMessage, setExportStatusMessage] = useState('');
  const [exportPanelOpen, setExportPanelOpen] = useState(focusAnchor === 'exports');
  const shouldBuildExportPayloads = exportPanelOpen || humanFeedbackEditorOpen;

  const copyToClipboard = async (label: string, text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setExportStatusMessage(`Copied: ${label} · ${profile.inputMode}/${profile.language}`);
    } catch {
      setExportStatusMessage(`Could not copy: ${label}.`);
    }
  };

  const formatPromptSizeHint = (value: string): string => {
    const normalized = value.trim();
    if (!normalized) return 'Words: 0 · Tokens: ~0';
    const words = normalized.split(/\s+/).filter(Boolean).length;
    const chars = normalized.length;
    const estimatedTokens = Math.max(1, Math.round(chars / 4));
    return `Words: ${words} · Tokens: ~${estimatedTokens}`;
  };

  const exportPayloads = useMemo(() => {
    if (!shouldBuildExportPayloads) return null;

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
  }, [fallbackDiagnostics, humanFeedbackDraft, profile, sessionFeedback, shouldBuildExportPayloads]);

  useEffect(() => {
    if (focusAnchor === 'sessionFeedback') {
      setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, feedback: true }));
    } else if (focusAnchor === 'exports') {
      setExportPanelOpen(true);
      window.setTimeout(() => {
        document.getElementById('adaptive-export-copy-actions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }
  }, [focusAnchor]);
  return {
    languageLabel,
    recommendedRange,
    debugLatest,
    fallbackDiagnostics,
    hasBenchmarkData,
    hasSessionFeedback,
    repeatWordSummary,
    topRepeatWords,
    maxRepeatWordTotal,
    confidenceState,
    weakAreaSummary,
    browserTtsDeDiagnostics,
    browserTtsDePauseNote,
    browserTtsDeSemanticNote,
    sequencingClean,
    feedbackIssueCount,
    workspaceSubsectionsExpanded,
    setWorkspaceSubsectionsExpanded,
    humanFeedbackEditorOpen,
    setHumanFeedbackEditorOpen,
    humanFeedbackDraft,
    setHumanFeedbackDraft,
    exportStatusMessage,
    setExportStatusMessage,
    exportPanelOpen,
    setExportPanelOpen,
    copyToClipboard,
    formatPromptSizeHint,
    exportPayloads,
  };
}
