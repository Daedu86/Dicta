import type { ReactElement } from 'react';
import type { BrowserTtsSessionInputMode as SupportedCreationInputMode } from '../../core/sessionInputModes';

export type SessionSource = 'plainText' | 'dictationScript';

export type SessionQuotaStatus = {
  blocked: boolean;
  message: string;
  limit: number | null;
  used: number;
};

export type DictationScriptPhrase = {
  id: string;
  text: string;
};

export type DictationScriptPreview = {
  title: string;
  language: string;
  inputMode: string;
  difficulty: string;
  phrases: DictationScriptPhrase[];
  estimatedDurationSec: number;
};

export type DictationScriptValidation =
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

export type MetricComponentType = (props: { label: string; value: string; title?: string }) => ReactElement;

export type SessionCreateCardProps = {
  sessionCreationSource: SessionSource;
  sessionCreationName: string;
  sessionQuotaStatus: SessionQuotaStatus;
  canCreateSessionFromDialog: boolean;
  localDevFeaturesAvailable: boolean;
  allowDictationScriptCreation: boolean;
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
