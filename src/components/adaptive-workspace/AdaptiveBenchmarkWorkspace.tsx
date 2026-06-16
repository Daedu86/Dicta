import { useEffect, useState } from 'react';
import { createEmptyInputLanguageBenchmark } from '../../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { SUPPORTED_LANGUAGES } from '../../core/languages';
import type { BenchmarkLanguageButton } from '../openrouter/types';
import {
  benchmarkSubtitle,
  formatBenchmarkLanguage,
  formatScore,
  getBenchmarkHealth,
} from './adaptiveWorkspaceViewHelpers';
import { AdaptiveBenchmarkCockpit } from './AdaptiveBenchmarkCockpit';
import { isCompactViewport, mapSessionInputMode } from './adaptiveBenchmarkWorkspaceUtils';
import type { AdaptiveBenchmarkSectionProps, AdaptiveProfileMatrixProps } from './adaptiveBenchmarkWorkspaceTypes';

export { AdaptiveAdapterCard } from './AdaptiveAdapterCard';

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
}: AdaptiveBenchmarkSectionProps) {
  const selectedAdapter = adapters.find((adapter) => mapSessionInputMode(adapter.inputMode) === selectedInputMode);
  const [benchmarkSubsectionsExpanded, setBenchmarkSubsectionsExpanded] = useState(() => ({
    selector: true,
    workspace: !isCompactViewport(),
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
}: AdaptiveProfileMatrixProps) {
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
