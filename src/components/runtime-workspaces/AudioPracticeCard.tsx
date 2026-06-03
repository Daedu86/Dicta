import type { ComponentType, KeyboardEvent } from 'react';
import type { ControlAction } from '../../types/dictation';

type ReadyChecklistItem = {
  label: string;
  ready: boolean;
};

type AudioTranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

type KeyboardProfile = 'es-virtual' | 'de-keyboard' | null;

type RuntimeMetricsPanelProps = {
  controllerState: ControlAction;
  rate: number;
  lagSec: number;
  lagWords: number;
  wpm: number;
  accuracy: number;
};

type AudioPracticeCardProps = {
  canStartSession: boolean;
  canPauseSession: boolean;
  canFinishSession: boolean;
  activeSessionFinished: boolean;
  readyChecklist: ReadyChecklistItem[];
  exportMessage: string;
  trainingSubmitMessage: string;
  activeTranscriptSegment: AudioTranscriptSegment | null;
  nextTranscriptSegment: AudioTranscriptSegment | null;
  transcriptPreview: string;
  keyboardProfileLabel: string | null;
  keyboardProfile: KeyboardProfile;
  inputText: string;
  controllerState: ControlAction;
  rate: number;
  lagSec: number;
  lagWords: number;
  wpm: number;
  visibleAccuracy: number;
  onStartSession: () => void;
  onPauseSession: () => void;
  onFinishSession: () => void;
  onResetSession: () => void;
  onTypingChange: (value: string) => void;
  onTypingKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  formatTimestamp: (seconds: number) => string;
  RuntimeMetricsPanelComponent: ComponentType<RuntimeMetricsPanelProps>;
};

export function AudioPracticeCard({
  canStartSession,
  canPauseSession,
  canFinishSession,
  activeSessionFinished,
  readyChecklist,
  exportMessage,
  trainingSubmitMessage,
  activeTranscriptSegment,
  nextTranscriptSegment,
  transcriptPreview,
  keyboardProfileLabel,
  keyboardProfile,
  inputText,
  controllerState,
  rate,
  lagSec,
  lagWords,
  wpm,
  visibleAccuracy,
  onStartSession,
  onPauseSession,
  onFinishSession,
  onResetSession,
  onTypingChange,
  onTypingKeyDown,
  formatTimestamp,
  RuntimeMetricsPanelComponent,
}: AudioPracticeCardProps) {
  return (
    <section className="panel workspace-panel accent-panel">
      <h2>How can I help you train today?</h2>
      <div className="panel composer-panel">
        <div className="controls">
          <button onClick={onStartSession} disabled={!canStartSession}>Start</button>
          <button onClick={onPauseSession} disabled={!canPauseSession}>Pause</button>
          <button onClick={onFinishSession} disabled={!canFinishSession}>Finish</button>
          <button onClick={onResetSession}>Reset</button>
        </div>
        <div className={`session-ready-banner ${canStartSession ? 'session-ready-banner-active' : ''}`} aria-live="polite">
          <strong>
            {activeSessionFinished
              ? 'Session finished'
              : canStartSession
                ? 'Session ready to start'
                : 'Session setup required'}
          </strong>
          <div className="session-ready-checklist">
            {readyChecklist.map((item) => (
              <span
                key={item.label}
                className={`session-ready-chip ${item.ready ? 'session-ready-chip-done' : 'session-ready-chip-pending'}`}
              >
                {item.ready ? '✓' : '○'} {item.label}
              </span>
            ))}
          </div>
        </div>
        {exportMessage ? <p className="success">{exportMessage}</p> : null}
        {activeSessionFinished ? (
          <p className="success">
            {trainingSubmitMessage || 'Attempt completed. Input is locked until you reset.'}
          </p>
        ) : null}
        {!activeSessionFinished && !canStartSession ? <p className="hint">Load audio and transcript to enable Start.</p> : null}
        <div className="typing-cue-stack">
          <div className="target target-active">
            <strong>{activeTranscriptSegment ? formatTimestamp(activeTranscriptSegment.start) : '--:--'}</strong>
            <span>{activeTranscriptSegment?.text || transcriptPreview || 'Load transcript to see target words.'}</span>
          </div>
          {nextTranscriptSegment ? (
            <div className="target target-next">
              <strong>{formatTimestamp(nextTranscriptSegment.start)}</strong>
              <span>{nextTranscriptSegment.text}</span>
            </div>
          ) : null}
        </div>
        {keyboardProfileLabel ? (
          <span className={`es-layout-indicator ${keyboardProfile === 'de-keyboard' ? 'de-layout-indicator' : ''}`}>
            {keyboardProfileLabel}
          </span>
        ) : null}
        <textarea
          value={inputText}
          onChange={(e) => onTypingChange(e.target.value)}
          onKeyDown={onTypingKeyDown}
          placeholder={activeSessionFinished ? 'Session finished.' : 'Type what you hear...'}
          readOnly={activeSessionFinished}
          rows={8}
        />
        <RuntimeMetricsPanelComponent
          controllerState={controllerState}
          rate={rate}
          lagSec={lagSec}
          lagWords={lagWords}
          wpm={wpm}
          accuracy={visibleAccuracy}
        />
      </div>
    </section>
  );
}
