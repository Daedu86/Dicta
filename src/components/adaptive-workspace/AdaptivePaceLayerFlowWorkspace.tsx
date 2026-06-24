import { useEffect, useState } from 'react';
import type { OpenRouterAccessState } from '../../core/appProfiles';
import {
  DEFAULT_BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS,
  type BrowserTtsSafePauseGateSettings,
} from '../../app/browserTtsNextChunkScheduler';
import type { OpenRouterWorkspaceProps } from '../openrouter/types';
import {
  AdaptiveFlowDirectGenerationCard,
  OPENROUTER_DIRECT_GENERATION_CARD_ID,
} from './AdaptiveFlowDirectGenerationCard';

const ADAPTIVE_FLOW_HASH = '#adaptive-flow';
const ADAPTIVE_FLOW_PHASE_HASH_PREFIX = `${ADAPTIVE_FLOW_HASH}/`;

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

type AdaptiveFlowMetric = {
  label: string;
  value: string | ((language: AdaptiveFlowLanguage) => string);
  detail: string;
};

type AdaptiveFlowPhase = {
  id: string;
  step: string;
  title: string;
  description: string;
  workspaceSummary: string;
  kpis: readonly AdaptiveFlowKpi[];
  metrics: readonly AdaptiveFlowMetric[];
  repositoryOwners: readonly AdaptiveFlowRepositoryOwner[];
  signals: readonly string[];
};

type AdaptiveRuntimeCycleTextList = readonly string[] | ((language: AdaptiveFlowLanguage) => readonly string[]);

type AdaptiveRuntimeCycleGroup = {
  id: 'history' | 'prep' | 'run' | 'learn';
  range: string;
  eyebrow: string;
  title: string;
  detail: string | ((language: AdaptiveFlowLanguage) => string);
  inputs: AdaptiveRuntimeCycleTextList;
  outputs: AdaptiveRuntimeCycleTextList;
  phaseIds: readonly AdaptiveFlowPhase['id'][];
};

export type AdaptivePaceLayerFlowWorkspaceProps = {
  openRouterAccessState: OpenRouterAccessState;
  openRouterAccessMessage: string;
  openRouterWorkspaceProps: OpenRouterWorkspaceProps;
  safePauseGateSettings: BrowserTtsSafePauseGateSettings;
  onSaveSafePauseGateSettings: (settings: BrowserTtsSafePauseGateSettings) => void;
};

