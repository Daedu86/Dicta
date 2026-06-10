import type { InputMode } from '../../core/adaptive/types';
import { formatSessionPointsForSession, type SessionPointsSource } from '../../core/evaluation';
import { estimateSessionVoiceDurationSec, type SessionDurationInput } from '../../core/sessionDuration';
import { buildSessionScoreHelpText, type SessionScoreMetrics } from '../../core/sessionScore';
import type { SessionTelemetry, Transcript } from '../../types/dictation';
import { AdaptiveAdapterCard } from './AdaptiveBenchmarkWorkspace';
import type { AdaptiveAdapterCardConfig } from './types';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../../core/sessionInputModes';

type AdaptiveAdvancedDiagnosticsExpandedState = {
  decision: boolean;
  architecture: boolean;
  adapters: boolean;
  latest: boolean;
  live: boolean;
  telemetry: boolean;
};

type AdaptiveSessionMetrics = SessionScoreMetrics & {
  lagWords: number;
  trend: 'improving' | 'stable' | 'declining';
};

type AdaptiveLatestSession = Omit<SessionDurationInput, 'inputMode' | 'telemetry' | 'transcript'> &
  Omit<SessionPointsSource, 'inputMode' | 'transcript'> & {
  name?: string | null;
  updatedAt: string;
  inputMode: AdaptiveAdapterCardConfig['inputMode'];
  transcript?: Transcript | null;
  metrics: AdaptiveSessionMetrics;
  telemetry: SessionTelemetry;
};

type AdaptiveSemanticDebug = {
  semanticCutPenalty: number;
  unsafePauseCount: number;
  safePauseCount: number;
  deferredPauseCount: number;
  replayDeniedByBoundaryCount: number;
  averageSemanticCompleteness: number;
  averagePhraseDifficulty: number;
  inputExecutionFidelityScore: number;
  currentPhraseIndex: number;
  totalSemanticPhrases: number;
  currentPhraseId: string;
  currentPhraseTextPreview: string | null;
  phraseAdvanceCount: number;
  phraseReplayCount: number;
  lastPhraseAdvanceReason: string;
};

function countTelemetrySamples(telemetry: SessionTelemetry): number {
  return Math.max(telemetry.lagSeries.length, telemetry.wpmSeries.length, telemetry.accuracySeries.length);
}

function formatSessionInputMode(mode: AdaptiveAdapterCardConfig['inputMode']): string {
  if (mode === BROWSER_TTS_SESSION_INPUT_MODE) return 'Browser TTS';
  return 'Removed legacy input';
}

function formatDuration(seconds: number): string {
  const roundedSeconds = Math.max(0, Math.round(seconds));
  if (roundedSeconds < 60) {
    return `${roundedSeconds}s`;
  }
  const minutes = Math.floor(roundedSeconds / 60);
  const remainder = roundedSeconds % 60;
  return `${minutes}m ${remainder}s`;
}

function formatSessionPlaybackDuration(session: AdaptiveLatestSession): string {
  const durationSec = estimateSessionVoiceDurationSec(session);
  return durationSec !== null ? formatDuration(durationSec) : 'n/a';
}

