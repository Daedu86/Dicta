import { useState } from 'react';
import {
  LANGUAGE_LABELS,
  LANGUAGE_TAB_LABELS,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '../../core/languages';

const ADAPTIVE_FLOW_PHASES = [
  ['Step 1', 'Generation', 'Create the practice material with language, difficulty, target duration, and session objective.'],
  ['Step 2', 'Planner', 'Choose target pace, phrase size, pause policy, replay policy, and recovery thresholds.'],
  ['Step 3', 'Chunker', 'Split text into teachable chunks that preserve punctuation, phrase intent, and sentence boundaries.'],
  ['Step 4', 'Browser TTS implementation', 'Apply voice selection, effective rate, queue handling, replay behavior, and browser fallbacks.'],
  ['Step 5', 'Playback loop', 'Run chunk-by-chunk playback and collect timing, pause, replay, and lag signals.'],
  ['Step 6', 'Scoring', 'Compute accuracy, WPM, score, points, and recovery state from the learner response.'],
  ['Step 7', 'Telemetry', 'Persist runtime samples, adaptive timeline, control actions, perf markers, and device context.'],
  ['Step 8', 'Benchmark', 'Calibrate rate, pause realism, chunk duration, voice behavior, and language thresholds.'],
  ['Step 9', 'Adaptation', 'Update the pace profile and feed the next planner cycle with measured evidence.'],
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
          <p className="dashboard-eyebrow">Implementation cycle</p>
          <h2>Adaptative Pace Layer Flow</h2>
          <p className="hint adaptive-flow-summary">
            Ciclo completo: generation, planner, chunker, Browser TTS implementation, playback loop, scoring, telemetria, benchmark y vuelta al planner.
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
