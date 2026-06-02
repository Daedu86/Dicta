import type { KeyboardEvent } from 'react';
import type { DictaSessionQuotaStatus } from '../../core/appProfiles';
import type { ControlAction } from '../../types/dictation';

type TtsStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'finished';
type KeyboardProfile = 'es-virtual' | 'de-keyboard' | null;

type TrainingGenerationButton = {
  id: string;
  label: string;
  onClick: () => void;
  disabled: boolean;
  title: string;
  helpText?: string;
};

type BrowserTtsPracticeCardProps = {
  keyboardProfileLabel: string | null;
  keyboardProfile: KeyboardProfile;
  ttsStatus: TtsStatus;
  ttsHasText: boolean;
  ttsPracticeText: string;
  activeSessionFinished: boolean;
  controllerState: ControlAction;
  rate: number;
  lagSec: number;
  lagWords: number;
  wpm: number;
  ttsVisibleAccuracy: number;
  canSubmitTtsSession: boolean;
  desktopOpenRouterGenerationButtons: TrainingGenerationButton[];
  openRouterAccessAllowed: boolean;
  sessionQuotaStatus: DictaSessionQuotaStatus;
  openRouterOfflineTitle: string;
  trainingSubmitMessage: string;
  ttsPracticeMatchedWords: number;
  ttsPracticeExtraWords: number;
  ttsPracticeMissing: number;
  ttsPracticeWordsCount: number;
  onPlayTts: () => void;
  onPauseTts: () => void;
  onResumeTts: () => void;
  onStopTts: () => void;
  onTtsPracticeChange: (value: string) => void;
  onTtsPracticeKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmitTtsSession: () => void;
  onOpenAdaptiveExportsForActiveInput: () => void;
  onOpenOpenRouterGenerateForActiveInput: () => void;
  onResetSession: () => void;
};

function HelpIcon({ tooltip, ariaLabel = 'Help' }: { tooltip: string; ariaLabel?: string }) {
  return (
    <button
      type="button"
      className="help-icon"
      aria-label={ariaLabel}
      data-tooltip={tooltip}
      onClick={(event) => event.preventDefault()}
    >
      ?
    </button>
  );
}