export function AdaptiveAdvancedDiagnostics({
  adaptiveSectionExpanded,
  adaptiveAdapters,
  latestSession,
  latestInputAdapter,
  latestAdaptiveMode,
  selectedBenchmarkInputMode,
  adaptiveSemanticDebug,
  mapSessionInputMode,
  onToggleDecisionArchitectureSections,
  onToggleAdaptersSection,
  onToggleLatestSections,
  onToggleTelemetrySection,
  onOpenAdapter,
}: {
  adaptiveSectionExpanded: AdaptiveAdvancedDiagnosticsExpandedState;
  adaptiveAdapters: AdaptiveAdapterCardConfig[];
  latestSession: AdaptiveLatestSession | null;
  latestInputAdapter: AdaptiveAdapterCardConfig | null;
  latestAdaptiveMode: string;
  selectedBenchmarkInputMode: InputMode;
  adaptiveSemanticDebug: AdaptiveSemanticDebug;
  mapSessionInputMode: (mode: AdaptiveAdapterCardConfig['inputMode']) => InputMode;
  onToggleDecisionArchitectureSections: () => void;
  onToggleAdaptersSection: () => void;
  onToggleLatestSections: () => void;
  onToggleTelemetrySection: () => void;
  onOpenAdapter: (inputMode: AdaptiveAdapterCardConfig['inputMode']) => void;
}) {
  return (
    <details className="adaptive-advanced-shell">
      <summary>
        <span>
          <strong>Advanced diagnostics</strong>
          <small>Architecture, adapters, latest run, and debug counters</small>
        </span>
      </summary>
      <div className="adaptive-advanced-grid">
        <section className="panel workspace-panel adaptive-decision-panel">
          <div className="adaptive-section-header">
            <div>
              <p className="dashboard-eyebrow">Advanced</p>
              <h3>Central Brain</h3>
            </div>
            <button
              type="button"
              className="secondary-button adaptive-section-toggle"
              onClick={onToggleDecisionArchitectureSections}
              aria-expanded={adaptiveSectionExpanded.decision}
              aria-label={adaptiveSectionExpanded.decision ? 'Collapse section' : 'Expand section'}
              title={adaptiveSectionExpanded.decision ? 'Collapse' : 'Expand'}
            >
              <span className={`adaptive-section-toggle-icon ${adaptiveSectionExpanded.decision ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
            </button>
          </div>
          {adaptiveSectionExpanded.decision ? (
            <>
              <p className="dashboard-meta">
                AdaptiveDictationController reads normalized telemetry and chooses support, balanced, or flow pacing for the active input.
              </p>
              <div className="bottom-summary-grid">
                <div className="metric" aria-label={`Current mode: ${latestAdaptiveMode}`}>
                  <span>Current mode</span>
                  <strong>{latestAdaptiveMode}</strong>
                </div>
                <div className="metric" aria-label="Rate range: 0.75x-1.15x">
                  <span>Rate range</span>
                  <strong>0.75x-1.15x</strong>
                </div>
                <div className="metric" aria-label="Phrase sizes: Short / medium / long">
                  <span>Phrase sizes</span>
                  <strong>Short / medium / long</strong>
                </div>
                <div className="metric" aria-label="Inputs: Lag, accuracy, WPM">
                  <span>Inputs</span>
                  <strong>Lag, accuracy, WPM</strong>
                </div>
                <div className="metric" aria-label="Sensitivity: Correction + difficulty">
                  <span>Sensitivity</span>
                  <strong>Correction + difficulty</strong>
                </div>
                <div className="metric" aria-label="History: Profile confidence">
                  <span>History</span>
                  <strong>Profile confidence</strong>
                </div>
              </div>
            </>
          ) : null}
        </section>

        <section className="panel workspace-panel adaptive-architecture-panel">
          <div className="adaptive-section-header">
            <div>
              <p className="dashboard-eyebrow">Architecture</p>
              <h3>Centralized decision, input-specific execution</h3>
            </div>
            <button
              type="button"
              className="secondary-button adaptive-section-toggle"
              onClick={onToggleDecisionArchitectureSections}
              aria-expanded={adaptiveSectionExpanded.architecture}
              aria-label={adaptiveSectionExpanded.architecture ? 'Collapse section' : 'Expand section'}
              title={adaptiveSectionExpanded.architecture ? 'Collapse' : 'Expand'}
            >
              <span className={`adaptive-section-toggle-icon ${adaptiveSectionExpanded.architecture ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
            </button>
          </div>
          {adaptiveSectionExpanded.architecture ? (
            <>
              <p>
                Future inputs should plug into the same adapter contract: produce a telemetry frame, request a pacing decision, then apply that decision
                through the input's playback engine.
              </p>
              <div className="adaptive-flow-row">
                <span>Input telemetry</span>
                <span>Adaptive controller</span>
                <span>Input adapter</span>
                <span>Playback behavior</span>
              </div>
            </>
          ) : null}
        </section>

        <section className="panel workspace-panel adaptive-adapters-panel">
          <div className="adaptive-section-header">
            <div>
              <p className="dashboard-eyebrow">Adapters</p>
              <h3>Execution strategies</h3>
              <p className="dashboard-meta">Select an input to focus its benchmark profile below.</p>
            </div>
            <button
              type="button"
              className="secondary-button adaptive-section-toggle"
              onClick={onToggleAdaptersSection}
              aria-expanded={adaptiveSectionExpanded.adapters}
              aria-label={adaptiveSectionExpanded.adapters ? 'Collapse section' : 'Expand section'}
              title={adaptiveSectionExpanded.adapters ? 'Collapse' : 'Expand'}
            >
              <span className={`adaptive-section-toggle-icon ${adaptiveSectionExpanded.adapters ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
            </button>
          </div>
          {adaptiveSectionExpanded.adapters ? (
            <div className="adaptive-adapter-grid">
              {adaptiveAdapters.map((adapter) => (
                <AdaptiveAdapterCard
                  key={adapter.inputMode}
                  adapter={adapter}
                  active={latestSession?.inputMode === adapter.inputMode}
                  selected={selectedBenchmarkInputMode === mapSessionInputMode(adapter.inputMode)}
                  onOpen={() => onOpenAdapter(adapter.inputMode)}
                />
              ))}
            </div>
          ) : null}
        </section>

        <section className="panel workspace-panel adaptive-summary-panel">
          <div className="adaptive-section-header">
            <div>
              <p className="dashboard-eyebrow">Session</p>
              <h3>Most recent run</h3>
            </div>
            <button
              type="button"
              className="secondary-button adaptive-section-toggle"
              onClick={onToggleLatestSections}
              aria-expanded={adaptiveSectionExpanded.latest}
              aria-label={adaptiveSectionExpanded.latest ? 'Collapse section' : 'Expand section'}
              title={adaptiveSectionExpanded.latest ? 'Collapse' : 'Expand'}
            >
              <span className={`adaptive-section-toggle-icon ${adaptiveSectionExpanded.latest ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
            </button>
          </div>
          {adaptiveSectionExpanded.latest ? (
            latestSession ? (
              <div className="bottom-summary-grid">
                <div className="metric" aria-label={`Session: ${latestSession.name || 'Untitled'}`}>
                  <span>Session</span>
                  <strong>{latestSession.name || 'Untitled'}</strong>
                </div>
                <div className="metric" aria-label={`Input mode: ${formatSessionInputMode(latestSession.inputMode)}`}>
                  <span>Input mode</span>
                  <strong>{formatSessionInputMode(latestSession.inputMode)}</strong>
                </div>
                <div className="metric" aria-label={`Adapter: ${latestInputAdapter?.adapter ?? 'Not set'}`}>
                  <span>Adapter</span>
                  <strong>{latestInputAdapter?.adapter ?? 'Not set'}</strong>
                </div>
                <div className="metric" aria-label={`Updated: ${new Date(latestSession.updatedAt).toLocaleString()}`}>
                  <span>Updated</span>
                  <strong>{new Date(latestSession.updatedAt).toLocaleString()}</strong>
                </div>
                <div className="metric" aria-label={`Duration: ${formatSessionPlaybackDuration(latestSession)}`}>
                  <span>Duration</span>
                  <strong>{formatSessionPlaybackDuration(latestSession)}</strong>
                </div>
                <div
                  className="metric"
                  title={buildSessionScoreHelpText(latestSession.metrics)}
                  aria-label={`Score: ${String(latestSession.metrics.score)}. ${buildSessionScoreHelpText(latestSession.metrics)}`}
                >
                  <span>Score</span>
                  <strong>{String(latestSession.metrics.score)}</strong>
                </div>
                <div className="metric" aria-label={`Points: ${formatSessionPointsForSession(latestSession.metrics.points, latestSession)}`}>
                  <span>Points</span>
                  <strong>{formatSessionPointsForSession(latestSession.metrics.points, latestSession)}</strong>
                </div>
              </div>
            ) : (
              <p className="hint">No session data available yet.</p>
            )
          ) : null}
        </section>
        {latestSession ? (
          <section className="panel workspace-panel adaptive-metrics-panel">
            <div className="adaptive-section-header">
              <div>
                <p className="dashboard-eyebrow">Live state</p>
                <h3>Latest pacing snapshot</h3>
                <p className="dashboard-meta">Most recent metrics computed from the stored session.</p>
              </div>
              <button
                type="button"
                className="secondary-button adaptive-section-toggle"
                onClick={onToggleLatestSections}
                aria-expanded={adaptiveSectionExpanded.live}
                aria-label={adaptiveSectionExpanded.live ? 'Collapse section' : 'Expand section'}
                title={adaptiveSectionExpanded.live ? 'Collapse' : 'Expand'}
              >
                <span className={`adaptive-section-toggle-icon ${adaptiveSectionExpanded.live ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
              </button>
            </div>
            {adaptiveSectionExpanded.live ? (
              <>
                <div className="bottom-summary-grid">
                  <div className="metric" aria-label={`Mode: ${latestAdaptiveMode}`}>
                    <span>Mode</span>
                    <strong>{latestAdaptiveMode}</strong>
                  </div>
                  <div className="metric" aria-label={`Rate: ${latestSession.metrics.rate.toFixed(2)}x`}>
                    <span>Rate</span>
                    <strong>{`${latestSession.metrics.rate.toFixed(2)}x`}</strong>
                  </div>
                  <div className="metric" aria-label={`Lag: ${latestSession.metrics.lagSec.toFixed(2)}s`}>
                    <span>Lag</span>
                    <strong>{`${latestSession.metrics.lagSec.toFixed(2)}s`}</strong>
                  </div>
                  <div className="metric" aria-label={`Lag words: ${String(latestSession.metrics.lagWords)}`}>
                    <span>Lag words</span>
                    <strong>{String(latestSession.metrics.lagWords)}</strong>
                  </div>
                  <div className="metric" aria-label={`WPM: ${latestSession.metrics.wpm.toFixed(1)}`}>
                    <span>WPM</span>
                    <strong>{latestSession.metrics.wpm.toFixed(1)}</strong>
                  </div>
                  <div className="metric" aria-label={`Accuracy: ${latestSession.metrics.accuracy.toFixed(1)}%`}>
                    <span>Accuracy</span>
                    <strong>{`${latestSession.metrics.accuracy.toFixed(1)}%`}</strong>
                  </div>
                  <div
                    className="metric"
                    aria-label={`Trend: ${
                      latestSession.metrics.trend === 'improving'
                        ? 'Improving'
                        : latestSession.metrics.trend === 'declining'
                          ? 'Declining'
                          : 'Stable'
                    }`}
                  >
                    <span>Trend</span>
                    <strong>
                      {latestSession.metrics.trend === 'improving'
                        ? 'Improving'
                        : latestSession.metrics.trend === 'declining'
                          ? 'Declining'
                          : 'Stable'}
                    </strong>
                  </div>
                </div>
                <div className="today-chart-row">
                  <div className="today-chart-bar">
                    <span className="today-chart-label">Actions</span>
                    <div className="today-chart-track">
                      <div className="today-chart-fill" style={{ width: `${Math.min(100, latestSession.telemetry.actions.length * 4)}%` }} />
                    </div>
                  </div>
                  <div className="today-chart-bar">
                    <span className="today-chart-label">Telemetry samples</span>
                    <div className="today-chart-track">
                      <div className="today-chart-fill" style={{ width: `${Math.min(100, latestSession.telemetry.lagSeries.length)}%` }} />
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </section>
        ) : null}
        {latestSession ? (
          <section className="panel workspace-panel adaptive-telemetry-panel">
            <div className="adaptive-section-header">
              <div>
                <p className="dashboard-eyebrow">Diagnostics</p>
                <h3>Debug counters</h3>
                <p className="dashboard-meta">Most recent live debug counters, semantic pacing signals, and rate distribution.</p>
              </div>
              <button
                type="button"
                className="secondary-button adaptive-section-toggle"
                onClick={onToggleTelemetrySection}
                aria-expanded={adaptiveSectionExpanded.telemetry}
                aria-label={adaptiveSectionExpanded.telemetry ? 'Collapse section' : 'Expand section'}
                title={adaptiveSectionExpanded.telemetry ? 'Collapse' : 'Expand'}
              >
                <span className={`adaptive-section-toggle-icon ${adaptiveSectionExpanded.telemetry ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
              </button>
            </div>
            {adaptiveSectionExpanded.telemetry ? (
              <>
                <div className="today-summary-grid">
                  <div className="metric" aria-label={`Samples: ${String(countTelemetrySamples(latestSession.telemetry))}`}>
                    <span>Samples</span>
                    <strong>{String(countTelemetrySamples(latestSession.telemetry))}</strong>
                  </div>
                  <div className="metric" aria-label={`Actions: ${String(latestSession.telemetry.actions.length)}`}>
                    <span>Actions</span>
                    <strong>{String(latestSession.telemetry.actions.length)}</strong>
                  </div>
                  <div className="metric" aria-label={`Rate buckets: ${String(latestSession.telemetry.rateDistribution.length)}`}>
                    <span>Rate buckets</span>
                    <strong>{String(latestSession.telemetry.rateDistribution.length)}</strong>
                  </div>
                  <div className="metric" aria-label={`Repeat count: ${String(latestSession.telemetry.repeatCount)}`}>
                    <span>Repeat count</span>
                    <strong>{String(latestSession.telemetry.repeatCount)}</strong>
                  </div>
                  <div className="metric" aria-label={`TTS chunks: ${String(latestSession.telemetry.ttsChunks.length)}`}>
                    <span>TTS chunks</span>
                    <strong>{String(latestSession.telemetry.ttsChunks.length)}</strong>
                  </div>
                </div>
                <div className="today-summary-grid">
                  <div className="metric" aria-label={`Semantic cut penalty: ${adaptiveSemanticDebug.semanticCutPenalty.toFixed(2)}`}>
                    <span>Semantic cut penalty</span>
                    <strong>{adaptiveSemanticDebug.semanticCutPenalty.toFixed(2)}</strong>
                  </div>
                  <div className="metric" aria-label={`Unsafe pauses: ${String(adaptiveSemanticDebug.unsafePauseCount)}`}>
                    <span>Unsafe pauses</span>
                    <strong>{String(adaptiveSemanticDebug.unsafePauseCount)}</strong>
                  </div>
                  <div className="metric" aria-label={`Safe pauses: ${String(adaptiveSemanticDebug.safePauseCount)}`}>
                    <span>Safe pauses</span>
                    <strong>{String(adaptiveSemanticDebug.safePauseCount)}</strong>
                  </div>
                  <div className="metric" aria-label={`Deferred pauses: ${String(adaptiveSemanticDebug.deferredPauseCount)}`}>
                    <span>Deferred pauses</span>
                    <strong>{String(adaptiveSemanticDebug.deferredPauseCount)}</strong>
                  </div>
                  <div className="metric" aria-label={`Replay denied: ${String(adaptiveSemanticDebug.replayDeniedByBoundaryCount)}`}>
                    <span>Replay denied</span>
                    <strong>{String(adaptiveSemanticDebug.replayDeniedByBoundaryCount)}</strong>
                  </div>
                  <div className="metric" aria-label={`Avg completeness: ${adaptiveSemanticDebug.averageSemanticCompleteness.toFixed(2)}`}>
                    <span>Avg completeness</span>
                    <strong>{adaptiveSemanticDebug.averageSemanticCompleteness.toFixed(2)}</strong>
                  </div>
                  <div className="metric" aria-label={`Avg difficulty: ${adaptiveSemanticDebug.averagePhraseDifficulty.toFixed(2)}`}>
                    <span>Avg difficulty</span>
                    <strong>{adaptiveSemanticDebug.averagePhraseDifficulty.toFixed(2)}</strong>
                  </div>
                  <div className="metric" aria-label={`Execution fidelity: ${adaptiveSemanticDebug.inputExecutionFidelityScore.toFixed(2)}`}>
                    <span>Execution fidelity</span>
                    <strong>{adaptiveSemanticDebug.inputExecutionFidelityScore.toFixed(2)}</strong>
                  </div>
                  <div className="metric" aria-label={`Phrase index: ${adaptiveSemanticDebug.currentPhraseIndex}/${adaptiveSemanticDebug.totalSemanticPhrases}`}>
                    <span>Phrase index</span>
                    <strong>{`${adaptiveSemanticDebug.currentPhraseIndex}/${adaptiveSemanticDebug.totalSemanticPhrases}`}</strong>
                  </div>
                  <div className="metric" aria-label={`Phrase id: ${adaptiveSemanticDebug.currentPhraseId}`}>
                    <span>Phrase id</span>
                    <strong>{adaptiveSemanticDebug.currentPhraseId}</strong>
                  </div>
                  <div className="metric" aria-label={`Phrase preview: ${adaptiveSemanticDebug.currentPhraseTextPreview || 'n/a'}`}>
                    <span>Phrase preview</span>
                    <strong>{adaptiveSemanticDebug.currentPhraseTextPreview || 'n/a'}</strong>
                  </div>
                  <div className="metric" aria-label={`Phrase advances: ${String(adaptiveSemanticDebug.phraseAdvanceCount)}`}>
                    <span>Phrase advances</span>
                    <strong>{String(adaptiveSemanticDebug.phraseAdvanceCount)}</strong>
                  </div>
                  <div className="metric" aria-label={`Phrase replays: ${String(adaptiveSemanticDebug.phraseReplayCount)}`}>
                    <span>Phrase replays</span>
                    <strong>{String(adaptiveSemanticDebug.phraseReplayCount)}</strong>
                  </div>
                  <div className="metric" aria-label={`Last phrase reason: ${adaptiveSemanticDebug.lastPhraseAdvanceReason}`}>
                    <span>Last phrase reason</span>
                    <strong>{adaptiveSemanticDebug.lastPhraseAdvanceReason}</strong>
                  </div>
                </div>
                <div className="today-chart-row">
                  {latestSession.telemetry.rateDistribution.map((entry) => (
                    <div key={entry.rate} className="today-chart-bar">
                      <span className="today-chart-label">{entry.rate.toFixed(2)}x</span>
                      <div className="today-chart-track">
                        <div
                          className="today-chart-fill"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (entry.seconds /
                                  Math.max(
                                    1,
                                    latestSession.telemetry.rateDistribution.reduce((sum, next) => sum + next.seconds, 0),
                                  )) *
                                  100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        ) : null}
      </div>
    </details>
  );
}
