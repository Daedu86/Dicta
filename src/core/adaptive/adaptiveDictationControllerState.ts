import type { AdaptiveControllerFrameState } from './adaptiveDictationControllerFrames';

export class AdaptiveDictationControllerState {
  private previousRate = 1;
  private frameState: AdaptiveControllerFrameState = {
    struggleFrames: 0,
    recoveryFrames: 0,
    supportFrames: 0,
    balancedFrames: 0,
    catchUpFrames: 0,
    flowLockFrames: 0,
  };

  getPreviousRate(): number {
    return this.previousRate;
  }

  setPreviousRate(previousRate: number): void {
    this.previousRate = previousRate;
  }

  getFrameState(): AdaptiveControllerFrameState {
    return { ...this.frameState };
  }

  applyFrameState(frameState: AdaptiveControllerFrameState): void {
    this.frameState = { ...frameState };
  }

  applyWarmupSupportFrame(playbackRate: number): void {
    this.previousRate = playbackRate;
    this.frameState = {
      ...this.frameState,
      struggleFrames: Math.max(this.frameState.struggleFrames, 1),
      recoveryFrames: 0,
      supportFrames: this.frameState.supportFrames + 1,
      balancedFrames: 0,
    };
  }
}
