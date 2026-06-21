import { useMemo, useState } from 'react';
import type { LiveMetricsDockProps } from '../runtime-workspaces/LiveMetricsDock';
import { LiveMetricsDiagnosticMessage } from '../runtime-workspaces/LiveMetricsDiagnosticFallback';
import {
  LANGUAGE_LABELS,
  LANGUAGE_TAB_LABELS,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '../../core/languages';

type AdaptiveFlowInsightsProps = Pick<
  LiveMetricsDockProps,
  | 'metricsLanguageView'
  | 'insightsDiagnosticInputMode'
  | 'insightsDiagnosticMessage'
  | 'onCopyInsightsDiagnosticPackage'
  | 'formatInputModeLabel'
>;

type AdaptivePaceLayerFlowWorkspaceProps = {
  insights: AdaptiveFlowInsightsProps;
};

const ADAPTIVE_FLOW_PHASES = [
  {
    phase: 'Fase 1',
    title: 'Generate session',
    description: 'Creates the practice session for the selected language and locks the input context the brain will observe.',
  },
  {
    phase: 'Fase 2',
    title: 'Chunker',
    description: 'Splits the session into safe, teachable chunks using language, phrase boundaries, and semantic load.',
  },
  {
    phase: 'Fase 3',
    title: 'Planner',
    description: 'Chooses the next phrase size, pause intention, replay behavior, and target pacing mode.',
  },
  {
    phase: 'Fase 4',
    title: 'Runtime',
    description: 'Applies the live controller decision against lag, accuracy, pressure, history, and recovery signals.',
  },
  {
    phase: 'Fase 5',
    title: 'Browser TTS',
    description: 'Executes the plan through SpeechSynthesisUtterance: effective rate, voice calibration, and chunk playback.',
  },
  {
    phase: 'Fase 6',
    title: 'Telemetría benchmarks',
    description: 'Records actual rate, pause, lag, accuracy, environment, benchmark quality, and session insight samples.',
  },
  {
    phase: 'Fase 7',
    title: 'Goes to Fase 1',
    description: 'Feeds the new evidence back into the next cycle so the adaptive pace layer keeps learning.',
  },
] as const;

const LANGUAGE_FLOW_NOTES: Record<SupportedLanguage, string> = {
  en: 'English currently needs stronger intra-chunk rate control because Browser TTS can sound fast even when pauses are long.',
  es: 'Spanish uses benchmark calibration to preserve natural comprehension while avoiding unnecessary slowdown.',
  de: 'German has extra recovery logic for Android/browser lag outliers and short-chunk pressure.',
  fr: 'French follows the base adaptive path until benchmark evidence shows language-specific pressure.',
  pt: 'Portuguese follows the base adaptive path while collecting benchmark evidence for later specialization.',
};

export function AdaptivePaceLayerFlowWorkspace({
  insights,
}: AdaptivePaceLayerFlowWorkspaceProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const selectedLanguageLabel = LANGUAGE_LABELS[selectedLanguage];
  const selectedLanguageNote = LANGUAGE_FLOW_NOTES[selectedLanguage];
  const phaseCards = useMemo(() => ADAPTIVE_FLOW_PHASES, []);

  return (
    <section className="panel workspace-panel adaptive-workspace adaptive-flow-workspace">
      <div className="tts-workspace-header adaptive-flow-header">
        <div>
          <p className="dashboard-eyebrow">Adaptive brain map</p>
          <h2>Adaptative Pace Layer Flow</h2>
          <p className="hint adaptive-flow-summary">
            Visualiza el ciclo completo del cerebro adaptativo: sesión, chunking, planning, runtime, Browser TTS,
            telemetría/benchmarks y retorno al siguiente ciclo.
          </p>
        </div>
      </div>

      <section className="adaptive-flow-control-card" aria-label="Adaptive pace layer flow controls">
        <div className="adaptive-flow-language-card" aria-label="Adaptive pace layer language selector">
          <div>
            <p className="dashboard-eyebrow">Language workspace</p>
            <h3>{selectedLanguageLabel}</h3>
            <p className="hint">{selectedLanguageNote}</p>
          </div>
          <div className="adaptive-flow-language-buttons" role="tablist" aria-label="Adaptive pace layer languages">
            {SUPPORTED_LANGUAGES.map((language) => {
              const selected = language === selectedLanguage;
              return (
                <button
                  key={language}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`secondary-button adaptive-flow-language-button ${selected ? 'adaptive-flow-language-button-active' : ''}`}
                  onClick={() => setSelectedLanguage(language)}
                >
                  <span>{LANGUAGE_TAB_LABELS[language]}</span>
                  <small>{LANGUAGE_LABELS[language]}</small>
                </button>
              );
            })}
          </div>
        </div>

        <div className="adaptive-flow-insights-card" aria-label="Adaptive pace layer flow insights">
          <div>
            <p className="dashboard-eyebrow">Insights</p>
            <h3>Session insight + benchmark loop</h3>
            <p className="hint">
              Este bloque vive dentro del Flow para revisar cómo el cerebro convierte telemetría en benchmark y vuelve al siguiente ciclo.
            </p>
          </div>
          <div className="adaptive-report-action-stack">
            <button
              type="button"
              className="secondary-button live-metrics-report-button"
              onClick={() => void insights.onCopyInsightsDiagnosticPackage()}
              title={`Copy one structured adaptive report for ${insights.formatInputModeLabel(insights.insightsDiagnosticInputMode)} / ${insights.metricsLanguageView.toUpperCase()}: summary, loop breakdown, planner/controller/runtime diagnostics, Browser TTS metadata, benchmark, feedback, and compact raw debug.`}
            >
              Copy full adaptive report
            </button>
            <LiveMetricsDiagnosticMessage message={insights.insightsDiagnosticMessage} />
          </div>
        </div>
      </section>

      <section className="adaptive-flow-cycle" aria-label={`${selectedLanguageLabel} adaptive pace layer cycle`}>
        {phaseCards.map((phase, index) => (
          <article className="adaptive-flow-phase-card" key={phase.phase}>
            <div className="adaptive-flow-phase-index" aria-hidden="true">{index + 1}</div>
            <div>
              <p className="dashboard-eyebrow">{phase.phase}</p>
              <h3>{phase.title}</h3>
              <p>{phase.description}</p>
            </div>
            <span className="adaptive-flow-phase-arrow" aria-hidden="true">
              {index === phaseCards.length - 1 ? '↺' : '→'}
            </span>
          </article>
        ))}
      </section>
    </section>
  );
}
