import type { ReactElement } from 'react';

type SessionSource = 'plainText' | 'dictationScript';
// Persisted legacy storage value for Browser TTS sessions. Adaptive/script profiles use `browser-tts`.
type SupportedCreationInputMode = 'input2';

type SessionQuotaStatus = {
  blocked: boolean;
  message: string;
  limit: number | null;
  used: number;
};

type DictationScriptPhrase = {
  id: string;
  text: string;
};

type DictationScriptPreview = {
  title: string;
  language: string;
  inputMode: string;
  difficulty: string;
  phrases: DictationScriptPhrase[];
  estimatedDurationSec: number;
};

type DictationScriptValidation =
  | {
      ok: true;
      script: DictationScriptPreview;
      errors: [];
    }
  | {
      ok: false;
      script: null;
      errors: string[];
    };

type MetricComponentType = (props: { label: string; value: string; title?: string }) => ReactElement;

type SessionCreateCardProps = {
  sessionCreationSource: SessionSource;
  sessionCreationName: string;
  sessionQuotaStatus: SessionQuotaStatus;
  canCreateSessionFromDialog: boolean;
  localDevFeaturesAvailable: boolean;
  dictationScriptJson: string;
  dictationScriptValidation: DictationScriptValidation | null;
  validatedDictationScript: DictationScriptPreview | null;
  onSessionCreationSourceChange: (value: SessionSource) => void;
  onSessionCreationNameChange: (value: string) => void;
  onCreateSessionWithMode: (inputMode: SupportedCreationInputMode) => void;
  onDictationScriptJsonChange: (value: string) => void;
  onValidateScriptImport: () => void;
  onCreateSessionFromDictationScript: () => void;
  onCancel: () => void;
  MetricComponent: MetricComponentType;
};

export function SessionCreateCard({
  sessionCreationSource,
  sessionCreationName,
  sessionQuotaStatus,
  canCreateSessionFromDialog,
  localDevFeaturesAvailable,
  dictationScriptJson,
  dictationScriptValidation,
  validatedDictationScript,
  onSessionCreationSourceChange,
  onSessionCreationNameChange,
  onCreateSessionWithMode,
  onDictationScriptJsonChange,
  onValidateScriptImport,
  onCreateSessionFromDictationScript,
  onCancel,
  MetricComponent,
}: SessionCreateCardProps) {
  void localDevFeaturesAvailable;

  return (
    <div className="sidebar-card session-create-card brand-session-create-card" role="dialog" aria-label="Choose input">
      <p className="sidebar-copy">Choose the source for this new session.</p>
      {sessionQuotaStatus.limit !== null ? (
        <p className={sessionQuotaStatus.blocked ? 'error' : 'session-create-hint'}>
          {sessionQuotaStatus.blocked
            ? sessionQuotaStatus.message
            : `Sessions available: ${sessionQuotaStatus.used}/${sessionQuotaStatus.limit}.`}
        </p>
      ) : null}
      <label>
        Session Source
        <select
          value={sessionCreationSource}
          onChange={(event) => {
            onSessionCreationSourceChange(event.target.value as SessionSource);
          }}
        >
          <option value="plainText">Plain Text</option>
          <option value="dictationScript">DictationScript JSON</option>
        </select>
      </label>
      {sessionCreationSource === 'plainText' ? (
        <>
          <label>
            Session name
            <input
              value={sessionCreationName}
              onChange={(e) => onSessionCreationNameChange(e.target.value)}
              placeholder="My first session"
            />
          </label>
          <p className="session-create-hint">Enter a name first, then choose the setup.</p>
          <div className="session-create-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => onCreateSessionWithMode('input2')}
              disabled={!canCreateSessionFromDialog}
              title={sessionQuotaStatus.blocked ? sessionQuotaStatus.message : undefined}
            >
              Input # 2 - Text to Speech (TTS)
            </button>
          </div>
        </>
      ) : (
        <div className="session-script-import">
          <label>
            DictationScript JSON
            <textarea
              value={dictationScriptJson}
              onChange={(event) => {
                onDictationScriptJsonChange(event.target.value);
              }}
              rows={10}
              placeholder='{"title":"Generated Dictation","language":"de","inputMode":"browser-tts","phrases":[...]}'
            />
          </label>
          <div className="session-create-actions">
            <button type="button" className="secondary-button" onClick={onValidateScriptImport}>
              Validate Script
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onCreateSessionFromDictationScript}
              disabled={!validatedDictationScript || sessionQuotaStatus.blocked}
              title={sessionQuotaStatus.blocked ? sessionQuotaStatus.message : undefined}
            >
              Create Session
            </button>
          </div>
          {dictationScriptValidation ? (
            dictationScriptValidation.ok ? (
              <div className="script-preview">
                <p className="success">Script validated.</p>
                <div className="today-summary-grid">
                  <MetricComponent label="Title" value={dictationScriptValidation.script.title} />
                  <MetricComponent label="Language" value={dictationScriptValidation.script.language} />
                  <MetricComponent label="Input mode" value={dictationScriptValidation.script.inputMode} />
                  <MetricComponent label="Difficulty" value={dictationScriptValidation.script.difficulty} />
                  <MetricComponent label="Phrases" value={String(dictationScriptValidation.script.phrases.length)} />
                  <MetricComponent label="Duration" value={`${dictationScriptValidation.script.estimatedDurationSec}s`} />
                </div>
                <div className="script-phrase-preview">
                  {dictationScriptValidation.script.phrases.slice(0, 3).map((phrase) => (
                    <p key={phrase.id} className="hint">
                      {phrase.id}: {phrase.text.slice(0, 120)}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="error">
                {dictationScriptValidation.errors.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            )
          ) : null}
        </div>
      )}
      <button type="button" className="text-button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
