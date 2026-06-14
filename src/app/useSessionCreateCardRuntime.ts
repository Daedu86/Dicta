import { useSessionCreateCardProps } from './useSessionCreateCardProps';
import { Metric } from '../components/shared/Metric';

type SessionCreateCardPropsArgs = Parameters<typeof useSessionCreateCardProps>[0];

type UseSessionCreateCardRuntimeArgs = {
  sessionCreationSource: SessionCreateCardPropsArgs['sessionCreationSource'];
  sessionCreationName: SessionCreateCardPropsArgs['sessionCreationName'];
  sessionQuotaStatus: SessionCreateCardPropsArgs['sessionQuotaStatus'];
  localDevFeaturesAvailable: SessionCreateCardPropsArgs['localDevFeaturesAvailable'];
  allowDictationScriptCreation: SessionCreateCardPropsArgs['allowDictationScriptCreation'];
  dictationScriptJson: SessionCreateCardPropsArgs['dictationScriptJson'];
  dictationScriptValidation: SessionCreateCardPropsArgs['dictationScriptValidation'];
  changeSessionCreationSource: SessionCreateCardPropsArgs['onSessionCreationSourceChange'];
  setSessionCreationName: SessionCreateCardPropsArgs['onSessionCreationNameChange'];
  createSessionWithMode: SessionCreateCardPropsArgs['onCreateSessionWithMode'];
  changeDictationScriptJson: SessionCreateCardPropsArgs['onDictationScriptJsonChange'];
  validateScriptImport: SessionCreateCardPropsArgs['onValidateScriptImport'];
  createSessionFromDictationScript: SessionCreateCardPropsArgs['onCreateSessionFromDictationScript'];
  cancelSessionCreation: SessionCreateCardPropsArgs['onCancel'];
};

export function useSessionCreateCardRuntime({
  sessionCreationSource,
  sessionCreationName,
  sessionQuotaStatus,
  localDevFeaturesAvailable,
  allowDictationScriptCreation,
  dictationScriptJson,
  dictationScriptValidation,
  changeSessionCreationSource,
  setSessionCreationName,
  createSessionWithMode,
  changeDictationScriptJson,
  validateScriptImport,
  createSessionFromDictationScript,
  cancelSessionCreation,
}: UseSessionCreateCardRuntimeArgs) {
  const sessionCreationNameTrimmed = sessionCreationName.trim();
  const canCreateSessionFromDialog = sessionCreationNameTrimmed.length > 0 && !sessionQuotaStatus.blocked;
  const validatedDictationScript = dictationScriptValidation?.ok ? dictationScriptValidation.script : null;

  const sessionCreateCardProps = useSessionCreateCardProps({
    sessionCreationSource,
    sessionCreationName,
    sessionQuotaStatus,
    canCreateSessionFromDialog,
    localDevFeaturesAvailable,
    allowDictationScriptCreation,
    dictationScriptJson,
    dictationScriptValidation,
    validatedDictationScript,
    onSessionCreationSourceChange: changeSessionCreationSource,
    onSessionCreationNameChange: setSessionCreationName,
    onCreateSessionWithMode: createSessionWithMode,
    onDictationScriptJsonChange: changeDictationScriptJson,
    onValidateScriptImport: validateScriptImport,
    onCreateSessionFromDictationScript: createSessionFromDictationScript,
    onCancel: cancelSessionCreation,
    MetricComponent: Metric,
  });

  return {
    sessionCreateCardProps,
  };
}
