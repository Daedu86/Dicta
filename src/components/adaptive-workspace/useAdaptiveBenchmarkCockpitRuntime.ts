import { useEffect, useMemo, useState } from 'react';
import { buildBrowserTtsDeDiagnostics } from '../../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { derivePlaybackDiagnosticsFromTimeline } from '../../core/adaptive/sessionFeedback';
import { formatBenchmarkLanguage } from './adaptiveWorkspaceViewHelpers';
import {
  buildAdaptiveBenchmarkCockpitExportPayloads,
  formatPromptSizeHint,
} from './adaptiveBenchmarkCockpitExportPayloads';
import type { AdaptiveBenchmarkCockpitRuntimeParams } from './useAdaptiveBenchmarkCockpitRuntimeTypes';

export type { AdaptiveBenchmarkCockpitRuntimeParams } from './useAdaptiveBenchmarkCockpitRuntimeTypes';

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
    coach: false,
    feedback: false,
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

  const exportPayloads = useMemo(() => {
    if (!shouldBuildExportPayloads) return null;
    return buildAdaptiveBenchmarkCockpitExportPayloads({
      profile,
      sessionFeedback,
      fallbackDiagnostics,
      humanFeedbackDraft,
    });
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
