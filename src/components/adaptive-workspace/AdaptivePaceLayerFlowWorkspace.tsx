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

type AdaptiveFlowPhase = {
  step: string;
  title: string;
  description: string;
  kpis: readonly AdaptiveFlowKpi[];
};

const ADAPTIVE_FLOW_PHASES: readonly AdaptiveFlowPhase[] = [
  {
    step: 'Step 1',
    title: 'Generation',
    description: 'Generate the practice material with language, difficulty, duration target, and session goal.',
    kpis: [
      { label: 'Profile', value: (language) => `browser-tts/${language.code}` },
      { label: 'Intent', value: 'Precision / Stabilize / Challenge' },
      { label: 'Target', value: (language) => `${language.name} script package` },
    ],
  },
  {
    step: 'Step 2',
    title: 'Planner',
    description: 'Plan target pace, phrase size, pauses, replay rules, and recovery thresholds.',
    kpis: [
      { label: 'Rate', value: 'target playback rate' },
      { label: 'Pause', value: 'pause ms target' },
      { label: 'Replay', value: 'safe replay support' },
    ],
  },
  {
    step: 'Step 3',
    title: 'Chunker',
    description: 'Split the script into teachable chunks with sentence boundaries and punctuation preserved.',
    kpis: [
      { label: 'Phrase', value: 'words per chunk' },
      { label: 'Boundary', value: 'strictness score' },
      { label: 'Semantics', value: 'completeness score' },
    ],
  },
  {
    step: 'Step 4',
    title: 'Browser TTS',
    description: 'Run browser speech synthesis with voice choice, rate control, queue handling, and fallbacks.',
    kpis: [
      { label: 'Voice', value: (language) => `${language.label} voice metadata` },
      { label: 'Rate', value: 'requested vs actual' },
      { label: 'Queue', value: 'speechSynthesis state' },
    ],
  },
  {
    step: 'Step 5',
    title: 'Playback loop',
    description: 'Play each chunk and collect pause, replay, latency, and interruption signals.',
    kpis: [
      { label: 'Lag', value: 'stable lag sec' },
      { label: 'Replay', value: 'replay count' },
      { label: 'Pause', value: 'shortfall ms' },
    ],
  },
  {
    step: 'Step 6',
    title: 'Scoring',
    description: 'Compute accuracy, WPM, score, points, and recovery state from the learner response.',
    kpis: [
      { label: 'Accuracy', value: 'rolling accuracy' },
      { label: 'Typing', value: 'WPM + corrections' },
      { label: 'Score', value: 'points + state' },
    ],
  },
  {
    step: 'Step 7',
    title: 'Telemetry',
    description: 'Persist runtime samples, timeline events, controller actions, perf markers, and device context.',
    kpis: [
      { label: 'Frames', value: 'accepted samples' },
      { label: 'Actions', value: 'control events' },
      { label: 'Device', value: 'TTS environment' },
    ],
  },
  {
    step: 'Step 8',
    title: 'Benchmark',
    description: 'Calibrate rate, pause realism, chunk duration, voice behavior, and language thresholds.',
    kpis: [
      { label: 'Window', value: '20-day profile' },
      { label: 'Quality', value: 'rejection reasons' },
      { label: 'Calibration', value: (language) => `${language.label} thresholds` },
    ],
  },
  {
    step: 'Step 9',
    title: 'Adaptation',
    description: 'Update the pace profile and feed measured evidence into the next planner cycle.',
    kpis: [
      { label: 'Level', value: 'adaptive level' },
      { label: 'Pressure', value: 'pressure vector' },
      { label: 'Next', value: (language) => `${language.label} session knobs` },
    ],
  },
];

function resolveAdaptiveFlowKpiValue(kpi: AdaptiveFlowKpi, language: AdaptiveFlowLanguage): string {
  return typeof kpi.value === 'function' ? kpi.value(language) : kpi.value;
}

export function AdaptivePaceLayerFlowWorkspace() {
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<AdaptiveFlowLanguageCode>('en');
  const selectedLanguage = ADAPTIVE_FLOW_LANGUAGES.find(({ code }) => code === selectedLanguageCode) ?? ADAPTIVE_FLOW_LANGUAGES[0];

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
        className="adaptive-flow-cycle"
        aria-label={`Adaptive pace layer implementation cycle for ${selectedLanguage.name}`}
      >
        {ADAPTIVE_FLOW_PHASES.map(({ step, title, description, kpis }, index) => (
          <article className="adaptive-flow-phase-card" key={step}>
            <div className="adaptive-flow-phase-index" aria-hidden="true">{index + 1}</div>
            <div className="adaptive-flow-phase-content">
              <p className="dashboard-eyebrow">{step}</p>
              <h3>{title}</h3>
              <p>{description}</p>
              <dl className="adaptive-flow-phase-kpis" aria-label={`${title} main KPIs for ${selectedLanguage.name}`}>
                {kpis.map((kpi) => (
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
        ))}
      </section>
    </section>
  );
}
