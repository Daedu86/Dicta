import type { ReactElement } from 'react';

type SessionSource = 'plainText' | 'dictationScript';

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
  onCreateSessionWithMode: (inputMode: 'input2' | 'input3' | 'input4') => void;
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
            <button
              type="button"
              className="secondary-button"
              onClick={() => onCreateSessionWithMode('input3')}
              disabled={!canCreateSessionFromDialog || !localDevFeaturesAvailable}
              title={
                sessionQuotaStatus.blocked
                  ? sessionQuotaStatus.message
                  : localDevFeaturesAvailable
                    ? 'Create a local Kokoro session.'
                    : 'Kokoro is local-only and unavailable in the Vercel build.'
              }
            >
              Input # 3 - Kokoro TTS Local
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onCreateSessionWithMode('input4')}
              disabled={!canCreateSessionFromDialog || !localDevFeaturesAvailable}
              title={
                sessionQuotaStatus.blocked
                  ? sessionQuotaStatus.message
                  : localDevFeaturesAvailable
                  ? 'Create a local CosyVoice2 cache session.'
                  : 'Input #4 cache generation is local-only and not part of the Vercel build.'
              }
            >
              Input # 4 - CosyVoice2 Cache
            </button>
          </div>
          {!localDevFeaturesAvailable ? (
            <p className="session-create-hint">Hosted Vercel builds support Input #2. Kokoro and Input #4 remain local desktop workflows.</p>
          ) : null}
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
              placeholder='{"title":"Generated Dictation","language":"en","inputMode":"kokoro","phrases":[...]}'
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
