import type { InputMode } from '../core/adaptive/types';
import type { SessionInputMode } from '../core/sessionInputModes';
import type { BenchmarkLanguageButton } from '../components/openrouter/types';
import { mapSessionInputMode } from './appRuntimeHelpers';

export const OPEN_ROUTER_DIRECT_GENERATION_OFFLINE_MESSAGE =
  'OpenRouter needs internet. You can keep practicing offline; results are saved on this device and will sync when the connection returns.';

export const OPEN_ROUTER_DIRECT_GENERATION_MODEL_REQUIRED_MESSAGE =
  'Set a default OpenRouter model before generating the next session.';

export type OpenRouterDirectGenerationStartPlan =
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      model: string;
      inputMode: InputMode;
      language: BenchmarkLanguageButton;
    };

type BuildOpenRouterDirectGenerationStartPlanArgs = {
  activeSessionInputMode: SessionInputMode | null;
  fallbackInputMode: InputMode;
  dictaLanguageView: BenchmarkLanguageButton;
  effectiveOpenRouterDefaultModel: string;
  isOnline: boolean;
};

export function buildOpenRouterDirectGenerationStartPlan({
  activeSessionInputMode,
  fallbackInputMode,
  dictaLanguageView,
  effectiveOpenRouterDefaultModel,
  isOnline,
}: BuildOpenRouterDirectGenerationStartPlanArgs): OpenRouterDirectGenerationStartPlan {
  if (!isOnline) {
    return { status: 'error', message: OPEN_ROUTER_DIRECT_GENERATION_OFFLINE_MESSAGE };
  }

  const model = effectiveOpenRouterDefaultModel.trim();
  const inputMode = activeSessionInputMode ? mapSessionInputMode(activeSessionInputMode) : fallbackInputMode;
  const language = dictaLanguageView;

  if (!model) {
    return { status: 'error', message: OPEN_ROUTER_DIRECT_GENERATION_MODEL_REQUIRED_MESSAGE };
  }

  return {
    status: 'ready',
    model,
    inputMode,
    language,
  };
}
