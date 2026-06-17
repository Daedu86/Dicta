import { DictationScriptSessionCreateForm } from './DictationScriptSessionCreateForm';
import { PlainTextSessionCreateForm } from './PlainTextSessionCreateForm';
import { SessionCreateQuotaHint } from './SessionCreateQuotaHint';
import { SessionSourceSelect } from './SessionSourceSelect';
import type { SessionCreateCardProps } from './SessionCreateCardTypes';

export type { SessionCreateCardProps } from './SessionCreateCardTypes';

export function SessionCreateCard({
  sessionCreationSource,
  sessionCreationName,
  sessionQuotaStatus,
  canCreateSessionFromDialog,
  localDevFeaturesAvailable,
  allowDictationScriptCreation,
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

  const shouldShowPlainTextForm = sessionCreationSource === 'plainText' || !allowDictationScriptCreation;

  return (
    <div className="sidebar-card session-create-card brand-session-create-card" role="dialog" aria-label="Choose input">
      <p className="sidebar-copy">Choose the source for this new session.</p>
      <SessionCreateQuotaHint sessionQuotaStatus={sessionQuotaStatus} />
      <SessionSourceSelect
        sessionCreationSource={sessionCreationSource}
        allowDictationScriptCreation={allowDictationScriptCreation}
        onSessionCreationSourceChange={onSessionCreationSourceChange}
      />
      {shouldShowPlainTextForm ? (
        <PlainTextSessionCreateForm
          sessionCreationName={sessionCreationName}
          sessionQuotaStatus={sessionQuotaStatus}
          canCreateSessionFromDialog={canCreateSessionFromDialog}
          onSessionCreationNameChange={onSessionCreationNameChange}
          onCreateSessionWithMode={onCreateSessionWithMode}
        />
      ) : (
        <DictationScriptSessionCreateForm
          dictationScriptJson={dictationScriptJson}
          dictationScriptValidation={dictationScriptValidation}
          validatedDictationScript={validatedDictationScript}
          sessionQuotaStatus={sessionQuotaStatus}
          onDictationScriptJsonChange={onDictationScriptJsonChange}
          onValidateScriptImport={onValidateScriptImport}
          onCreateSessionFromDictationScript={onCreateSessionFromDictationScript}
          MetricComponent={MetricComponent}
        />
      )}
      <button type="button" className="text-button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
