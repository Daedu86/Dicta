const ADAPTIVE_FLOW_PHASES = [
  ['Step 1', 'Generation', 'Generate the practice material with language, difficulty, duration target, and session goal.'],
  ['Step 2', 'Planner', 'Plan target pace, phrase size, pauses, replay rules, and recovery thresholds.'],
  ['Step 3', 'Chunker', 'Split the script into teachable chunks with sentence boundaries and punctuation preserved.'],
  ['Step 4', 'Browser TTS', 'Run browser speech synthesis with voice choice, rate control, queue handling, and fallbacks.'],
  ['Step 5', 'Playback loop', 'Play each chunk and collect pause, replay, latency, and interruption signals.'],
  ['Step 6', 'Scoring', 'Compute accuracy, WPM, score, points, and recovery state from the learner response.'],
  ['Step 7', 'Telemetry', 'Persist runtime samples, timeline events, controller actions, perf markers, and device context.'],
  ['Step 8', 'Benchmark', 'Calibrate rate, pause realism, chunk duration, voice behavior, and language thresholds.'],
  ['Step 9', 'Adaptation', 'Update the pace profile and feed measured evidence into the next planner cycle.'],
] as const;

export function AdaptivePaceLayerFlowWorkspace() {
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
          {['EN', 'ES', 'DE', 'FR', 'PT'].map((language) => (
            <span className="secondary-button adaptive-flow-language-button" key={language}>
              <span>{language}</span>
              <small>enabled</small>
            </span>
          ))}
        </div>
      </section>

      <section className="adaptive-flow-cycle" aria-label="Adaptive pace layer implementation cycle">
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
