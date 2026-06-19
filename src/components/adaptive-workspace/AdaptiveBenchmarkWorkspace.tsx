import { useEffect, useState } from 'react';
import type { BenchmarkLanguageButton } from '../openrouter/types';
import { formatBenchmarkLanguage } from './adaptiveWorkspaceViewHelpers';
import { AdaptiveBenchmarkCockpit } from './AdaptiveBenchmarkCockpit';
import { AdaptiveProfileMatrix } from './AdaptiveProfileMatrix';
import { isCompactViewport, mapSessionInputMode } from './adaptiveBenchmarkWorkspaceUtils';
import type { AdaptiveBenchmarkSectionProps } from './adaptiveBenchmarkWorkspaceTypes';

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
  const [selectedProfileDetailsOpen, setSelectedProfileDetailsOpen] = useState(() => !isCompactViewport());

  useEffect(() => {
    if (focusAnchor === 'sessionFeedback' || focusAnchor === 'exports') {
      setSelectedProfileDetailsOpen(true);
    }
  }, [focusAnchor]);

  function openSelectedProfile(inputMode = selectedInputMode, language: BenchmarkLanguageButton = selectedLanguage): void {
    onSelect(inputMode, language);
    setSelectedProfileDetailsOpen(true);
    window.setTimeout(() => {
      document.getElementById('adaptive-selected-profile-cockpit')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  return (
    <section id={id} className="panel workspace-panel adaptive-benchmark-panel">
      <div className="adaptive-section-header">
        <div>
          <p className="dashboard-eyebrow">Browser TTS x 5 languages</p>
          <h3>Adaptive profiles</h3>
        </div>
      </div>
      {!expanded ? (
        <button
          type="button"
          className="secondary-button compact-button adaptive-profile-detail-toggle"
          onClick={onToggleExpanded}
        >
          Show adaptive profiles
        </button>
      ) : (
        <>
          <AdaptiveProfileMatrix
            adapters={adapters}
            benchmarks={benchmarks}
            selectedInputMode={selectedInputMode}
            selectedLanguage={selectedLanguage}
            onSelect={openSelectedProfile}
          />

          <div className="adaptive-section-header adaptive-selected-profile-header" id="adaptive-selected-profile">
            <div>
              <p className="dashboard-eyebrow">Selected profile</p>
              <h4>{selectedAdapter?.title ?? selectedInputMode} / {formatBenchmarkLanguage(selectedProfile.language)}</h4>
            </div>
            <button
              type="button"
              className="secondary-button compact-button adaptive-profile-detail-toggle"
              onClick={() => setSelectedProfileDetailsOpen((open) => !open)}
              aria-expanded={selectedProfileDetailsOpen}
              aria-controls="adaptive-selected-profile-cockpit"
            >
              {selectedProfileDetailsOpen ? 'Hide details' : 'Show details'}
            </button>
          </div>
          {selectedProfileDetailsOpen ? (
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
      )}
    </section>
  );
}
