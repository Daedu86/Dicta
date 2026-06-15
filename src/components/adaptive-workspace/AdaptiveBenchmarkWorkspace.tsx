import { useEffect, useState } from 'react';
import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics, InputMode } from '../../core/adaptive/types';
import { createEmptyInputLanguageBenchmark } from '../../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { SUPPORTED_LANGUAGES } from '../../core/languages';
import type { AdaptiveBenchmarksByInputLanguage, BenchmarkLanguageButton } from '../openrouter/types';
import type { AdaptiveAdapterCardConfig, AdaptiveWorkspaceFocusAnchor, RepeatWordStat } from './types';
import {
  benchmarkSubtitle,
  formatBenchmarkLanguage,
  formatScore,
  getBenchmarkHealth,
} from './adaptiveWorkspaceViewHelpers';
import { AdaptiveBenchmarkCockpit } from './AdaptiveBenchmarkCockpit';

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

function mapSessionInputMode(mode: AdaptiveAdapterCardConfig['inputMode']): InputMode {
  if (mode === 'browser-tts') return 'browser-tts';
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
            <AdaptiveBenchmarkCockpit
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
