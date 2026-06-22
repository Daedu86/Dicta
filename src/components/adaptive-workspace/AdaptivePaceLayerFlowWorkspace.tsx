import { useState } from 'react';

const ADAPTIVE_FLOW_LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Spanish' },
  { code: 'de', label: 'DE', name: 'German' },
  { code: 'fr', label: 'FR', name: 'French' },
  { code: 'pt', label: 'PT', name: 'Portuguese' },
] as const;

type AdaptiveFlowLanguage = typeof ADAPTIVE_FLOW_LANGUAGES[number];
type AdaptiveFlowLanguageCode = AdaptiveFlowLanguage['code'];

type AdaptiveFlowKpi = {
  label: string;
  value: string | ((language: AdaptiveFlowLanguage) => string);
};

type AdaptiveFlowRepositoryOwner = {
  label: string;
  path: string;
};

type AdaptiveFlowPhase = {
  id: string;
  step: string;
  title: string;
  description: string;
  workspaceSummary: string;
  kpis: readonly AdaptiveFlowKpi[];
  repositoryOwners: readonly AdaptiveFlowRepositoryOwner[];
  signals: readonly string[];
};

const ADAPTIVE_FLOW_PHASES: readonly AdaptiveFlowPhase[] = [
  {
    id: 'generation',
    step: 'Step 1',
    title: 'Generation',
    description: 'Generate the practice material with language, difficulty, duration target, and session goal.',
    workspaceSummary: 'Creates and validates the structured DictationScript package before Browser TTS playback owns the runtime.',
    kpis: [
      { label: 'Profile', value: (language) => `browser-tts/${language.code}` },
      { label: 'Intent', value: 'Precision / Stabilize / Challenge' },
      { label: 'Target', value: (language) => `${language.name} script package` },
    ],
    repositoryOwners: [
      { label: 'generation runtime', path: 'src/app/useOpenRouterGenerationRuntime.ts' },
      { label: 'direct generation runtime', path: 'src/app/useOpenRouterDirectGenerationRuntime.ts' },
      { label: 'prompt package', path: 'src/core/adaptive/openRouterGenerationPrompt.ts' },
      { label: 'script validation', path: 'src/core/adaptive/dictationScriptValidation.ts' },
    ],
    signals: ['language + intent', 'duration target', 'structured DictationScript', 'OpenRouter job state'],
  },
  {
    id: 'planner',
    step: 'Step 2',
    title: 'Planner',
    description: 'Plan target pace, phrase size, pauses, replay rules, and recovery thresholds.',
    workspaceSummary: 'Converts profile evidence and user intent into the next listening prescription and playback plan.',
    kpis: [
      { label: 'Rate', value: 'target playback rate' },
      { label: 'Pause', value: 'pause ms target' },
      { label: 'Replay', value: 'safe replay support' },
    ],
    repositoryOwners: [
      { label: 'pedagogical policy', path: 'src/core/adaptive/ListeningTrainerPolicy.ts' },
      { label: 'policy layers', path: 'src/core/adaptive/adaptivePolicyLayers.ts' },
      { label: 'playback plan', path: 'src/app/browserTtsPlaybackPlan.ts' },
    ],
    signals: ['runtime policy', 'learning policy', 'playback rate target', 'pause target', 'replay support'],
  },
  {
    id: 'chunker',
    step: 'Step 3',
    title: 'Chunker',
    description: 'Split the script into teachable chunks with sentence boundaries and punctuation preserved.',
    workspaceSummary: 'Builds semantic phrase boundaries so each spoken chunk stays teachable and measurable.',
    kpis: [
      { label: 'Phrase', value: 'words per chunk' },
      { label: 'Boundary', value: 'strictness score' },
      { label: 'Semantics', value: 'completeness score' },
    ],
    repositoryOwners: [
      { label: 'semantic planner', path: 'src/core/adaptive/SemanticPhrasePlanner.ts' },
      { label: 'dynamic chunk planner', path: 'src/inputs/browserTts/ttsDynamicChunkPlanner.ts' },
      { label: 'chunk selection', path: 'src/app/browserTtsPlaybackPlanChunkSelection.ts' },
    ],
    signals: ['phrase length words', 'boundary strictness', 'semantic completeness', 'unsafe boundary guard'],
  },
  {
    id: 'browser-tts',
    step: 'Step 4',
    title: 'Browser TTS',
    description: 'Run browser speech synthesis with voice choice, rate control, queue handling, and fallbacks.',
    workspaceSummary: 'Executes the selected Browser TTS voice and captures environment details that can change pacing behavior.',
    kpis: [
      { label: 'Voice', value: (language) => `${language.label} voice metadata` },
      { label: 'Rate', value: 'requested vs actual' },
      { label: 'Queue', value: 'speechSynthesis state' },
    ],
    repositoryOwners: [
      { label: 'TTS runtime', path: 'src/app/useBrowserTtsRuntime.ts' },
      { label: 'chunk speaker', path: 'src/app/browserTtsPlaybackLoopChunkSpeaker.ts' },
      { label: 'playback controls', path: 'src/app/useTtsPlaybackControls.ts' },
      { label: 'TTS environment', path: 'src/inputs/browserTts/browserTtsEnvironment.ts' },
    ],
    signals: ['voice metadata', 'requested vs actual rate', 'speechSynthesis queue', 'pause/replay support'],
  },
  {
    id: 'playback-loop',
    step: 'Step 5',
    title: 'Playback loop',
    description: 'Play each chunk and collect pause, replay, latency, and interruption signals.',
    workspaceSummary: 'Runs the phrase-by-phrase loop and records the real learner pressure during playback.',
    kpis: [
      { label: 'Lag', value: 'stable lag sec' },
      { label: 'Replay', value: 'replay count' },
      { label: 'Pause', value: 'shortfall ms' },
    ],
    repositoryOwners: [
      { label: 'loop orchestration', path: 'src/app/useBrowserTtsPlaybackLoop.ts' },
      { label: 'progress estimator', path: 'src/app/useTtsPlaybackProgressEstimator.ts' },
      { label: 'decision trace', path: 'src/app/browserTtsPlaybackDecisionTrace.ts' },
      { label: 'control surface', path: 'src/app/useTtsPlaybackControls.ts' },
    ],
    signals: ['stable lag sec', 'replay count', 'pause shortfall', 'phrase progress'],
  },
  {
    id: 'scoring',
    step: 'Step 6',
    title: 'Scoring',
    description: 'Compute accuracy, WPM, score, points, and recovery state from the learner response.',
    workspaceSummary: 'Turns the completed learner response into accuracy, score, points, and completion state.',
    kpis: [
      { label: 'Accuracy', value: 'rolling accuracy' },
      { label: 'Typing', value: 'WPM + corrections' },
      { label: 'Score', value: 'points + state' },
    ],
    repositoryOwners: [
      { label: 'score model', path: 'src/core/sessionScore.ts' },
      { label: 'points model', path: 'src/core/sessionPoints.ts' },
      { label: 'submit runner', path: 'src/app/ttsSessionSubmitActionRunner.ts' },
      { label: 'session finalization', path: 'src/app/ttsSessionFinalization.ts' },
    ],
    signals: ['accuracy', 'WPM', 'score', 'points', 'completion state'],
  },
  {
    id: 'telemetry',
    step: 'Step 7',
    title: 'Telemetry',
    description: 'Persist runtime samples, timeline events, controller actions, perf markers, and device context.',
    workspaceSummary: 'Packages runtime evidence from playback, UI state, phrase completion, and final session metadata.',
    kpis: [
      { label: 'Frames', value: 'accepted samples' },
      { label: 'Actions', value: 'control events' },
      { label: 'Device', value: 'TTS environment' },
    ],
    repositoryOwners: [
      { label: 'telemetry recorder', path: 'src/app/useTtsTelemetryRecorder.ts' },
      { label: 'UI publisher', path: 'src/app/useTtsUiPublisher.ts' },
      { label: 'phrase telemetry', path: 'src/app/browserTtsPhraseCompletionTelemetry.ts' },
      { label: 'session finalization', path: 'src/app/ttsSessionFinalization.ts' },
    ],
    signals: ['timeline frames', 'control actions', 'adaptive timeline', 'TTS environment'],
  },
  {
    id: 'benchmark',
    step: 'Step 8',
    title: 'Benchmark',
    description: 'Calibrate rate, pause realism, chunk duration, voice behavior, and language thresholds.',
    workspaceSummary: 'Maintains the 20-day profile for the active browser-tts language and rejects weak samples.',
    kpis: [
      { label: 'Window', value: '20-day profile' },
      { label: 'Quality', value: 'rejection reasons' },
      { label: 'Calibration', value: (language) => `${language.label} thresholds` },
    ],
    repositoryOwners: [
      { label: 'benchmark service', path: 'src/core/adaptive/AdaptiveInputLanguageBenchmarkService.ts' },
      { label: 'quality gate', path: 'src/core/adaptive/runtimeSampleQualityGate.ts' },
      { label: 'JSON export', path: 'src/core/adaptive/benchmarkJson.ts' },
      { label: 'rejection diagnostics', path: 'src/core/adaptive/benchmarkRejectedSampleDiagnostics.ts' },
    ],
    signals: ['20-day window', 'accepted samples', 'rejection reasons', 'confidence', 'language calibration'],
  },
  {
    id: 'adaptation',
    step: 'Step 9',
    title: 'Adaptation',
    description: 'Update the pace profile and feed measured evidence into the next planner cycle.',
    workspaceSummary: 'Combines pressure, calibration, and output mapping to update the next cycle without splitting language pipelines.',
    kpis: [
      { label: 'Level', value: 'adaptive level' },
      { label: 'Pressure', value: 'pressure vector' },
      { label: 'Next', value: (language) => `${language.label} session knobs` },
    ],
    repositoryOwners: [
      { label: 'continuous cycle', path: 'src/core/adaptive/continuousAdaptiveListening.ts' },
      { label: 'pressure vector', path: 'src/core/adaptive/adaptivePressureVector.ts' },
      { label: 'output mapper', path: 'src/core/adaptive/adaptivePacingOutputMapper.ts' },
      { label: 'language calibration', path: 'src/core/adaptive/languageAdaptiveCalibration.ts' },
      { label: 'insight report', path: 'src/core/adaptive/listeningCycleInsightReportV3.ts' },
    ],
    signals: ['adaptive level', 'pressure vector', 'pacing output', 'calibration', 'next-session knobs'],
  },
];

