import { useState } from 'react';
import {
  LANGUAGE_LABELS,
  LANGUAGE_TAB_LABELS,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '../../core/languages';

const ADAPTIVE_FLOW_PHASES = [
  ['Fase 1', 'Generate session', 'Creates the practice session and locks the language context.'],
  ['Fase 2', 'Chunker', 'Splits the session into safe teachable chunks.'],
  ['Fase 3', 'Planner', 'Chooses phrase size, pause intention, replay behavior, and pacing mode.'],
  ['Fase 4', 'Runtime', 'Applies the live controller decision using lag, accuracy, history, and recovery signals.'],
  ['Fase 5', 'Browser TTS', 'Executes the plan with effective rate, voice calibration, and chunk playback.'],
  ['Fase 6', 'Telemetria benchmarks', 'Records rate, pause, lag, accuracy, environment, benchmark, and session insight samples.'],
  ['Fase 7', 'Goes to Fase 1', 'Feeds the new evidence back into the next cycle.'],
] as const;

const LANGUAGE_FLOW_NOTES: Record<SupportedLanguage, string> = {
  en: 'English needs stronger intra-chunk rate control when Browser TTS sounds fast even with long pauses.',
  es: 'Spanish uses benchmark calibration to preserve natural comprehension without unnecessary slowdown.',
  de: 'German has extra recovery logic for browser lag outliers and short-chunk pressure.',
  fr: 'French follows the base adaptive path until benchmark evidence shows language-specific pressure.',
  pt: 'Portuguese follows the base adaptive path while collecting benchmark evidence for later specialization.',
};

export function AdaptivePaceLayerFlowWorkspace() {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const selectedLanguageLabel = LANGUAGE_LABELS[selectedLanguage];

  return (
    <section className="panel workspace-panel adaptive-workspace adaptive-flow-workspace">
      <div className="tts-workspace-header adaptive-flow-header">
        <div>
          <p className="dashboard-eyebrow">Adaptive brain map</p>
          <h2>Adaptative Pace Layer Flow</h2>
          <p className="hint adaptive-flow-summary">
            Ciclo completo: generate session, chunker, planner, runtime, Browser TTS, telemetria benchmarks y vuelta a Fase 1.
          </p>
        </div>
      </div>

      <section className="adaptive-flow-language-card" aria-label="Adaptive pace layer language selector">
        <div>
          <p className="dashboard-eyebrow">Language workspace</p>
          <h3>{selectedLanguageLabel}</h3>
          <p className="hint">{LANGUAGE_FLOW_NOTES[selectedLanguage]}</p>
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
      </section>

      <section className="adaptive-flow-cycle" aria-label={`${selectedLanguageLabel} adaptive pace layer cycle`}>
        {ADAPTIVE_FLOW_PHASES.map(([phase, title, description], index) => (
          <article className="adaptive-flow-phase-card" key={phase}>
            <div className="adaptive-flow-phase-index" aria-hidden="true">{index + 1}</div>
            <div>
              <p className="dashboard-eyebrow">{phase}</p>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
            <span className="adaptive-flow-phase-arrow" aria-hidden="true">
              {index === ADAPTIVE_FLOW_PHASES.length - 1 ? '↺' : '→'}
            </span>
          </article>
        ))}
      </section>
    </section>
  );
}
