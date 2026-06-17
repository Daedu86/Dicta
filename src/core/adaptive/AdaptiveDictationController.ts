import type { AdaptivePacingInput, PacingDecision } from './types';
import { decideAdaptiveDictationController } from './adaptiveDictationControllerDecision';
import { AdaptiveDictationControllerState } from './adaptiveDictationControllerState';

export class AdaptiveDictationController {
  private readonly state = new AdaptiveDictationControllerState();

  decide(input: AdaptivePacingInput): PacingDecision {
    return decideAdaptiveDictationController(input, this.state);
  }
}
