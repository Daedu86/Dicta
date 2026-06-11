import { useState } from 'react';
import type { InputMode } from '../core/adaptive/types';

export function useAdaptiveDiagnosticsUiState() {
  const [insightsDiagnosticInputMode, setInsightsDiagnosticInputMode] = useState<InputMode>('browser-tts');
  const [insightsDiagnosticMessage, setInsightsDiagnosticMessage] = useState('');
  const [insightsDiagnosticFallbackReport, setInsightsDiagnosticFallbackReport] = useState('');

  return {
    insightsDiagnosticInputMode,
    setInsightsDiagnosticInputMode,
    insightsDiagnosticMessage,
    setInsightsDiagnosticMessage,
    insightsDiagnosticFallbackReport,
    setInsightsDiagnosticFallbackReport,
  };
}
