import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics, InputMode } from '../../core/adaptive/types';
import { buildBrowserTtsDeDiagnostics, createEmptyInputLanguageBenchmark } from '../../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildSelectedBenchmarkExportPayload } from '../../core/adaptive/benchmarkJson';
import { buildDictationScriptPrompt, buildDictationScriptTemplate } from '../../core/adaptive/dictationScriptPrompt';
import {
  buildBenchmarkFeedbackPackage,
  buildBenchmarkFeedbackPromptPackage,
  buildSessionFeedbackJsonPayload,
  derivePlaybackDiagnosticsFromTimeline,
} from '../../core/adaptive/sessionFeedback';
import { SUPPORTED_LANGUAGES } from '../../core/languages';
import type { AdaptiveBenchmarksByInputLanguage, BenchmarkLanguageButton } from '../openrouter/types';
import type { AdaptiveAdapterCardConfig, AdaptiveWorkspaceFocusAnchor, RepeatWordStat } from './types';
const SweetSpotGauge = lazy(() =>
  import('../AdaptiveBenchmarkCharts').then((module) => ({ default: module.SweetSpotGauge })),
);
const TargetZoneChart = lazy(() =>
  import('../AdaptiveBenchmarkCharts').then((module) => ({ default: module.TargetZoneChart })),
);
const MiniTrends = lazy(() =>
  import('../AdaptiveBenchmarkCharts').then((module) => ({ default: module.MiniTrends })),
);
const RateAccuracyStrip = lazy(() =>
  import('../AdaptiveBenchmarkCharts').then((module) => ({ default: module.RateAccuracyStrip })),
);
const LagDistributionChart = lazy(() =>
  import('../AdaptiveBenchmarkCharts').then((module) => ({ default: module.LagDistributionChart })),
);

function AdaptiveChartLoadingState() {
  return <div className="dashboard-empty-wrap"><p className="dashboard-empty">Loading benchmark chart...</p></div>;
}

import {
  benchmarkSubtitle,
  formatBenchmarkLanguage,
  formatPercent,
  formatScore,
  formatSigned,
  formatWeakAreaLabel,
  getBenchmarkHealth,
  normalizeAccuracyForDisplay,
} from './adaptiveWorkspaceViewHelpers';

