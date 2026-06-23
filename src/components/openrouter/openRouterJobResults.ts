import { isTransientOpenRouterGenerationError } from '../../core/adaptive/openRouterFallbackScript';

export function shouldCreatePersistentGenerationErrorSession(message: string): boolean {
  return !isTransientOpenRouterGenerationError(message);
}