function resolveAdaptiveFlowKpiValue(kpi: AdaptiveFlowKpi, language: AdaptiveFlowLanguage): string {
  return typeof kpi.value === 'function' ? kpi.value(language) : kpi.value;
}

export function AdaptivePaceLayerFlowWorkspace() {
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<AdaptiveFlowLanguageCode>('en');
  const [selectedPhaseId, setSelectedPhaseId] = useState(ADAPTIVE_FLOW_PHASES[0].id);
  const selectedLanguage = ADAPTIVE_FLOW_LANGUAGES.find(({ code }) => code === selectedLanguageCode) ?? ADAPTIVE_FLOW_LANGUAGES[0];
  const selectedPhase = ADAPTIVE_FLOW_PHASES.find(({ id }) => id === selectedPhaseId) ?? ADAPTIVE_FLOW_PHASES[0];

  return (
    <section className="panel workspace-panel adaptive-workspace adaptive-flow-workspace">
      <div className="tts-workspace-header adaptive-flow-header">
        <div>
          <p className="dashboard-eyebrow">Implementation cycle</p>
          <h2>Adaptative Pace Layer Flow</h2>
          <p className="hint adaptive-flow-summary">
            Ciclo operativo: generation, planner, chunker, Browser TTS, playback loop, scoring, telemetry, benchmark y adaptation.
          </p>
        </div>
      </div>

      <section className="adaptive-flow-language-card" aria-label="Adaptive pace layer implementation summary">
        <div>
          <p className="dashboard-eyebrow">Runtime loop</p>
          <h3>Closed adaptive cycle</h3>
          <p className="hint">
            Cada sesión genera evidencia; esa evidencia ajusta planner, chunker, Browser TTS y benchmark para la siguiente vuelta.
          </p>
        </div>
        <div className="adaptive-flow-language-buttons" aria-label="Adaptive pace layer supported languages">
          {ADAPTIVE_FLOW_LANGUAGES.map((language) => {
            const active = selectedLanguage.code === language.code;

            return (
              <button
                type="button"
                className={`secondary-button adaptive-flow-language-button${active ? ' adaptive-flow-language-button-active' : ''}`}
                key={language.code}
                aria-pressed={active}
                onClick={() => setSelectedLanguageCode(language.code)}
              >
                <span>{language.label}</span>
                <small>{active ? 'showing KPIs' : 'enabled'}</small>
              </button>
            );
          })}
        </div>
        <div className="adaptive-flow-selected-profile" aria-live="polite">
          <span>
            Profile <strong>browser-tts/{selectedLanguage.code}</strong>
          </span>
          <span>
            Language <strong>{selectedLanguage.name}</strong>
          </span>
          <span>
            Window <strong>20 days</strong>
          </span>
        </div>
      </section>

      <section
        className="adaptive-flow-cycle-workspace"
        aria-label={`${selectedPhase.title} cycle workspace`}
        aria-live="polite"
      >
        <div className="adaptive-flow-cycle-workspace-header">
          <p className="dashboard-eyebrow">{selectedPhase.step} workspace</p>
          <h3>{selectedPhase.title}</h3>
          <p className="hint">{selectedPhase.workspaceSummary}</p>
        </div>

        <div className="adaptive-flow-cycle-workspace-grid">
          <section
            className="adaptive-flow-cycle-workspace-section"
            aria-label={`${selectedPhase.title} KPIs for ${selectedLanguage.name}`}
          >
            <p className="dashboard-eyebrow">Main KPIs</p>
            <dl className="adaptive-flow-cycle-workspace-kpis">
              {selectedPhase.kpis.map((kpi) => (
                <div className="adaptive-flow-cycle-workspace-kpi" key={kpi.label}>
                  <dt>{kpi.label}</dt>
                  <dd>{resolveAdaptiveFlowKpiValue(kpi, selectedLanguage)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="adaptive-flow-cycle-workspace-section" aria-label={`${selectedPhase.title} repository owners`}>
            <p className="dashboard-eyebrow">Repo owners</p>
            <div className="adaptive-flow-repo-list">
              {selectedPhase.repositoryOwners.map((owner) => (
                <div className="adaptive-flow-repo-chip" key={owner.path}>
                  <strong>{owner.label}</strong>
                  <code>{owner.path}</code>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="adaptive-flow-signal-strip" aria-label={`${selectedPhase.title} runtime signals`}>
          {selectedPhase.signals.map((signal) => (
            <span key={signal}>{signal}</span>
          ))}
        </div>
      </section>

      <section
        className="adaptive-flow-cycle"
        aria-label={`Adaptive pace layer implementation cycle for ${selectedLanguage.name}`}
      >
        {ADAPTIVE_FLOW_PHASES.map((phase, index) => {
          const active = selectedPhase.id === phase.id;

          return (
            <article
              className={`adaptive-flow-phase-card${active ? ' adaptive-flow-phase-card-active' : ''}`}
              key={phase.id}
            >
              <button
                type="button"
                className="adaptive-flow-phase-open-button"
                aria-label={`Open ${phase.title} cycle workspace`}
                aria-pressed={active}
                onClick={() => setSelectedPhaseId(phase.id)}
              />
              <div className="adaptive-flow-phase-index" aria-hidden="true">{index + 1}</div>
              <div className="adaptive-flow-phase-content">
                <p className="dashboard-eyebrow">{phase.step}</p>
                <h3>{phase.title}</h3>
                <p>{phase.description}</p>
                <dl className="adaptive-flow-phase-kpis" aria-label={`${phase.title} main KPIs for ${selectedLanguage.name}`}>
                  {phase.kpis.map((kpi) => (
                    <div className="adaptive-flow-phase-kpi" key={kpi.label}>
                      <dt>{kpi.label}</dt>
                      <dd>{resolveAdaptiveFlowKpiValue(kpi, selectedLanguage)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <span className="adaptive-flow-phase-arrow" aria-hidden="true">
                {index === ADAPTIVE_FLOW_PHASES.length - 1 ? '↺' : '↓'}
              </span>
            </article>
          );
        })}
      </section>
    </section>
  );
}