function Metric({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="metric" title={title} aria-label={title ? `${label}: ${value}. ${title}` : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 640px)').matches;
}

function mapSessionInputMode(_mode: AdaptiveAdapterCardConfig['inputMode']): InputMode {
  return 'browser-tts';
}
export function AdaptiveAdapterCard({
  adapter,
  active,
  selected,
  onOpen,
}: {
  adapter: AdaptiveAdapterCardConfig;
  active: boolean;
  selected: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className={`adaptive-adapter-card ${active ? 'adaptive-adapter-card-active' : ''} ${selected ? 'adaptive-adapter-card-selected' : ''}`}
      onClick={onOpen}
    >
      <div className="adaptive-adapter-card-header">
        <h4>{adapter.title}</h4>
        {active ? <span>Latest</span> : null}
      </div>
      <p>{adapter.execution}</p>
      <div className="adaptive-adapter-meta">
        <Metric label="Telemetry adapter" value={adapter.adapter} />
        <Metric label="Controls" value={adapter.controls} />
      </div>
    </button>
  );
}

export function AdaptiveBenchmarkSection({
  id,
  adapters,
  benchmarks,
  expanded,
  onToggleExpanded,
  focusAnchor,
  selectedInputMode,
  selectedLanguage,
  selectedProfile,
  repeatWordStats,
  formatSessionDate,
  onSelect,
  benchmarkExportMessage,
  sessionFeedback,
  sessionFeedbackMessage,
  onCopyBenchmark,
  onExportBenchmark,
  onCopyScriptPrompt,
  onCopyBenchmarkWithScriptPrompt,
  onCopyScriptTemplate,
  onCopySessionFeedback,
  onCopyBenchmarkFeedback,
  onCopyBenchmarkFeedbackPrompt,
  onCopyBenchmarkFeedbackPromptWithHumanFeedback,
}: {
  id?: string;
  adapters: AdaptiveAdapterCardConfig[];
  benchmarks: AdaptiveBenchmarksByInputLanguage;
  expanded: boolean;
  onToggleExpanded: () => void;
  focusAnchor?: AdaptiveWorkspaceFocusAnchor;
  selectedInputMode: InputMode;
  selectedLanguage: BenchmarkLanguageButton;
  selectedProfile: InputLanguageBenchmarkMetrics;
  repeatWordStats: RepeatWordStat[];
  formatSessionDate: (value: string) => string;
  onSelect: (inputMode: InputMode, language: BenchmarkLanguageButton) => void;
  benchmarkExportMessage: string;
  sessionFeedback: AdaptiveSessionFeedback | null;
  sessionFeedbackMessage: string;
  onCopyBenchmark: (profile: InputLanguageBenchmarkMetrics) => void;
  onExportBenchmark: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyScriptPrompt: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyBenchmarkWithScriptPrompt: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyScriptTemplate: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopySessionFeedback: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedback: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedbackPrompt: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedbackPromptWithHumanFeedback: (
    profile: InputLanguageBenchmarkMetrics,
    feedback: AdaptiveSessionFeedback | null,
    humanFeedback: string,
  ) => void;
}) {
  const selectedAdapter = adapters.find((adapter) => mapSessionInputMode(adapter.inputMode) === selectedInputMode);
  const [benchmarkSubsectionsExpanded, setBenchmarkSubsectionsExpanded] = useState(() => ({
    selector: true,
    workspace: !isMobileViewport(),
  }));

  useEffect(() => {
    if (focusAnchor === 'sessionFeedback' || focusAnchor === 'exports') {
      setBenchmarkSubsectionsExpanded((prev) => ({ ...prev, workspace: true }));
    }
  }, [focusAnchor]);

  function openSelectedProfile(inputMode = selectedInputMode, language = selectedLanguage): void {
    onSelect(inputMode, language);
    setBenchmarkSubsectionsExpanded((prev) => ({ ...prev, workspace: true }));
    window.setTimeout(() => {
      document.getElementById('adaptive-selected-profile-cockpit')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  return (
    <section id={id} className="panel workspace-panel adaptive-benchmark-panel">
      <div className="adaptive-section-header">
        <div>
          <p className="dashboard-eyebrow">Overview</p>
          <h3>Benchmarks</h3>
        </div>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse section' : 'Expand section'}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${expanded ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>
      {expanded ? (
        <>
          <div className="adaptive-section-header adaptive-subsection-header">
            <div>
              <p className="dashboard-eyebrow">1 input x 5 languages</p>
              <h4>Profile matrix</h4>
            </div>
            <button
              type="button"
              className="secondary-button adaptive-section-toggle"
              onClick={() => setBenchmarkSubsectionsExpanded((prev) => ({ ...prev, selector: !prev.selector }))}
              aria-expanded={benchmarkSubsectionsExpanded.selector}
              aria-label={benchmarkSubsectionsExpanded.selector ? 'Collapse section' : 'Expand section'}
              title={benchmarkSubsectionsExpanded.selector ? 'Collapse' : 'Expand'}
            >
              <span className={`adaptive-section-toggle-icon ${benchmarkSubsectionsExpanded.selector ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
            </button>
          </div>
          {benchmarkSubsectionsExpanded.selector ? (
            <AdaptiveProfileMatrix
              adapters={adapters}
              benchmarks={benchmarks}
              selectedInputMode={selectedInputMode}
              selectedLanguage={selectedLanguage}
              onSelect={openSelectedProfile}
            />
          ) : null}

          <div className="adaptive-section-header adaptive-subsection-header" id="adaptive-selected-profile">
            <div>
              <p className="dashboard-eyebrow">Selected profile</p>
              <h4>{selectedAdapter?.title ?? selectedInputMode} / {formatBenchmarkLanguage(selectedProfile.language)}</h4>
            </div>
            <div className="adaptive-selected-profile-actions">
              <button
                type="button"
                className="secondary-button compact-button"
                onClick={() => openSelectedProfile()}
              >
                Open cockpit
              </button>
              <button
                type="button"
                className="secondary-button adaptive-section-toggle"
                onClick={() => setBenchmarkSubsectionsExpanded((prev) => ({ ...prev, workspace: !prev.workspace }))}
                aria-expanded={benchmarkSubsectionsExpanded.workspace}
                aria-label={benchmarkSubsectionsExpanded.workspace ? 'Collapse section' : 'Expand section'}
                title={benchmarkSubsectionsExpanded.workspace ? 'Collapse' : 'Expand'}
              >
                <span className={`adaptive-section-toggle-icon ${benchmarkSubsectionsExpanded.workspace ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
              </button>
            </div>
          </div>
          {benchmarkSubsectionsExpanded.workspace ? (
            <AdaptiveBenchmarkWorkspace
              profile={selectedProfile}
              inputTitle={selectedAdapter?.title ?? selectedInputMode}
              focusAnchor={focusAnchor}
              repeatWordStats={repeatWordStats}
              formatSessionDate={formatSessionDate}
              benchmarkExportMessage={benchmarkExportMessage}
              sessionFeedback={sessionFeedback}
              sessionFeedbackMessage={sessionFeedbackMessage}
              onCopyBenchmark={onCopyBenchmark}
              onExportBenchmark={onExportBenchmark}
              onCopyScriptPrompt={onCopyScriptPrompt}
              onCopyBenchmarkWithScriptPrompt={onCopyBenchmarkWithScriptPrompt}
              onCopyScriptTemplate={onCopyScriptTemplate}
              onCopySessionFeedback={onCopySessionFeedback}
              onCopyBenchmarkFeedback={onCopyBenchmarkFeedback}
              onCopyBenchmarkFeedbackPrompt={onCopyBenchmarkFeedbackPrompt}
              onCopyBenchmarkFeedbackPromptWithHumanFeedback={onCopyBenchmarkFeedbackPromptWithHumanFeedback}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function AdaptiveProfileMatrix({
  adapters,
  benchmarks,
  selectedInputMode,
  selectedLanguage,
  onSelect,
}: {
  adapters: AdaptiveAdapterCardConfig[];
  benchmarks: AdaptiveBenchmarksByInputLanguage;
  selectedInputMode: InputMode;
  selectedLanguage: BenchmarkLanguageButton;
  onSelect: (inputMode: InputMode, language: BenchmarkLanguageButton) => void;
}) {
  const languages: BenchmarkLanguageButton[] = [...SUPPORTED_LANGUAGES];
  return (
    <div className="adaptive-profile-matrix" aria-label="Benchmark profile matrix">
      <div className="adaptive-profile-matrix-header" aria-hidden="true">
        <span>Input</span>
        {languages.map((language) => (
          <span key={language}>{language.toUpperCase()}</span>
        ))}
      </div>
      {adapters.map((adapter) => {
        const inputMode = mapSessionInputMode(adapter.inputMode);
        return (
          <div key={inputMode} className="adaptive-profile-matrix-row">
            <div className="adaptive-profile-matrix-input">
              <strong>{adapter.title.replace('Input # ', '#')}</strong>
              <span>{benchmarkSubtitle(inputMode)}</span>
            </div>
            {languages.map((language) => {
              const profile = benchmarks[inputMode]?.[language] ?? createEmptyInputLanguageBenchmark(inputMode, language);
              const selected = selectedInputMode === inputMode && selectedLanguage === language;
              const health = getBenchmarkHealth(profile);
              return (
                <button
                  key={`${inputMode}-${language}`}
                  type="button"
                  className={`adaptive-profile-cell adaptive-profile-cell-${health} ${selected ? 'adaptive-profile-cell-selected' : ''}`}
                  onClick={() => onSelect(inputMode, language)}
                  aria-pressed={selected}
                  title={`${inputMode}/${language}: ${formatScore(profile.sweetSpotScore)} sweet spot, ${formatScore(profile.recommendation.confidence)} confidence, ${profile.sampleCount} samples`}
                >
                  <span>{formatScore(profile.sweetSpotScore)}</span>
                  <strong>{profile.sampleCount}</strong>
                  <small>{formatScore(profile.recommendation.confidence)}</small>
                </button>
              );
            })}
          </div>
        );
      })}
      <div className="adaptive-profile-matrix-legend" aria-label="Matrix legend">
        <span><i className="adaptive-health-dot adaptive-health-strong" /> Strong</span>
        <span><i className="adaptive-health-dot adaptive-health-watch" /> Watch</span>
        <span><i className="adaptive-health-dot adaptive-health-empty" /> Not enough data</span>
      </div>
    </div>
  );
}

function AdaptiveBenchmarkWorkspace({
  profile,
  inputTitle,
  focusAnchor,
  repeatWordStats,
  formatSessionDate,
  benchmarkExportMessage,
  sessionFeedback,
  sessionFeedbackMessage,
  onCopyBenchmark,
  onExportBenchmark,
  onCopyScriptPrompt,
  onCopyBenchmarkWithScriptPrompt,
  onCopyScriptTemplate,
  onCopySessionFeedback,
  onCopyBenchmarkFeedback,
  onCopyBenchmarkFeedbackPrompt,
  onCopyBenchmarkFeedbackPromptWithHumanFeedback,
}: {
  profile: InputLanguageBenchmarkMetrics;
  inputTitle: string;
  focusAnchor?: AdaptiveWorkspaceFocusAnchor;
  repeatWordStats: RepeatWordStat[];
  formatSessionDate: (value: string) => string;
  benchmarkExportMessage: string;
  sessionFeedback: AdaptiveSessionFeedback | null;
  sessionFeedbackMessage: string;
  onCopyBenchmark: (profile: InputLanguageBenchmarkMetrics) => void;
  onExportBenchmark: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyScriptPrompt: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyBenchmarkWithScriptPrompt: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopyScriptTemplate: (profile: InputLanguageBenchmarkMetrics) => void;
  onCopySessionFeedback: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedback: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedbackPrompt: (profile: InputLanguageBenchmarkMetrics, feedback: AdaptiveSessionFeedback | null) => void;
  onCopyBenchmarkFeedbackPromptWithHumanFeedback: (
    profile: InputLanguageBenchmarkMetrics,
    feedback: AdaptiveSessionFeedback | null,
    humanFeedback: string,
  ) => void;
}) {
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
  return (
    <div className="adaptive-benchmark-workspace" id="adaptive-selected-profile-cockpit">
          <div className="dashboard-card-header">
            <div>
              <h3>{inputTitle} / {languageLabel}</h3>
              <p className="dashboard-meta">
                Profile key: {profile.inputMode}/{profile.language}
              </p>
            </div>
          </div>
          {benchmarkExportMessage ? (
            <p className={benchmarkExportMessage.toLowerCase().includes('could not') ? 'error' : 'success'}>{benchmarkExportMessage}</p>
          ) : null}
          {exportStatusMessage ? <p className="success">{exportStatusMessage}</p> : null}

      <section className="adaptive-benchmark-subpanel adaptive-cockpit-panel">
        <div className="adaptive-section-header adaptive-subsection-header">
          <div>
            <p className="dashboard-eyebrow">Profile Cockpit</p>
            <h4>{inputTitle} / {languageLabel}</h4>
          </div>
        </div>
        <div className="adaptive-cockpit-grid">
          <section className="adaptive-benchmark-subpanel adaptive-profile-hero-card">
            <div className="adaptive-profile-hero-top">
              <div>
                <span className={`adaptive-confidence-pill adaptive-confidence-${getBenchmarkHealth(profile)}`}>{confidenceState}</span>
                <h4>{formatScore(profile.sweetSpotScore)} sweet spot</h4>
              </div>
              <strong>{profile.sampleCount}</strong>
            </div>
            <div className="adaptive-profile-hero-metrics">
              <span><strong>{formatScore(profile.recommendation.confidence)}</strong> confidence</span>
              <span><strong>{profile.sessionCount}</strong> sessions</span>
              <span><strong>{profile.lastUpdatedAt ? formatSessionDate(profile.lastUpdatedAt) : 'n/a'}</strong> updated</span>
            </div>
          </section>

          <section className="adaptive-benchmark-subpanel adaptive-next-action-card">
            <h4>Next target</h4>
            <div className="adaptive-target-token-grid">
              <span><small>Rate</small><strong>{recommendedRange}</strong></span>
              <span><small>Phrase</small><strong>{profile.recommendation.targetPhraseSize}</strong></span>
              <span><small>Pause</small><strong>{Math.round(profile.recommendation.targetPauseMs)}ms</strong></span>
            </div>
            <div className="adaptive-weak-area-row">
              {weakAreaSummary.length === 0 ? (
                <span className="adaptive-weak-area-chip adaptive-weak-area-chip-good">stable</span>
              ) : (
                weakAreaSummary.map((area) => <span key={area} className="adaptive-weak-area-chip">{formatWeakAreaLabel(area)}</span>)
              )}
            </div>
          </section>

          <section className="adaptive-benchmark-subpanel adaptive-words-widget">
            <h4>Words to improve</h4>
            {repeatWordSummary.length === 0 ? (
              <p className="hint">No finished sessions for this input/language in the last 30 days.</p>
            ) : (
              <div className="adaptive-word-bars" aria-label="Words to improve">
                {topRepeatWords.map((entry) => (
                  <div key={entry.word} className="adaptive-word-bar">
                    <div>
                      <strong>{entry.word}</strong>
                      <small>{entry.missed} missed · {entry.typos} typos</small>
                    </div>
                    <span style={{ width: `${Math.max(10, Math.round((entry.total / maxRepeatWordTotal) * 100))}%` }} />
                    <em>{entry.total}</em>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={`adaptive-benchmark-subpanel adaptive-feedback-status-card ${sequencingClean ? 'adaptive-feedback-status-good' : 'adaptive-feedback-status-watch'}`}>
            <h4>Latest feedback</h4>
            <div className="adaptive-feedback-widget-grid">
              <span><small>Verdict</small><strong>{sessionFeedback?.verdict ?? 'n/a'}</strong></span>
              <span><small>Issues</small><strong>{feedbackIssueCount}</strong></span>
              <span><small>Improvement</small><strong>{sessionFeedback ? formatScore(sessionFeedback.improvementDelta.overallImprovementScore) : 'n/a'}</strong></span>
            </div>
          </section>

          <details
            className="adaptive-benchmark-subpanel adaptive-export-panel"
            id="adaptive-export-copy-actions"
            open={exportPanelOpen}
            onToggle={(event) => setExportPanelOpen(event.currentTarget.open)}
          >
            <summary>
              <span>
                <strong>Advanced exports</strong>
                <small>{profile.inputMode}/{profile.language}</small>
              </span>
              <em>{exportPanelOpen ? 'Hide exports' : 'Show exports'}</em>
            </summary>
            {exportPanelOpen && exportPayloads ? (
              <>
            <div className="adaptive-export-groups">
              <div>
                <p className="dashboard-eyebrow">Benchmark JSON</p>
                <div className="admin-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onCopyBenchmark(profile)}
                    title={`Copy the selected benchmark profile JSON to your clipboard (KPIs, recommendation, weak areas, and recent timeline points).\n${formatPromptSizeHint(exportPayloads.benchmarkJson)}`}
                  >
                    Copy Benchmark JSON
                  </button>
                  <button
                    type="button"
                    className="secondary-button compact-button"
                    onClick={() => void copyToClipboard('Benchmark JSON (compact)', exportPayloads.compactBenchmark)}
                    title={`Compact version: benchmark summary only (no timeline / large arrays).\n${formatPromptSizeHint(exportPayloads.compactBenchmark)}`}
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onExportBenchmark(profile)}
                    title={`Download the selected benchmark profile JSON as a .json file (same content as Copy Benchmark JSON).\n${formatPromptSizeHint(exportPayloads.benchmarkJson)}`}
                  >
                    Export Benchmark JSON
                  </button>
                  <button
                    type="button"
                    className="secondary-button compact-button"
                    onClick={() => void copyToClipboard('Benchmark JSON (compact)', exportPayloads.compactBenchmark)}
                    title={`Compact version: copies benchmark summary JSON (clipboard).\n${formatPromptSizeHint(exportPayloads.compactBenchmark)}`}
                  >
                    Export
                  </button>
                </div>
              </div>
              <div>
                <p className="dashboard-eyebrow">Primary</p>
                <div className="admin-actions">
                  <button
                    type="button"
                    className="secondary-button adaptive-recommended-action"
                    onClick={() => {
                      onCopyBenchmarkFeedbackPrompt(profile, sessionFeedback);
                      setExportStatusMessage(`Copied: Next adaptive script prompt · ${profile.inputMode}/${profile.language}`);
                    }}
                    disabled={!hasBenchmarkData || !hasSessionFeedback}
                    title={`Copy a ready-to-use prompt package for the next adaptive script (includes benchmark + latest session feedback). This does not generate a session.\n${formatPromptSizeHint(exportPayloads.promptPackage)}`}
                  >
                    Copy next adaptive script prompt
                  </button>
                  <button
                    type="button"
                    className="secondary-button compact-button adaptive-recommended-action"
                    onClick={() => {
                      void copyToClipboard('Next adaptive script prompt (compact)', exportPayloads.compactPromptPackage);
                    }}
                    disabled={!hasBenchmarkData || !hasSessionFeedback}
                    title={`Compact version: JSON package (benchmark summary + feedback summary + base prompt). This does not generate a session.\n${formatPromptSizeHint(exportPayloads.compactPromptPackage)}`}
                  >
                    Copy prompt
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setHumanFeedbackEditorOpen(true)}
                    disabled={!hasBenchmarkData || !hasSessionFeedback}
                    title={`Add your notes, then copy a prompt package for generating the next script (includes your notes).\n${formatPromptSizeHint(exportPayloads.humanNotesPackage)}`}
                  >
                    Copy prompt with my notes
                  </button>
                  <button
                    type="button"
                    className="secondary-button compact-button"
                    onClick={() => setHumanFeedbackEditorOpen(true)}
                    disabled={!hasBenchmarkData || !hasSessionFeedback}
                    title={`Compact version: open notes editor.\n${formatPromptSizeHint(exportPayloads.humanNotesPackage)}`}
                  >
                    Notes prompt
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      onCopyBenchmarkWithScriptPrompt(profile);
                      setExportStatusMessage(`Copied: Benchmark-only script prompt · ${profile.inputMode}/${profile.language}`);
                    }}
                    disabled={!hasBenchmarkData}
                    title={`Copy a prompt package that uses only benchmark data (no latest session feedback required). This does not generate a session.\n${formatPromptSizeHint(exportPayloads.benchmarkOnlyPackage)}`}
                  >
                    Copy benchmark-only prompt
                  </button>
                  <button
                    type="button"
                    className="secondary-button compact-button"
                    onClick={() => {
                      void copyToClipboard('Benchmark-only prompt context (compact)', exportPayloads.compactBenchmark);
                    }}
                    disabled={!hasBenchmarkData}
                    title={`Compact version: copies benchmark summary only.\n${formatPromptSizeHint(exportPayloads.compactBenchmark)}`}
                  >
                    Copy benchmark
                  </button>
                </div>
                {!hasBenchmarkData ? <p className="hint">No benchmark available for this profile yet.</p> : null}
                {!hasSessionFeedback ? <p className="hint">No completed session feedback for this profile yet.</p> : null}
              </div>
              <div>
                <p className="dashboard-eyebrow">Diagnostics</p>
                <div className="admin-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      onCopyBenchmarkFeedback(profile, sessionFeedback);
                      setExportStatusMessage(`Copied: Full diagnostic package · ${profile.inputMode}/${profile.language}`);
                    }}
                    disabled={!hasBenchmarkData}
                    title={`Copy a full diagnostic package (benchmark + session feedback when available) for debugging playback/quality issues.\n${formatPromptSizeHint(exportPayloads.diagnosticPackage)}`}
                  >
                    Copy full diagnostic package
                  </button>
                  <button
                    type="button"
                    className="secondary-button compact-button"
                    onClick={() => {
                      void copyToClipboard('Diagnostics (compact)', exportPayloads.compactSessionFeedback);
                    }}
                    disabled={!hasBenchmarkData}
                    title={`Compact version: feedback summary JSON (no large phrase previews).\n${formatPromptSizeHint(exportPayloads.compactSessionFeedback)}`}
                  >
                    Diagnostics
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      onCopySessionFeedback(profile, sessionFeedback);
                      setExportStatusMessage(`Copied: Latest session feedback · ${profile.inputMode}/${profile.language}`);
                    }}
                    disabled={!hasSessionFeedback}
                    title={`Copy the latest session feedback JSON to your clipboard (verdict, deltas, and playback issues).\n${formatPromptSizeHint(exportPayloads.sessionFeedbackJson)}`}
                  >
                    Copy latest session feedback
                  </button>
                  <button
                    type="button"
                    className="secondary-button compact-button"
                    onClick={() => {
                      void copyToClipboard('Session feedback (compact)', exportPayloads.compactSessionFeedback);
                    }}
                    disabled={!hasSessionFeedback}
                    title={`Compact version: feedback summary JSON.\n${formatPromptSizeHint(exportPayloads.compactSessionFeedback)}`}
                  >
                    Feedback
                  </button>
                </div>
              </div>
              <div>
                <p className="dashboard-eyebrow">Templates</p>
                <div className="admin-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      onCopyScriptPrompt(profile);
                      setExportStatusMessage(`Copied: Base prompt · ${profile.inputMode}/${profile.language}`);
                    }}
                    title={`Copy the base prompt template (no benchmark/session feedback).\n${formatPromptSizeHint(exportPayloads.llmPrompt)}`}
                  >
                    Copy base prompt
                  </button>
                  <button
                    type="button"
                    className="secondary-button compact-button"
                    onClick={() => {
                      void copyToClipboard('Base prompt', exportPayloads.llmPrompt);
                    }}
                    title={`Compact version: same content (already minimal).\n${formatPromptSizeHint(exportPayloads.llmPrompt)}`}
                  >
                    Prompt
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      onCopyScriptTemplate(profile);
                      setExportStatusMessage(`Copied: Output template · ${profile.inputMode}/${profile.language}`);
                    }}
                    title={`Copy the output JSON template expected for generated scripts.\n${formatPromptSizeHint(exportPayloads.outputTemplate)}`}
                  >
                    Copy output template
                  </button>
                  <button
                    type="button"
                    className="secondary-button compact-button"
                    onClick={() => {
                      void copyToClipboard('Output template', exportPayloads.outputTemplate);
                    }}
                    title={`Compact version: same content (already minimal).\n${formatPromptSizeHint(exportPayloads.outputTemplate)}`}
                  >
                    Template
                  </button>
                </div>
              </div>
            </div>
            {humanFeedbackEditorOpen ? (
              <div id="adaptive-human-feedback" className="adaptive-human-feedback-editor">
                <textarea
                  value={humanFeedbackDraft}
                  onChange={(e) => setHumanFeedbackDraft(e.target.value)}
                  placeholder="Add human feedback for the next script (topics, required words, style, constraints)..."
                  rows={4}
                />
                <div className="adaptive-human-feedback-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setHumanFeedbackEditorOpen(false);
                      setHumanFeedbackDraft('');
                    }}
                    title="Close without copying anything."
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCopyBenchmarkFeedbackPromptWithHumanFeedback(profile, sessionFeedback, humanFeedbackDraft);
                      setExportStatusMessage(`Copied: Script prompt with my notes · ${profile.inputMode}/${profile.language} · human notes included`);
                      setHumanFeedbackEditorOpen(false);
                      setHumanFeedbackDraft('');
                    }}
                    disabled={humanFeedbackDraft.trim().length === 0 || !hasBenchmarkData || !hasSessionFeedback}
                    title={`Copy the prompt package including your notes (requires benchmark data + latest session feedback).\n${formatPromptSizeHint(exportPayloads.humanNotesPackage)}`}
                  >
                    Submit
                  </button>
                </div>
              </div>
            ) : null}
              </>
            ) : null}
          </details>
        </div>
      </section>

      <div className="adaptive-section-header adaptive-subsection-header">
        <div>
          <p className="dashboard-eyebrow">Benchmarks</p>
          <h4>Aggregate benchmark metrics</h4>
        </div>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={() => setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, kpis: !prev.kpis }))}
          aria-expanded={workspaceSubsectionsExpanded.kpis}
          aria-label={workspaceSubsectionsExpanded.kpis ? 'Collapse section' : 'Expand section'}
          title={workspaceSubsectionsExpanded.kpis ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${workspaceSubsectionsExpanded.kpis ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>
      {workspaceSubsectionsExpanded.kpis ? (
        <div className="today-summary-grid">
          <Metric label="Sweet Spot Score" value={formatScore(profile.sweetSpotScore)} />
          <Metric label="Semantic Fidelity" value={formatScore(profile.semanticFidelityScore)} />
          <Metric label="Control Fidelity" value={formatScore(profile.controlFidelityScore)} />
          <Metric label="Learning Effectiveness" value={formatScore(profile.learningEffectivenessScore)} />
          <Metric label="Flow Stability" value={formatScore(profile.flowStabilityScore)} />
          <Metric label="Avg accuracy" value={`${formatPercent(profile.averageAccuracy)}`} />
          <Metric label="Avg WPM" value={profile.averageWpm.toFixed(1)} />
          <Metric label="Avg lag" value={`${profile.averageLagSec.toFixed(2)}s`} />
          <Metric label="Preferred rate" value={`${profile.preferredPlaybackRate.toFixed(2)}x`} />
          <Metric label="Preferred phrase" value={profile.preferredPhraseSize} />
        </div>
      ) : null}

      <div className="adaptive-section-header adaptive-subsection-header">
        <div>
          <p className="dashboard-eyebrow">Next Training Targets</p>
          <h4>Target zone and trends</h4>
        </div>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={() => setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, coach: !prev.coach }))}
          aria-expanded={workspaceSubsectionsExpanded.coach}
          aria-label={workspaceSubsectionsExpanded.coach ? 'Collapse section' : 'Expand section'}
          title={workspaceSubsectionsExpanded.coach ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${workspaceSubsectionsExpanded.coach ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>
      {workspaceSubsectionsExpanded.coach ? (
        <Suspense fallback={<AdaptiveChartLoadingState />}>
          <div className="adaptive-coach-grid" aria-label="Benchmark coach charts">
          <section className="dashboard-card adaptive-coach-card adaptive-coach-card-gauge">
            <SweetSpotGauge score={profile.sweetSpotScore} />
            <div className="adaptive-coach-card-meta">
              <div>
                <span>Target rate</span>
                <strong>
                  {profile.recommendation.targetRateRange[0].toFixed(2)}x-{profile.recommendation.targetRateRange[1].toFixed(2)}x
                </strong>
              </div>
              <div>
                <span>Target phrase</span>
                <strong>{profile.recommendation.targetPhraseSize}</strong>
              </div>
              <div>
                <span>Target pause</span>
                <strong>{Math.round(profile.recommendation.targetPauseMs)}ms</strong>
              </div>
            </div>
          </section>
          <section className="dashboard-card adaptive-coach-card adaptive-coach-card-zone">
            <TargetZoneChart profile={profile} />
          </section>
          <section className="dashboard-card adaptive-coach-card adaptive-coach-card-trends">
            <MiniTrends profile={profile} />
          </section>
          <section className="dashboard-card adaptive-coach-card adaptive-coach-card-rate">
            <RateAccuracyStrip profile={profile} />
          </section>
          <section className="dashboard-card adaptive-coach-card adaptive-coach-card-lag">
            <LagDistributionChart profile={profile} />
          </section>
        </div>
        </Suspense>
      ) : null}

      <div className="adaptive-section-header adaptive-subsection-header">
        <div>
          <p className="dashboard-eyebrow">Latest Session</p>
          <h4>Playback issues and improvement deltas</h4>
        </div>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={() => setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, feedback: !prev.feedback }))}
          aria-expanded={workspaceSubsectionsExpanded.feedback}
          aria-label={workspaceSubsectionsExpanded.feedback ? 'Collapse section' : 'Expand section'}
          title={workspaceSubsectionsExpanded.feedback ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${workspaceSubsectionsExpanded.feedback ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>
      {workspaceSubsectionsExpanded.feedback ? (
      <section className="adaptive-benchmark-subpanel adaptive-session-feedback-panel">
        <div id="adaptive-session-feedback" />
        <div className="dashboard-card-header">
          <div>
            <h4>Session Feedback</h4>
            <p className="dashboard-meta">Use Training Cockpit Export / Copy Actions for session-feedback exports and prompt packages.</p>
          </div>
        </div>
        {sessionFeedbackMessage ? (
          <p className={sessionFeedbackMessage.toLowerCase().includes('could not') ? 'error' : 'success'}>{sessionFeedbackMessage}</p>
        ) : null}
        {sessionFeedback ? (
          <>
            <div className="today-summary-grid">
              <Metric label="Verdict" value={sessionFeedback.verdict} />
              <Metric label="Improvement" value={formatScore(sessionFeedback.improvementDelta.overallImprovementScore)} />
              <Metric label="Accuracy delta" value={formatSigned(sessionFeedback.improvementDelta.accuracyDelta)} />
              <Metric label="Lag delta" value={`${formatSigned(sessionFeedback.improvementDelta.lagDelta)}s`} />
              <Metric label="WPM delta" value={formatSigned(sessionFeedback.improvementDelta.wpmDelta)} />
              <Metric label="Sweet spot delta" value={formatSigned(sessionFeedback.improvementDelta.sweetSpotScoreDelta)} />
              <Metric label="Semantic delta" value={formatSigned(sessionFeedback.improvementDelta.semanticFidelityDelta)} />
              <Metric label="Control delta" value={formatSigned(sessionFeedback.improvementDelta.controlFidelityDelta)} />
              <Metric label="Learning delta" value={formatSigned(sessionFeedback.improvementDelta.learningEffectivenessDelta)} />
              <Metric label="Flow delta" value={formatSigned(sessionFeedback.improvementDelta.flowStabilityDelta)} />
            </div>
            <div className="adaptive-benchmark-grid">
              <section className="adaptive-benchmark-subpanel">
                <h4>Playback Issues</h4>
                <div className="today-summary-grid">
                  <Metric label="Repeated phrases" value={String(sessionFeedback.playbackIssues.repeatedPhraseCount)} />
                  <Metric label="Max repeat" value={String(sessionFeedback.playbackIssues.maxRepeatCountForSinglePhrase)} />
                  <Metric label="Skipped phrases" value={String(sessionFeedback.playbackIssues.skippedPhraseCount)} />
                  <Metric label="Out-of-order" value={String(sessionFeedback.playbackIssues.outOfOrderAdvanceCount)} />
                  <Metric label="Replay advanced" value={String(sessionFeedback.playbackIssues.replayAdvancedPhraseCount)} />
                  <Metric label="Index jumps" value={String(sessionFeedback.playbackIssues.phraseIndexJumpCount)} />
                </div>
                {sessionFeedback.playbackIssues.repeatedPhrases.length > 0 ? (
                  <div className="script-phrase-preview">
                    {sessionFeedback.playbackIssues.repeatedPhrases.slice(0, 5).map((phrase) => (
                      <p key={phrase.phraseId} className="hint">
                        {phrase.phraseId}: repeated {phrase.repeatCount} time(s) · {phrase.textPreview}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="hint">No repeated phrases detected.</p>
                )}
              </section>
              <section className="adaptive-benchmark-subpanel">
                <h4>Phrase Stats</h4>
                <div className="today-summary-grid">
                  <Metric label="Total phrases" value={String(sessionFeedback.phraseStats.totalPhrases)} />
                  <Metric label="Completed" value={String(sessionFeedback.phraseStats.completedPhrases)} />
                  <Metric label="Replays" value={String(sessionFeedback.phraseStats.replayCount)} />
                  <Metric label="Advances" value={String(sessionFeedback.phraseStats.phraseAdvanceCount)} />
                  <Metric label="Avg repeats" value={sessionFeedback.phraseStats.averageRepeatsPerPhrase.toFixed(2)} />
                </div>
                {sessionFeedback.notes.map((note) => (
                  <p key={note} className="hint">{note}</p>
                ))}
              </section>
            </div>
          </>
        ) : (
          <div className="adaptive-benchmark-subpanel">
            <p className="hint">No completed session feedback for this input/language yet. Timeline fallback diagnostics are shown when available.</p>
            <div className="today-summary-grid">
              <Metric label="Fallback source" value={fallbackDiagnostics.source} />
              <Metric label="Replay events" value={String(fallbackDiagnostics.replayCount)} />
              <Metric label="Repeated phrases" value={String(fallbackDiagnostics.repeatedPhraseCount)} />
              <Metric label="Max repeat" value={String(fallbackDiagnostics.maxRepeatCountForSinglePhrase)} />
              <Metric label="Deferred pauses" value={String(fallbackDiagnostics.deferPauseCount)} />
              <Metric label="Index jumps" value={String(fallbackDiagnostics.phraseIndexJumpCount)} />
            </div>
            {fallbackDiagnostics.repeatedPhrasePreviews.length > 0 ? (
              <div className="script-phrase-preview">
                {fallbackDiagnostics.repeatedPhrasePreviews.slice(0, 5).map((preview) => (
                  <p key={preview} className="hint">{preview}</p>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>
      ) : null}

      <div className="adaptive-section-header adaptive-subsection-header">
        <div>
          <p className="dashboard-eyebrow">Diagnostics</p>
          <h4>Semantic + recovery + recommendation</h4>
        </div>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={() => setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, deepMetrics: !prev.deepMetrics }))}
          aria-expanded={workspaceSubsectionsExpanded.deepMetrics}
          aria-label={workspaceSubsectionsExpanded.deepMetrics ? 'Collapse section' : 'Expand section'}
          title={workspaceSubsectionsExpanded.deepMetrics ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${workspaceSubsectionsExpanded.deepMetrics ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>
      {workspaceSubsectionsExpanded.deepMetrics ? (
        <div className="adaptive-benchmark-grid">
          <section className="adaptive-benchmark-subpanel">
            <h4>Rate vs accuracy</h4>
            {profile.rateAccuracyBuckets.length === 0 ? (
              <p className="hint">No rate buckets collected yet.</p>
            ) : (
              <div className="adaptive-rate-bars">
                {profile.rateAccuracyBuckets.map((bucket) => (
                  <div key={bucket.rate} className="adaptive-rate-bar">
                    <span>{bucket.rate.toFixed(2)}x</span>
                    <div className="today-chart-track">
                      <div className="today-chart-fill" style={{ width: `${Math.round(normalizeAccuracyForDisplay(bucket.averageAccuracy) * 100)}%` }} />
                    </div>
                    <small>{formatPercent(bucket.averageAccuracy)} · lag {bucket.averageLagSec.toFixed(1)}s</small>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="adaptive-benchmark-subpanel">
            <h4>Semantic quality</h4>
            <div className="today-summary-grid">
              <Metric label="Cut penalty" value={profile.semanticCutPenalty.toFixed(2)} />
              <Metric label="Unsafe pauses" value={String(profile.unsafePauseCount)} />
              <Metric label="Safe pauses" value={String(profile.safePauseCount)} />
              <Metric label="Deferred pauses" value={String(profile.deferredPauseCount)} />
              <Metric label="Replay denied" value={String(profile.replayDeniedByBoundaryCount)} />
              <Metric label="Completeness" value={profile.averageSemanticCompleteness.toFixed(2)} />
              <Metric label="Difficulty" value={profile.averagePhraseDifficulty.toFixed(2)} />
            </div>
          </section>

          <section className="adaptive-benchmark-subpanel">
            <h4>Adaptation and recovery</h4>
            <div className="today-summary-grid">
              <Metric label="Recovery" value={formatScore(profile.recoveryScore)} />
              <Metric label="Recovery time" value={profile.timeToRecoveryMs === null ? 'n/a' : `${Math.round(profile.timeToRecoveryMs / 1000)}s`} />
              <Metric label="Error burst" value={String(profile.errorBurstLength)} />
              <Metric label="Mode switches" value={profile.modeSwitchFrequency.toFixed(2)} />
              <Metric label="Rate variance" value={profile.rateVariance.toFixed(3)} />
              <Metric label="Pause variance" value={profile.pauseVariance.toFixed(0)} />
            </div>
          </section>

          <section className="adaptive-benchmark-subpanel">
            <h4>Recommendation</h4>
            <div className="today-summary-grid">
              <Metric label="Target rate" value={recommendedRange} />
              <Metric label="Phrase size" value={profile.recommendation.targetPhraseSize} />
              <Metric label="Pause" value={`${profile.recommendation.targetPauseMs}ms`} />
              <Metric label="Confidence" value={formatScore(profile.recommendation.confidence)} />
            </div>
            <p className="dashboard-meta">{profile.recommendation.summary}</p>
            {browserTtsDePauseNote ? <p className="hint">{browserTtsDePauseNote}</p> : null}
            {browserTtsDeSemanticNote ? <p className="hint">{browserTtsDeSemanticNote}</p> : null}
            <p className="hint">Focus: {profile.recommendation.nextTrainingFocus.join(', ')}</p>
            <p className="hint">Weak areas: {profile.weakAreas.length > 0 ? profile.weakAreas.join(', ') : 'none detected'}</p>
          </section>
        </div>
      ) : null}

      <div className="adaptive-section-header adaptive-subsection-header">
        <div>
          <p className="dashboard-eyebrow">Diagnostics</p>
          <h4>Recent decisions</h4>
        </div>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={() => setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, timeline: !prev.timeline }))}
          aria-expanded={workspaceSubsectionsExpanded.timeline}
          aria-label={workspaceSubsectionsExpanded.timeline ? 'Collapse section' : 'Expand section'}
          title={workspaceSubsectionsExpanded.timeline ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${workspaceSubsectionsExpanded.timeline ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>

      {workspaceSubsectionsExpanded.timeline ? (
        <div className="adaptive-benchmark-grid">
          <section className="adaptive-benchmark-subpanel adaptive-benchmark-timeline">
            <h4>Timeline and debug</h4>
            <div className="today-summary-grid">
              <Metric label="Sessions" value={String(profile.sessionCount)} />
              <Metric label="Samples" value={String(profile.sampleCount)} />
              <Metric label="Window" value={`${profile.rollingWindowDays} days`} />
              <Metric label="Last update" value={profile.lastUpdatedAt ? formatSessionDate(profile.lastUpdatedAt) : 'n/a'} />
              <Metric label="Phrase index" value={debugLatest?.phraseIndex !== undefined ? `${debugLatest.phraseIndex}/${debugLatest.totalSemanticPhrases ?? 'n/a'}` : 'n/a'} />
              <Metric label="Pacing mode" value={debugLatest?.mode ?? 'n/a'} />
              <Metric label="Decision" value={debugLatest?.decisionReason ?? 'n/a'} />
              <Metric label="Hint" value={debugLatest?.executionHint ?? 'n/a'} />
            </div>
            <div className="adaptive-timeline-row">
              {profile.timeline.slice(-60).map((point, index) => (
                <span
                  key={`${point.timestampMs}-${index}`}
                  className={`adaptive-timeline-dot adaptive-timeline-dot-${point.event ?? point.mode}`}
                  title={`${point.event ?? point.mode} · ${point.playbackRate.toFixed(2)}x · ${formatPercent(point.accuracy)}`}
                />
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}


