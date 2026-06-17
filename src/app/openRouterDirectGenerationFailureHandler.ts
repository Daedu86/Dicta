import type { InputMode } from '../core/adaptive/types';
import type { BenchmarkLanguageButton } from '../components/openrouter/types';
import { resolveOpenRouterDirectGenerationFailure } from './openRouterGenerationFailurePolicy';
import type {
  GenerateOpenRouterDirectSessionOptions,
  UseOpenRouterDirectGenerationRunnerOptions,
} from './openRouterDirectGenerationRunnerTypes';

type HandleOpenRouterDirectGenerationFailureArgs = Pick<
  GenerateOpenRouterDirectSessionOptions,
  'slotLabel' | 'displayLabel'
> &
  Pick<
    UseOpenRouterDirectGenerationRunnerOptions,
    'recordOpenRouterGenerationFailure' | 'createOpenRouterErrorSession' | 'setOpenRouterError'
  > & {
    err: unknown;
    model: string;
    inputMode: InputMode;
    language: BenchmarkLanguageButton;
    generationStartedAt: string;
  };

export function resolveOpenRouterDirectGenerationErrorMessage(err: unknown): string {
  if (err instanceof TypeError) {
    return 'Failed to reach OpenRouter endpoint. Refresh the page and try a free model such as openrouter/free.';
  }

  if (err instanceof Error) {
    return err.message;
  }

  return 'OpenRouter generation failed.';
}

export function handleOpenRouterDirectGenerationFailure({
  err,
  slotLabel,
  displayLabel,
  model,
  inputMode,
  language,
  generationStartedAt,
  recordOpenRouterGenerationFailure,
  createOpenRouterErrorSession,
  setOpenRouterError,
}: HandleOpenRouterDirectGenerationFailureArgs): void {
  const message = resolveOpenRouterDirectGenerationErrorMessage(err);
  const failure = resolveOpenRouterDirectGenerationFailure({
    slotLabel,
    displayLabel,
    model,
    startedAt: generationStartedAt,
    message,
  });

  recordOpenRouterGenerationFailure(failure.notice);
  if (failure.createPersistentErrorSession) {
    createOpenRouterErrorSession(
      {
        slotLabel,
        inputMode,
        language,
        message,
      },
      { navigateToLeaderboard: false },
    );
    return;
  }

  if (failure.openRouterErrorMessage) {
    setOpenRouterError(failure.openRouterErrorMessage);
  }
}
