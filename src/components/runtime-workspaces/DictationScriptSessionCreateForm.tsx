import type {
  DictationScriptPreview,
  DictationScriptValidation,
  MetricComponentType,
  SessionQuotaStatus,
} from './SessionCreateCardTypes';
import { DictationScriptValidationFeedback } from './DictationScriptValidationFeedback';

type DictationScriptSessionCreateFormProps = {
  dictationScriptJson: string;
  dictationScriptValidation: DictationScriptValidation | null;
  validatedDictationScript: DictationScriptPreview | null;
  sessionQuotaStatus: SessionQuotaStatus;
  onDictationScriptJsonChange: (value: string) => void;
  onValidateScriptImport: () => void;
  onCreateSessionFromDictationScript: () => void;
  MetricComponent: MetricComponentType;
};

export function DictationScriptSessionCreateForm({
  dictationScriptJson,
  dictationScriptValidation,
  validatedDictationScript,
  sessionQuotaStatus,
  onDictationScriptJsonChange,
  onValidateScriptImport,
  onCreateSessionFromDictationScript,
  MetricComponent,
}: DictationScriptSessionCreateFormProps) {
  return (
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
      <DictationScriptValidationFeedback
        dictationScriptValidation={dictationScriptValidation}
        MetricComponent={MetricComponent}
      />
    </div>
  );
}
