import { createTtsSessionSubmitAction } from '../src/app/useTtsSessionSubmitAction';
import type { TtsSessionSubmitActionOptions } from './useTtsSessionSubmitActionOptions';

export function submitTtsAttempt(options: TtsSessionSubmitActionOptions, attempt: string): void {
  createTtsSessionSubmitAction(options)(attempt);
}
