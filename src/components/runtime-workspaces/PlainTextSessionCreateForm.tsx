import { BROWSER_TTS_SESSION_INPUT_MODE } from '../../core/sessionInputModes';
import type { BrowserTtsSessionInputMode as SupportedCreationInputMode } from '../../core/sessionInputModes';
import type { SessionQuotaStatus } from './SessionCreateCardTypes';

type PlainTextSessionCreateFormProps = {
  sessionCreationName: string;
  sessionQuotaStatus: SessionQuotaStatus;
  canCreateSessionFromDialog: boolean;
  onSessionCreationNameChange: (value: string) => void;
  onCreateSessionWithMode: (inputMode: SupportedCreationInputMode) => void;
};

export function PlainTextSessionCreateForm({
  sessionCreationName,
  sessionQuotaStatus,
  canCreateSessionFromDialog,
  onSessionCreationNameChange,
  onCreateSessionWithMode,
}: PlainTextSessionCreateFormProps) {
  return (
    <>
      <label>
        Session name
        <input
          value={sessionCreationName}
          onChange={(event) => onSessionCreationNameChange(event.target.value)}
          placeholder="My first session"
        />
      </label>
      <p className="session-create-hint">Enter a name first, then choose the setup.</p>
      <div className="session-create-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => onCreateSessionWithMode(BROWSER_TTS_SESSION_INPUT_MODE)}
          disabled={!canCreateSessionFromDialog}
          title={sessionQuotaStatus.blocked ? sessionQuotaStatus.message : undefined}
        >
          Input # 2 - Text to Speech (TTS)
        </button>
      </div>
    </>
  );
}
