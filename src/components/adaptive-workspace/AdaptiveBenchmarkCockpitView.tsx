import { AdaptiveBenchmarkCoachSection } from './AdaptiveBenchmarkCoachSection';
import { AdaptiveBenchmarkDiagnosticsSection } from './AdaptiveBenchmarkDiagnosticsSection';
import { AdaptiveBenchmarkExportPanel } from './AdaptiveBenchmarkExportPanel';
import { AdaptiveBenchmarkFeedbackSection } from './AdaptiveBenchmarkFeedbackSection';
import { AdaptiveBenchmarkKpiSection } from './AdaptiveBenchmarkKpiSection';
import { AdaptiveBenchmarkProfileCockpit } from './AdaptiveBenchmarkProfileCockpit';
import { AdaptiveBenchmarkTimelineSection } from './AdaptiveBenchmarkTimelineSection';
import type { AdaptiveBenchmarkCockpitProps } from './AdaptiveBenchmarkCockpitTypes';
import { useAdaptiveBenchmarkCockpitRuntime } from './useAdaptiveBenchmarkCockpitRuntime';

export function AdaptiveBenchmarkCockpit({
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
}: AdaptiveBenchmarkCockpitProps) {
  const runtime = useAdaptiveBenchmarkCockpitRuntime({
    profile,
    focusAnchor,
    repeatWordStats,
    sessionFeedback,
  });

  const actions = {
    onCopyBenchmark,
    onExportBenchmark,
    onCopyScriptPrompt,
    onCopyBenchmarkWithScriptPrompt,
    onCopyScriptTemplate,
    onCopySessionFeedback,
    onCopyBenchmarkFeedback,
    onCopyBenchmarkFeedbackPrompt,
    onCopyBenchmarkFeedbackPromptWithHumanFeedback,
  };

  const exportPanel = (
    <AdaptiveBenchmarkExportPanel
      profile={profile}
      sessionFeedback={sessionFeedback}
      exportPanelOpen={runtime.exportPanelOpen}
      setExportPanelOpen={runtime.setExportPanelOpen}
      exportPayloads={runtime.exportPayloads}
      hasBenchmarkData={runtime.hasBenchmarkData}
      hasSessionFeedback={runtime.hasSessionFeedback}
      humanFeedbackEditorOpen={runtime.humanFeedbackEditorOpen}
      setHumanFeedbackEditorOpen={runtime.setHumanFeedbackEditorOpen}
      humanFeedbackDraft={runtime.humanFeedbackDraft}
      setHumanFeedbackDraft={runtime.setHumanFeedbackDraft}
      setExportStatusMessage={runtime.setExportStatusMessage}
      copyToClipboard={runtime.copyToClipboard}
      formatPromptSizeHint={runtime.formatPromptSizeHint}
      onCopyBenchmark={actions.onCopyBenchmark}
      onExportBenchmark={actions.onExportBenchmark}
      onCopyScriptPrompt={actions.onCopyScriptPrompt}
      onCopyBenchmarkWithScriptPrompt={actions.onCopyBenchmarkWithScriptPrompt}
      onCopyScriptTemplate={actions.onCopyScriptTemplate}
      onCopySessionFeedback={actions.onCopySessionFeedback}
      onCopyBenchmarkFeedback={actions.onCopyBenchmarkFeedback}
      onCopyBenchmarkFeedbackPrompt={actions.onCopyBenchmarkFeedbackPrompt}
      onCopyBenchmarkFeedbackPromptWithHumanFeedback={actions.onCopyBenchmarkFeedbackPromptWithHumanFeedback}
    />
  );

  return (
    <div className="adaptive-benchmark-workspace" id="adaptive-selected-profile-cockpit">
      <div className="dashboard-card-header">
        <div>
          <h3>{inputTitle} / {runtime.languageLabel}</h3>
          <p className="dashboard-meta">
            Profile key: {profile.inputMode}/{profile.language}
          </p>
        </div>
      </div>
      {benchmarkExportMessage ? (
        <p className={benchmarkExportMessage.toLowerCase().includes('could not') ? 'error' : 'success'}>{benchmarkExportMessage}</p>
      ) : null}
      {runtime.exportStatusMessage ? <p className="success">{runtime.exportStatusMessage}</p> : null}

      <AdaptiveBenchmarkProfileCockpit
        profile={profile}
        inputTitle={inputTitle}
        languageLabel={runtime.languageLabel}
        recommendedRange={runtime.recommendedRange}
        confidenceState={runtime.confidenceState}
        weakAreaSummary={runtime.weakAreaSummary}
        repeatWordSummary={runtime.repeatWordSummary}
        topRepeatWords={runtime.topRepeatWords}
        maxRepeatWordTotal={runtime.maxRepeatWordTotal}
        sequencingClean={runtime.sequencingClean}
        feedbackIssueCount={runtime.feedbackIssueCount}
        sessionFeedback={sessionFeedback}
        formatSessionDate={formatSessionDate}
        exportPanel={exportPanel}
      />

      <AdaptiveBenchmarkKpiSection profile={profile} runtime={runtime} />
      <AdaptiveBenchmarkCoachSection profile={profile} runtime={runtime} />
      {/* adaptive-session-feedback-panel */}
      <AdaptiveBenchmarkFeedbackSection
        sessionFeedback={sessionFeedback}
        sessionFeedbackMessage={sessionFeedbackMessage}
        fallbackDiagnostics={runtime.fallbackDiagnostics}
        runtime={runtime}
      />
      <AdaptiveBenchmarkDiagnosticsSection
        profile={profile}
        recommendedRange={runtime.recommendedRange}
        browserTtsDePauseNote={runtime.browserTtsDePauseNote}
        browserTtsDeSemanticNote={runtime.browserTtsDeSemanticNote}
        runtime={runtime}
      />
      {/* adaptive-benchmark-timeline */}
      <AdaptiveBenchmarkTimelineSection
        profile={profile}
        debugLatest={runtime.debugLatest}
        formatSessionDate={formatSessionDate}
        runtime={runtime}
      />
    </div>
  );
}