const ADAPTIVE_FLOW_PHASES: readonly AdaptiveFlowPhase[] = [
  {
    id: 'generation',
    step: 'Step 1',
    title: 'Generation',
    description: 'Generate the practice material with language, difficulty, shared duration target, and session goal.',
    workspaceSummary: 'Creates the direct OpenRouter prompt package before Browser TTS playback owns the runtime.',
    kpis: [
      { label: 'Profile', value: (language) => `browser-tts/${language.code}` },
      { label: 'Intent', value: 'Precision / Stabilize / Challenge' },
      { label: 'Target', value: (language) => `${language.name} script package` },
    ],
    metrics: [
      { label: 'Prompt budget', value: 'max tokens by duration', detail: 'Keeps generation inside the selected 2-5 minute session duration and model budget.' },
      { label: 'Validation', value: 'DictationScript schema', detail: 'Rejects malformed scripts before they become playable sessions.' },
      { label: 'Language target', value: (language) => language.name, detail: 'Locks script language to the active Browser TTS profile.' },
    ],
    repositoryOwners: [
      { label: 'flow generation card', path: 'src/components/adaptive-workspace/AdaptiveFlowDirectGenerationCard.tsx' },
      { label: 'direct generation runtime', path: 'src/app/useOpenRouterDirectGenerationRuntime.ts' },
      { label: 'direct job plan', path: 'src/app/openRouterDirectGenerationJobPlan.ts' },
      { label: 'prompt package', path: 'src/core/adaptive/openRouterGenerationPrompt.ts' },
    ],
    signals: ['language + intent', 'shared duration target', 'prompt preview', 'OpenRouter job state'],
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
    metrics: [
      { label: 'Rate envelope', value: '0.1-2.0 product range', detail: 'Prescription can describe the broad product pace envelope before Browser TTS clamps execution.' },
      { label: 'Pause target', value: '100-4000 ms', detail: 'Perceptual pause pressure can increase pause time without forcing rate down.' },
      { label: 'Intent safety', value: 'recover / progress / challenge', detail: 'User intent is downgraded when the active profile shows unstable evidence.' },
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
    metrics: [
      { label: 'Chunk size', value: 'short / medium / long', detail: 'Controls how much text is spoken before the learner reconstructs it.' },
      { label: 'Boundary risk', value: 'safe vs unsafe', detail: 'Unsafe boundaries prevent arbitrary replay and push pressure toward safer chunking.' },
      { label: 'Semantic score', value: '0-1 completeness', detail: 'Measures whether a chunk remains meaningful enough to learn from.' },
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
    metrics: [
      { label: 'Voice identity', value: 'voice URI + locale', detail: 'Separates learner progress from browser, OS, or voice changes.' },
      { label: 'Execution rate', value: 'requested / actual', detail: 'Records the rate Dicta requested and what Browser TTS actually executed.' },
      { label: 'Environment id', value: 'hashed fingerprint', detail: 'Tracks TTS environment without storing the raw user agent.' },
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
      { label: 'Pause', value: 'actual ms + gate reason' },
    ],
    metrics: [
      { label: 'Stable lag', value: 'seconds', detail: 'Uses smoothed lag to decide learner pressure during phrase playback.' },
      { label: 'Replay pressure', value: 'count + denial reason', detail: 'Counts replay attempts and whether the current boundary can safely replay.' },
      { label: 'Safe pause gate', value: 'min rest + max fallback', detail: 'Resolves safe-boundary waits after Browser TTS finishes each chunk.' },
      { label: 'Pause evidence', value: 'requested vs actual', detail: 'Keeps planner target separate from the wait the runtime actually delivered.' },
    ],
    repositoryOwners: [
      { label: 'loop orchestration', path: 'src/app/useBrowserTtsPlaybackLoop.ts' },
      { label: 'next chunk scheduler', path: 'src/app/browserTtsNextChunkScheduler.ts' },
      { label: 'progress estimator', path: 'src/app/useTtsPlaybackProgressEstimator.ts' },
      { label: 'decision trace', path: 'src/app/browserTtsPlaybackDecisionTrace.ts' },
      { label: 'control surface', path: 'src/app/useTtsPlaybackControls.ts' },
    ],
    signals: ['stable lag sec', 'replay count', 'actual pause ms', 'gate reason', 'phrase progress'],
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
    metrics: [
      { label: 'Listening precision', value: 'accuracy + reconstruction', detail: 'Measures how much of the spoken phrase was reconstructed correctly.' },
      { label: 'Diagnostic WPM', value: 'typing pace', detail: 'Typing speed is diagnostic; it does not dominate the listening prescription.' },
      { label: 'Completion state', value: 'finished / error', detail: 'Final status controls persistence, dashboard display, and benchmark eligibility.' },
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
    metrics: [
      { label: 'Timeline frames', value: 'live telemetry', detail: 'Captures lag, accuracy, rate, phrase position, and adaptive decisions over time.' },
      { label: 'Control actions', value: 'pause / replay / seek', detail: 'Records learner and runtime controls that shape pressure diagnostics.' },
      { label: 'Final sample', value: 'session package', detail: 'Packages final metrics before persistence and benchmark update.' },
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
    metrics: [
      { label: 'Rolling window', value: '20 days', detail: 'Keeps benchmark memory recent while preserving active and pending sessions separately.' },
      { label: 'Sample gate', value: 'accepted / rejected', detail: 'Separates benchmark scoring from session insight, telemetry learning, and runtime pressure.' },
      { label: 'Confidence', value: 'profile strength', detail: 'Controls how much the next planner should trust the benchmark.' },
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
    metrics: [
      { label: 'Adaptive level', value: 'continuous 0-1 state', detail: 'Maps learner pressure into rate, pause, phrase size, boundary strictness, and replay support.' },
      { label: 'Pressure vector', value: 'lag / accuracy / semantics', detail: 'Combines runtime evidence without splitting language-specific pipelines.' },
      { label: 'Next knobs', value: 'planner outputs', detail: 'Feeds the next generation and playback cycle for the active profile.' },
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

const ADAPTIVE_RUNTIME_CYCLE_GROUPS: readonly AdaptiveRuntimeCycleGroup[] = [
  {
    id: 'history',
    range: 'estado',
    eyebrow: 'Memoria del perfil',
    title: 'Benchmark + feedback reciente',
    detail: (language) => `Lee solo el perfil browser-tts/${language.code} antes de decidir la siguiente sesión.`,
    inputs: ['sesiones finalizadas', 'feedback reciente', 'entorno TTS'],
    outputs: (language) => ['benchmark 20 días', 'confianza del perfil', `calibración ${language.label}`],
    phaseIds: ['benchmark'],
  },
  {
    id: 'prep',
    range: '1-3',
    eyebrow: 'Preparar próxima sesión',
    title: 'Generation → Planner → Chunker',
    detail: 'Convierte la memoria en una receta enseñable: contenido, ritmo objetivo y chunks seguros.',
    inputs: ['benchmark + feedback', 'intención del usuario', 'idioma activo'],
    outputs: ['DictationScript', 'runtime policy', 'chunks escuchables'],
    phaseIds: ['generation', 'planner', 'chunker'],
  },
  {
    id: 'run',
    range: '4-5',
    eyebrow: 'Ejecutar sesión actual',
    title: 'Browser TTS + Playback loop',
    detail: 'El runtime habla, el usuario reconstruye, y Dicta mide presión real durante la sesión.',
    inputs: ['chunks planificados', 'voz disponible', 'controles en vivo'],
    outputs: ['decisión ejecutada', 'texto reconstruido', 'Señales en vivo'],
    phaseIds: ['browser-tts', 'playback-loop'],
  },
  {
    id: 'learn',
    range: '6-9',
    eyebrow: 'Aprender de la sesión',
    title: 'Scoring → Telemetry → Benchmark → Adaptation',
    detail: 'La evidencia vuelve al historial y prepara la siguiente vuelta del ciclo.',
    inputs: ['respuesta final', 'timeline runtime', 'quality gate'],
    outputs: ['score + diagnosis', 'benchmark actualizado', 'siguiente vuelta'],
    phaseIds: ['scoring', 'telemetry', 'benchmark', 'adaptation'],
  },
];

function resolveAdaptiveFlowKpiValue(kpi: AdaptiveFlowKpi, language: AdaptiveFlowLanguage): string {
  return typeof kpi.value === 'function' ? kpi.value(language) : kpi.value;
}

function resolveAdaptiveFlowMetricValue(metric: AdaptiveFlowMetric, language: AdaptiveFlowLanguage): string {
  return typeof metric.value === 'function' ? metric.value(language) : metric.value;
}

function resolveAdaptiveRuntimeCycleDetail(group: AdaptiveRuntimeCycleGroup, language: AdaptiveFlowLanguage): string {
  return typeof group.detail === 'function' ? group.detail(language) : group.detail;
}

function resolveAdaptiveRuntimeCycleTextList(list: AdaptiveRuntimeCycleTextList, language: AdaptiveFlowLanguage): readonly string[] {
  return typeof list === 'function' ? list(language) : list;
}

function getAdaptiveFlowPhase(phaseId: string): AdaptiveFlowPhase | null {
  return ADAPTIVE_FLOW_PHASES.find((phase) => phase.id === phaseId) ?? null;
}

function getAdaptiveFlowPhaseHash(phaseId: string): string {
  return `${ADAPTIVE_FLOW_PHASE_HASH_PREFIX}${phaseId}`;
}

function getAdaptiveFlowRoutePhaseId(): string | null {
  if (typeof window === 'undefined') return null;
  const { hash } = window.location;
  if (!hash.startsWith(ADAPTIVE_FLOW_PHASE_HASH_PREFIX)) return null;
  const phaseId = decodeURIComponent(hash.slice(ADAPTIVE_FLOW_PHASE_HASH_PREFIX.length));
  return ADAPTIVE_FLOW_PHASES.some((phase) => phase.id === phaseId) ? phaseId : null;
}

function normalizeAdaptiveFlowLanguageCode(value: string | undefined): AdaptiveFlowLanguageCode {
  return ADAPTIVE_FLOW_LANGUAGES.some((language) => language.code === value)
    ? value as AdaptiveFlowLanguageCode
    : 'en';
}

function navigateAdaptiveFlowHash(hash: string): void {
  if (typeof window === 'undefined') return;
  if (window.location.hash === hash) return;
  window.location.hash = hash;
}

export function AdaptivePaceLayerFlowWorkspace({
  openRouterAccessState,
  openRouterAccessMessage,
  openRouterWorkspaceProps,
  safePauseGateSettings,
  onSaveSafePauseGateSettings,
}: AdaptivePaceLayerFlowWorkspaceProps) {
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<AdaptiveFlowLanguageCode>(() =>
    normalizeAdaptiveFlowLanguageCode(openRouterWorkspaceProps.defaultGenerateLanguage),
  );
  const [routePhaseId, setRoutePhaseId] = useState<string | null>(() => getAdaptiveFlowRoutePhaseId());
  const selectedLanguage = ADAPTIVE_FLOW_LANGUAGES.find(({ code }) => code === selectedLanguageCode) ?? ADAPTIVE_FLOW_LANGUAGES[0];
  const routePhase = routePhaseId
    ? ADAPTIVE_FLOW_PHASES.find(({ id }) => id === routePhaseId) ?? null
    : null;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncRoutePhase = () => setRoutePhaseId(getAdaptiveFlowRoutePhaseId());

    window.addEventListener('hashchange', syncRoutePhase);
    window.addEventListener('popstate', syncRoutePhase);
    return () => {
      window.removeEventListener('hashchange', syncRoutePhase);
      window.removeEventListener('popstate', syncRoutePhase);
    };
  }, []);

  const openPhaseWorkspace = (phaseId: string) => {
    setRoutePhaseId(phaseId);
    navigateAdaptiveFlowHash(getAdaptiveFlowPhaseHash(phaseId));
  };

  const backToFlowIndex = () => {
    setRoutePhaseId(null);
    navigateAdaptiveFlowHash(ADAPTIVE_FLOW_HASH);
  };

  if (routePhase) {
    return (
      <AdaptiveFlowPhasePage
        selectedLanguage={selectedLanguage}
        selectedLanguageCode={selectedLanguageCode}
        selectedPhase={routePhase}
        openRouterAccessState={openRouterAccessState}
        openRouterAccessMessage={openRouterAccessMessage}
        openRouterWorkspaceProps={openRouterWorkspaceProps}
        safePauseGateSettings={safePauseGateSettings}
        onSaveSafePauseGateSettings={onSaveSafePauseGateSettings}
        onBack={backToFlowIndex}
        onSelectLanguage={setSelectedLanguageCode}
      />
    );
  }

  return (
    <section className="panel workspace-panel adaptive-workspace adaptive-flow-workspace">
      <div className="tts-workspace-header adaptive-flow-header">
        <div>
          <p className="dashboard-eyebrow">Implementation cycle</p>
          <h2>Adaptive Pace Layer Flow</h2>
          <p className="hint adaptive-flow-summary">
            Ciclo operativo: memoria → preparar → ejecutar → aprender → siguiente vuelta.
          </p>
        </div>
      </div>

      <AdaptiveFlowRuntimeMap
        selectedLanguage={selectedLanguage}
        onOpenPhase={openPhaseWorkspace}
      />

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
        className="adaptive-flow-cycle"
        aria-label={`Adaptive pace layer implementation cycle for ${selectedLanguage.name}`}
      >
        {ADAPTIVE_FLOW_PHASES.map((phase, index) => {
          return (
            <article
              className="adaptive-flow-phase-card"
              key={phase.id}
            >
              <button
                type="button"
                className="adaptive-flow-phase-open-button"
                aria-label={`Open ${phase.title} cycle workspace`}
                onClick={() => openPhaseWorkspace(phase.id)}
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

function AdaptiveFlowRuntimeMap({
  selectedLanguage,
  onOpenPhase,
}: {
  selectedLanguage: AdaptiveFlowLanguage;
  onOpenPhase: (phaseId: string) => void;
}) {
  return (
    <section className="adaptive-flow-runtime-map-card" aria-label="Adaptive pace layer circular runtime map">
      <div className="adaptive-flow-runtime-map-header">
        <div>
          <p className="dashboard-eyebrow">Pipeline + brain</p>
          <h3>Ciclo cerrado del Adaptive Pace Layer</h3>
          <p className="hint adaptive-flow-runtime-map-subtitle">
            Lee el mapa en sentido horario: memoria → preparar → ejecutar → aprender → memoria actualizada.
          </p>
        </div>
        <span>browser-tts/{selectedLanguage.code}</span>
      </div>

      <div className="adaptive-flow-runtime-cycle-order" aria-label="Adaptive pace layer clockwise order">
        <span>Orden horario</span>
        <strong>Memoria → 1-3 preparar → 4-5 ejecutar → 6-9 aprender → memoria actualizada</strong>
      </div>

      <div className="adaptive-flow-runtime-map" aria-label={`Closed adaptive runtime cycle for ${selectedLanguage.name}`}>
        <div className="adaptive-flow-runtime-cycle-arrows" aria-hidden="true">
          <span className="adaptive-flow-runtime-cycle-arrow adaptive-flow-runtime-cycle-arrow-history-prep">→</span>
          <span className="adaptive-flow-runtime-cycle-arrow adaptive-flow-runtime-cycle-arrow-prep-run">↓</span>
          <span className="adaptive-flow-runtime-cycle-arrow adaptive-flow-runtime-cycle-arrow-run-learn">←</span>
          <span className="adaptive-flow-runtime-cycle-arrow adaptive-flow-runtime-cycle-arrow-learn-history">↑</span>
        </div>

        <div className="adaptive-flow-runtime-cycle-center" aria-label="Adaptive runtime inputs and outputs">
          <p>Adaptive Runtime / Pace Layer</p>
          <strong>Motor de cada vuelta</strong>
          <span>rate · pause · chunk size · boundaries · replay</span>
        </div>

        {ADAPTIVE_RUNTIME_CYCLE_GROUPS.map((group) => {
          const inputItems = resolveAdaptiveRuntimeCycleTextList(group.inputs, selectedLanguage);
          const outputItems = resolveAdaptiveRuntimeCycleTextList(group.outputs, selectedLanguage);

          return (
            <article
              className={`adaptive-flow-runtime-cycle-node adaptive-flow-runtime-cycle-node-${group.id}`}
              key={group.id}
            >
              <div className="adaptive-flow-runtime-cycle-node-header">
                <span>{group.range}</span>
                <p>{group.eyebrow}</p>
              </div>
              <strong>{group.title}</strong>
              <span className="adaptive-flow-runtime-cycle-detail">{resolveAdaptiveRuntimeCycleDetail(group, selectedLanguage)}</span>
              <div className="adaptive-flow-runtime-cycle-evidence" aria-label={`${group.title} evidence and output`}>
                <div className="adaptive-flow-runtime-cycle-field">
                  <span>Evidencia entra</span>
                  <p>{inputItems.join(' · ')}</p>
                </div>
                <div className="adaptive-flow-runtime-cycle-field adaptive-flow-runtime-cycle-field-output">
                  <span>Decisión / salida</span>
                  <p>{outputItems.join(' · ')}</p>
                </div>
              </div>
              <ul className="adaptive-flow-runtime-phase-list" aria-label={`${group.title} related phases`}>
                {group.phaseIds.map((phaseId) => {
                  const phase = getAdaptiveFlowPhase(phaseId);
                  if (!phase) return null;

                  return (
                    <li key={`${group.id}-${phase.id}`}>
                      <button
                        type="button"
                        className="adaptive-flow-runtime-phase-chip"
                        onClick={() => onOpenPhase(phase.id)}
                      >
                        {phase.title}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AdaptiveFlowPhasePage({
  selectedLanguage,
  selectedLanguageCode,
  selectedPhase,
  openRouterAccessState,
  openRouterAccessMessage,
  openRouterWorkspaceProps,
  safePauseGateSettings,
  onSaveSafePauseGateSettings,
  onBack,
  onSelectLanguage,
}: {
  selectedLanguage: AdaptiveFlowLanguage;
  selectedLanguageCode: AdaptiveFlowLanguageCode;
  selectedPhase: AdaptiveFlowPhase;
  openRouterAccessState: OpenRouterAccessState;
  openRouterAccessMessage: string;
  openRouterWorkspaceProps: OpenRouterWorkspaceProps;
  safePauseGateSettings: BrowserTtsSafePauseGateSettings;
  onSaveSafePauseGateSettings: (settings: BrowserTtsSafePauseGateSettings) => void;
  onBack: () => void;
  onSelectLanguage: (languageCode: AdaptiveFlowLanguageCode) => void;
}) {
  return (
    <section className="panel workspace-panel adaptive-workspace adaptive-flow-workspace adaptive-flow-phase-page">
      <div className="tts-workspace-header adaptive-flow-header adaptive-flow-phase-page-header">
        <button
          type="button"
          className="secondary-button adaptive-flow-back-button"
          onClick={onBack}
        >
          Back to flow
        </button>
        <div>
          <p className="dashboard-eyebrow">{selectedPhase.step} workspace</p>
          <h2>{selectedPhase.title}</h2>
          <p className="hint adaptive-flow-summary">{selectedPhase.description}</p>
        </div>
      </div>

      <section className="adaptive-flow-language-card adaptive-flow-phase-profile-card" aria-label={`${selectedPhase.title} profile scope`}>
        <div>
          <p className="dashboard-eyebrow">Profile scope</p>
          <h3>browser-tts/{selectedLanguage.code}</h3>
          <p className="hint">{selectedPhase.workspaceSummary}</p>
        </div>
        <div className="adaptive-flow-language-buttons" aria-label="Adaptive pace layer supported languages">
          {ADAPTIVE_FLOW_LANGUAGES.map((language) => {
            const active = selectedLanguageCode === language.code;

            return (
              <button
                type="button"
                className={`secondary-button adaptive-flow-language-button${active ? ' adaptive-flow-language-button-active' : ''}`}
                key={language.code}
                aria-pressed={active}
                onClick={() => onSelectLanguage(language.code)}
              >
                <span>{language.label}</span>
                <small>{active ? 'showing KPIs' : 'enabled'}</small>
              </button>
            );
          })}
        </div>
        <div className="adaptive-flow-selected-profile" aria-live="polite">
          <span>
            Phase <strong>{selectedPhase.step}</strong>
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
        className="adaptive-flow-cycle-workspace adaptive-flow-cycle-workspace-page"
        aria-label={`${selectedPhase.title} cycle workspace`}
      >
        <div className="adaptive-flow-cycle-workspace-grid">
          <section
            className="adaptive-flow-cycle-workspace-section"
            aria-label={`${selectedPhase.title} KPIs for ${selectedLanguage.name}`}
          >
            <p className="dashboard-eyebrow">KPIs</p>
            <dl className="adaptive-flow-cycle-workspace-kpis">
              {selectedPhase.kpis.map((kpi) => (
                <div className="adaptive-flow-cycle-workspace-kpi" key={kpi.label}>
                  <dt>{kpi.label}</dt>
                  <dd>{resolveAdaptiveFlowKpiValue(kpi, selectedLanguage)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="adaptive-flow-cycle-workspace-section" aria-label={`${selectedPhase.title} operational metrics`}>
            <p className="dashboard-eyebrow">Operational metrics</p>
            <dl className="adaptive-flow-metric-list">
              {selectedPhase.metrics.map((metric) => (
                <div className="adaptive-flow-metric-row" key={metric.label}>
                  <dt>{metric.label}</dt>
                  <dd>
                    <strong>{resolveAdaptiveFlowMetricValue(metric, selectedLanguage)}</strong>
                    <span>{metric.detail}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {selectedPhase.id === 'generation' ? (
          <AdaptiveFlowGenerationLiveCard
            openRouterAccessState={openRouterAccessState}
            openRouterAccessMessage={openRouterAccessMessage}
            openRouterWorkspaceProps={openRouterWorkspaceProps}
            selectedLanguageCode={selectedLanguageCode}
          />
        ) : null}

        {selectedPhase.id === 'playback-loop' ? (
          <AdaptiveFlowSafePauseGateCard
            settings={safePauseGateSettings}
            onSave={onSaveSafePauseGateSettings}
          />
        ) : null}

        <section className="adaptive-flow-cycle-workspace-section" aria-label={`${selectedPhase.title} related files`}>
          <p className="dashboard-eyebrow">Related files</p>
          <div className="adaptive-flow-repo-list adaptive-flow-repo-list-wide">
            {selectedPhase.repositoryOwners.map((owner) => (
              <div className="adaptive-flow-repo-chip" key={owner.path}>
                <strong>{owner.label}</strong>
                <code>{owner.path}</code>
              </div>
            ))}
          </div>
        </section>

        <div className="adaptive-flow-signal-strip" aria-label={`${selectedPhase.title} runtime signals`}>
          {selectedPhase.signals.map((signal) => (
            <span key={signal}>{signal}</span>
          ))}
        </div>
      </section>
    </section>
  );
}

function AdaptiveFlowSafePauseGateCard({
  settings,
  onSave,
}: {
  settings: BrowserTtsSafePauseGateSettings;
  onSave: (settings: BrowserTtsSafePauseGateSettings) => void;
}) {
  const [draft, setDraft] = useState<BrowserTtsSafePauseGateSettings>(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const updateDraftValue = (key: keyof BrowserTtsSafePauseGateSettings, value: string): void => {
    const nextValue = Number(value);
    setDraft((current) => ({
      ...current,
      [key]: Number.isFinite(nextValue) ? nextValue : current[key],
    }));
    setSaved(false);
  };

  const saveSettings = (): void => {
    onSave(normalizeSafePauseGateSettingsDraft(draft));
    setSaved(true);
  };

  return (
    <section
      className="adaptive-flow-cycle-workspace-section adaptive-flow-safe-pause-gate-card"
      aria-label="Safe chunk pause gate settings"
    >
      <div className="adaptive-flow-safe-pause-gate-header">
        <div>
          <p className="dashboard-eyebrow">Runtime safe pause</p>
          <h3>Safe chunk pause gate</h3>
          <p className="hint">
            Applies only after a safe chunk boundary; unsafe semantic cuts still advance without artificial rest.
          </p>
        </div>
        <span>browser-tts runtime</span>
      </div>

      <dl className="adaptive-flow-safe-pause-gate-summary" aria-label="Safe pause gate concepts">
        <div>
          <dt>Minimum mental rest</dt>
          <dd>{settings.minimumMentalRestMs} ms</dd>
        </div>
        <div>
          <dt>Completion gate</dt>
          <dd>typed chunk coverage</dd>
        </div>
        <div>
          <dt>Max fallback</dt>
          <dd>{settings.completionGateMaxWaitMs} ms</dd>
        </div>
      </dl>

      <div className="adaptive-flow-safe-pause-gate-form">
        <label htmlFor="adaptive-flow-minimum-mental-rest-ms">
          <span>Minimum mental rest</span>
          <input
            id="adaptive-flow-minimum-mental-rest-ms"
            type="number"
            min={0}
            max={10000}
            step={100}
            value={draft.minimumMentalRestMs}
            onChange={(event) => updateDraftValue('minimumMentalRestMs', event.target.value)}
          />
        </label>
        <label htmlFor="adaptive-flow-completion-gate-max-wait-ms">
          <span>Max fallback</span>
          <input
            id="adaptive-flow-completion-gate-max-wait-ms"
            type="number"
            min={1}
            max={10000}
            step={100}
            value={draft.completionGateMaxWaitMs}
            onChange={(event) => updateDraftValue('completionGateMaxWaitMs', event.target.value)}
          />
        </label>
        <button
          type="button"
          className="primary-button adaptive-flow-safe-pause-gate-save-button"
          onClick={saveSettings}
        >
          Save
        </button>
      </div>
      <p className="hint adaptive-flow-safe-pause-gate-status" aria-live="polite">
        {saved ? 'Saved locally for Browser TTS playback.' : 'Save updates the next safe pause resolution.'}
      </p>
    </section>
  );
}

function normalizeSafePauseGateSettingsDraft(
  draft: BrowserTtsSafePauseGateSettings,
): BrowserTtsSafePauseGateSettings {
  const completionGateMaxWaitMs = normalizeDelayMs(
    draft.completionGateMaxWaitMs,
    DEFAULT_BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS.completionGateMaxWaitMs,
  );
  const minimumMentalRestMs = Math.min(
    completionGateMaxWaitMs,
    normalizeDelayMs(
      draft.minimumMentalRestMs,
      DEFAULT_BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS.minimumMentalRestMs,
      { allowZero: true },
    ),
  );

  return {
    minimumMentalRestMs,
    completionGateMaxWaitMs,
  };
}

function normalizeDelayMs(
  value: unknown,
  fallback: number,
  options: { allowZero?: boolean } = {},
): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  const rounded = Math.round(numeric);
  if (!Number.isFinite(rounded)) return fallback;
  if (rounded > 0) return rounded;
  return options.allowZero && rounded === 0 ? 0 : fallback;
}

function AdaptiveFlowGenerationLiveCard({
  openRouterAccessState,
  openRouterAccessMessage,
  openRouterWorkspaceProps,
  selectedLanguageCode,
}: {
  openRouterAccessState: OpenRouterAccessState;
  openRouterAccessMessage: string;
  openRouterWorkspaceProps: OpenRouterWorkspaceProps;
  selectedLanguageCode: AdaptiveFlowLanguageCode;
}) {
  return (
    <section
      id={OPENROUTER_DIRECT_GENERATION_CARD_ID}
      className="adaptive-flow-cycle-workspace-section adaptive-flow-generation-live-card"
      aria-label="Generation OpenRouter live controls"
    >
      <div className="adaptive-flow-generation-live-card-header">
        <div>
          <p className="dashboard-eyebrow">Live generation</p>
          <h3>Generate Training Session</h3>
          <p className="hint">
            Configures the prompt that goes to OpenRouter and validates the returned DictationScript before playback.
          </p>
        </div>
      </div>
      {openRouterAccessState !== 'allowed' ? (
        <p className={openRouterAccessState === 'pending' ? 'hint' : 'error'}>
          {openRouterAccessState === 'pending' ? 'Checking OpenRouter access...' : openRouterAccessMessage}
        </p>
      ) : (
        <AdaptiveFlowGenerationAllowedCard
          openRouterWorkspaceProps={openRouterWorkspaceProps}
          selectedLanguageCode={selectedLanguageCode}
        />
      )}
    </section>
  );
}

function AdaptiveFlowGenerationAllowedCard({
  openRouterWorkspaceProps,
  selectedLanguageCode,
}: {
  openRouterWorkspaceProps: OpenRouterWorkspaceProps;
  selectedLanguageCode: AdaptiveFlowLanguageCode;
}) {
  return (
    <AdaptiveFlowDirectGenerationCard
      openRouterWorkspaceProps={openRouterWorkspaceProps}
      selectedLanguageCode={selectedLanguageCode}
    />
  );
}
