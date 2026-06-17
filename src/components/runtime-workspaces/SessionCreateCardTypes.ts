import type { ReactElement } from 'react';

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
