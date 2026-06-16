import type { InputMode } from '../core/adaptive/types';
import type { SessionInputMode } from '../core/sessionInputModes';
import type { BenchmarkLanguageButton } from '../components/openrouter/types';
import { mapSessionInputMode } from './appRuntimeHelpers';

export const OPEN_ROUTER_GENERATE_WORKSPACE_OFFLINE_MESSAGE =
  'OpenRouter needs internet. You can keep practicing offline; results are saved on this device and will sync when the connection returns.';

export type OpenRouterGenerateWorkspacePlan =
  | { status: 'noop'; reason: 'missing-active-session' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      inputMode: InputMode;
      language: BenchmarkLanguageButton;
      offlineErrorMessage: string | null;
    };

type BuildOpenRouterGenerateWorkspacePlanArgs = {
  activeSessionInputMode: SessionInputMode | null;
  allowCustomSessionGeneration: boolean;
  openRouterAccessAllowed: boolean;
  openRouterAccessMessage: string;
  isOnline: boolean;
  dictaLanguageView: BenchmarkLanguageButton;
};

export function buildOpenRouterGenerateWorkspacePlan({
  activeSessionInputMode,
  allowCustomSessionGeneration,
  openRouterAccessAllowed,
  openRouterAccessMessage,
  isOnline,
  dictaLanguageView,
}: BuildOpenRouterGenerateWorkspacePlanArgs): OpenRouterGenerateWorkspacePlan {
  if (!activeSessionInputMode) {
    return { status: 'noop', reason: 'missing-active-session' };
  }

  if (!allowCustomSessionGeneration) {
    return { status: 'error', message: 'Custom session generation is available to admins only.' };
  }

  if (!openRouterAccessAllowed) {
    return { status: 'error', message: openRouterAccessMessage };
  }

  return {
    status: 'ready',
    inputMode: mapSessionInputMode(activeSessionInputMode),
    language: dictaLanguageView,
    offlineErrorMessage: isOnline ? null : OPEN_ROUTER_GENERATE_WORKSPACE_OFFLINE_MESSAGE,
  };
}
