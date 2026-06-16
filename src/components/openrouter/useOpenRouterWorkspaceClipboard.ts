import type { InputLanguageBenchmarkMetrics } from '../../core/adaptive/types';

type UseOpenRouterWorkspaceClipboardArgs = {
  exportProfile: InputLanguageBenchmarkMetrics;
  setExportStatusMessage: (message: string) => void;
};

export function useOpenRouterWorkspaceClipboard({
  exportProfile,
  setExportStatusMessage,
}: UseOpenRouterWorkspaceClipboardArgs) {
  return async function copyToClipboard(label: string, text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setExportStatusMessage(`Copied: ${label} · ${exportProfile.inputMode}/${exportProfile.language}`);
    } catch {
      setExportStatusMessage(`Could not copy: ${label}.`);
    }
  };
}