function Metric({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="metric" title={title} aria-label={title ? `${label}: ${value}. ${title}` : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RuntimeMetricsPanel({
  controllerState,
  rate,
  lagSec,
  lagWords,
  wpm,
  accuracy,
}: {
  controllerState: ControlAction;
  rate: number;
  lagSec: number;
  lagWords: number;
  wpm: number;
  accuracy: number;
}) {
  return (
    <section className="runtime-metrics-panel" aria-label="Runtime metrics">
      <div className="bottom-summary-header">
        <h3>Runtime</h3>
      </div>
      <div className="runtime-metrics-grid">
        <Metric label="Controller" value={controllerState} />
        <Metric label="Rate" value={`${rate.toFixed(2)}x`} />
        <Metric label="Lag (sec)" value={lagSec.toFixed(2)} />
        <Metric label="Lag (words)" value={String(lagWords)} />
        <Metric label="WPM" value={wpm.toFixed(1)} />
        <Metric label="Accuracy" value={`${accuracy.toFixed(1)}%`} />
      </div>
    </section>
  );
}

export function BrowserTtsPracticeCard({
  keyboardProfileLabel,
  keyboardProfile,
  ttsStatus,
  ttsHasText,
  ttsPracticeText,
  activeSessionFinished,
  controllerState,
  rate,
  lagSec,
  lagWords,
  wpm,
  ttsVisibleAccuracy,
  canSubmitTtsSession,
  desktopOpenRouterGenerationButtons,
  openRouterAccessAllowed,
  sessionQuotaStatus,
  openRouterOfflineTitle,
  trainingSubmitMessage,
  ttsPracticeMatchedWords,
  ttsPracticeExtraWords,
  ttsPracticeMissing,
  ttsPracticeWordsCount,
  onPlayTts,
  onPauseTts,
  onResumeTts,
  onStopTts,
  onTtsPracticeChange,
  onTtsPracticeKeyDown,
  onSubmitTtsSession,
  onOpenAdaptiveExportsForActiveInput,
  onOpenOpenRouterGenerateForActiveInput,
  onResetSession,
}: BrowserTtsPracticeCardProps) {
  return (
    <section className="panel workspace-panel tts-practice-panel">
      <div className="typing-panel-header">
        <h3>Type what you hear</h3>
        {keyboardProfileLabel ? (
          <span className={`es-layout-indicator ${keyboardProfile === 'de-keyboard' ? 'de-layout-indicator' : ''}`}>
            {keyboardProfileLabel}
          </span>
        ) : null}
      </div>
      <div className="tts-source-actions">
        <button type="button" className="secondary-button" onClick={onPlayTts} disabled={!ttsHasText || ttsStatus === 'playing'}>
          Play
        </button>
        <button type="button" className="secondary-button" onClick={onPauseTts} disabled={ttsStatus !== 'playing'}>
          Pause
        </button>
        <button type="button" className="secondary-button" onClick={onResumeTts} disabled={ttsStatus !== 'paused'}>
          Resume
        </button>
        <button type="button" className="secondary-button" onClick={onStopTts} disabled={ttsStatus === 'idle'}>
          Stop
        </button>
      </div>
      <textarea
        value={ttsPracticeText}
        onChange={(e) => onTtsPracticeChange(e.target.value)}
        onKeyDown={onTtsPracticeKeyDown}
        placeholder={activeSessionFinished ? 'Session submitted.' : 'Type the TTS text here...'}
        readOnly={activeSessionFinished}
        rows={12}
      />
      <RuntimeMetricsPanel
        controllerState={controllerState}
        rate={rate}
        lagSec={lagSec}
        lagWords={lagWords}
        wpm={wpm}
        accuracy={ttsVisibleAccuracy}
      />
      <div className="tts-submit-row">
        <button type="button" onClick={onSubmitTtsSession} disabled={!canSubmitTtsSession}>
          Submit statistics
        </button>
        <button type="button" className="secondary-button" onClick={onOpenAdaptiveExportsForActiveInput}>
          Adaptive Pace Layer
        </button>
        {desktopOpenRouterGenerationButtons.map((button) => (
          <div key={button.id} className="tts-generation-button-row">
            <button
              type="button"
              className="secondary-button"
              onClick={button.onClick}
              disabled={button.disabled}
              title={button.title}
            >
              {button.label}
            </button>
            {button.helpText ? <HelpIcon tooltip={button.helpText} ariaLabel={`Help for ${button.label}`} /> : null}
          </div>
        ))}
        {openRouterAccessAllowed ? (
          <button
            type="button"
            className="secondary-button"
            onClick={onOpenOpenRouterGenerateForActiveInput}
            disabled={sessionQuotaStatus.blocked}
            title={sessionQuotaStatus.blocked ? sessionQuotaStatus.message : openRouterOfflineTitle || 'Open the existing OpenRouter custom generation workspace.'}
          >
            New Custom Session
          </button>
        ) : null}
        <button type="button" className="secondary-button" onClick={onResetSession}>
          Reset
        </button>
      </div>
      {activeSessionFinished ? (
        <p className="success">
          {trainingSubmitMessage || 'TTS attempt submitted. Typing is locked until reset.'}
        </p>
      ) : null}
      <div className="tts-practice-summary">
        <Metric label="Correct" value={String(ttsPracticeMatchedWords)} />
        <Metric label="Wrong" value={String(ttsPracticeExtraWords)} />
        <Metric label="Missing" value={String(ttsPracticeMissing)} />
        <Metric label="Words typed" value={String(ttsPracticeWordsCount)} />
      </div>
    </section>
  );
}
