import type { ComponentType, KeyboardEvent } from 'react';
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

type RuntimeMetricsPanelProps = {
  controllerState: ControlAction;
  rate: number;
  lagSec: number;
  lagWords: number;
  wpm: number;
  accuracy: number;
};

type MetricProps = {
  label: string;
  value: string;
  title?: string;
};

type HelpIconProps = {
  tooltip: string;
  ariaLabel?: string;
};

type KokoroPracticeCardProps = {
  keyboardProfileLabel: string | null;
  keyboardProfile: KeyboardProfile;
  kokoroStatus: TtsStatus;
  kokoroHasText: boolean;
  kokoroEnabled: boolean;
  kokoroPracticeText: string;
  activeSessionFinished: boolean;
  controllerState: ControlAction;
  rate: number;
  lagSec: number;
  lagWords: number;
  wpm: number;
  kokoroVisibleAccuracy: number;
  canSubmitKokoroSession: boolean;
  desktopOpenRouterGenerationButtons: TrainingGenerationButton[];
  openRouterAccessAllowed: boolean;
  sessionQuotaStatus: DictaSessionQuotaStatus;
  openRouterOfflineTitle: string;
  trainingSubmitMessage: string;
  kokoroPracticeMatchedWords: number;
  kokoroPracticeExtraWords: number;
  kokoroPracticeMissing: number;
  kokoroPracticeWordsCount: number;
  localDevFeaturesAvailable: boolean;
  kokoroLanguageBlocked: boolean;
  hasKokoroCurrentChunk: boolean;
  RuntimeMetricsPanelComponent: ComponentType<RuntimeMetricsPanelProps>;
  MetricComponent: ComponentType<MetricProps>;
  HelpIconComponent: ComponentType<HelpIconProps>;
  onToggleKokoroEnabled: () => void;
  onPlayKokoro: () => void;
  onPauseKokoro: () => void;
  onResumeKokoro: () => void;
  onReplayKokoroPhrase: () => void;
  onRewindKokoroPhrase: () => void;
  onSlowKokoroPace: () => void;
  onFastKokoroPace: () => void;
  onResetKokoroPace: () => void;
  onKokoroPracticeChange: (value: string) => void;
  onKokoroPracticeKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmitKokoroSession: () => void;
  onOpenAdaptiveExportsForActiveInput: () => void;
  onOpenOpenRouterGenerateForActiveInput: () => void;
  onResetSession: () => void;
};

export function KokoroPracticeCard({
  keyboardProfileLabel,
  keyboardProfile,
  kokoroStatus,
  kokoroHasText,
  kokoroEnabled,
  kokoroPracticeText,
  activeSessionFinished,
  controllerState,
  rate,
  lagSec,
  lagWords,
  wpm,
  kokoroVisibleAccuracy,
  canSubmitKokoroSession,
  desktopOpenRouterGenerationButtons,
  openRouterAccessAllowed,
  sessionQuotaStatus,
  openRouterOfflineTitle,
  trainingSubmitMessage,
  kokoroPracticeMatchedWords,
  kokoroPracticeExtraWords,
  kokoroPracticeMissing,
  kokoroPracticeWordsCount,
  localDevFeaturesAvailable,
  kokoroLanguageBlocked,
  hasKokoroCurrentChunk,
  RuntimeMetricsPanelComponent,
  MetricComponent,
  HelpIconComponent,
  onToggleKokoroEnabled,
  onPlayKokoro,
  onPauseKokoro,
  onResumeKokoro,
  onReplayKokoroPhrase,
  onRewindKokoroPhrase,
  onSlowKokoroPace,
  onFastKokoroPace,
  onResetKokoroPace,
  onKokoroPracticeChange,
  onKokoroPracticeKeyDown,
  onSubmitKokoroSession,
  onOpenAdaptiveExportsForActiveInput,
  onOpenOpenRouterGenerateForActiveInput,
  onResetSession,
}: KokoroPracticeCardProps) {
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
      <div className="kokoro-toggle-row">
        <button
          type="button"
          className="secondary-button kokoro-toggle-button"
          onClick={onToggleKokoroEnabled}
          disabled={!localDevFeaturesAvailable}
          title={localDevFeaturesAvailable ? 'Toggle the local Kokoro service.' : 'Kokoro is local-only in the Vercel build.'}
        >
          {kokoroEnabled ? 'Turn Kokoro Off' : 'Turn Kokoro On'}
        </button>
        <span className={`kokoro-toggle-status ${kokoroEnabled ? 'kokoro-on' : 'kokoro-off'}`}>
          <span className="kokoro-toggle-dot" />
          {kokoroEnabled ? 'On' : 'Off'}
        </span>
      </div>
      <div className="kokoro-source-actions kokoro-source-actions-primary">
        <button
          type="button"
          className="secondary-button"
          onClick={onPlayKokoro}
          disabled={
            !localDevFeaturesAvailable ||
            !kokoroEnabled ||
            !kokoroHasText ||
            kokoroStatus === 'playing' ||
            kokoroLanguageBlocked
          }
        >
          Start
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onPauseKokoro}
          disabled={!localDevFeaturesAvailable || !kokoroEnabled || kokoroStatus !== 'playing'}
        >
          Pause
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onResumeKokoro}
          disabled={!localDevFeaturesAvailable || !kokoroEnabled || kokoroStatus !== 'paused'}
        >
          Resume
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onReplayKokoroPhrase}
          disabled={!localDevFeaturesAvailable || !hasKokoroCurrentChunk}
        >
          Replay phrase
        </button>
      </div>
      <div className="kokoro-source-actions kokoro-source-actions-secondary">
        <button
          type="button"
          className="secondary-button"
          onClick={onRewindKokoroPhrase}
          disabled={!localDevFeaturesAvailable || !hasKokoroCurrentChunk}
        >
          Rewind
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onSlowKokoroPace}
          disabled={!localDevFeaturesAvailable}
        >
          Slower
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onFastKokoroPace}
          disabled={!localDevFeaturesAvailable}
        >
          Faster
        </button>
        <button type="button" className="secondary-button" onClick={onResetKokoroPace} disabled={!localDevFeaturesAvailable}>
          Reset pace
        </button>
      </div>
      <textarea
        value={kokoroPracticeText}
        onChange={(e) => onKokoroPracticeChange(e.target.value)}
        onKeyDown={onKokoroPracticeKeyDown}
        placeholder={activeSessionFinished ? 'Session submitted.' : 'Type the Kokoro audio here...'}
        readOnly={activeSessionFinished}
        rows={12}
      />
      <RuntimeMetricsPanelComponent
        controllerState={controllerState}
        rate={rate}
        lagSec={lagSec}
        lagWords={lagWords}
        wpm={wpm}
        accuracy={kokoroVisibleAccuracy}
      />
      <div className="tts-submit-row">
        <button type="button" onClick={onSubmitKokoroSession} disabled={!canSubmitKokoroSession}>
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
            {button.helpText ? <HelpIconComponent tooltip={button.helpText} ariaLabel={`Help for ${button.label}`} /> : null}
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
          {trainingSubmitMessage || 'Kokoro attempt submitted. Typing is locked until reset.'}
        </p>
      ) : null}
      <div className="tts-practice-summary">
        <MetricComponent label="Correct" value={String(kokoroPracticeMatchedWords)} />
        <MetricComponent label="Wrong" value={String(kokoroPracticeExtraWords)} />
        <MetricComponent label="Missing" value={String(kokoroPracticeMissing)} />
        <MetricComponent label="Words typed" value={String(kokoroPracticeWordsCount)} />
      </div>
    </section>
  );
}
