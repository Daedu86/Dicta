export type KokoroPlaybackState = 'playing' | 'intentional-pause' | 'replaying' | 'buffering' | 'complete';

interface PlaybackQueueItem {
  buffer: AudioBuffer;
  phraseId: string;
  playbackRate: number;
}

interface KokoroPlaybackQueueOptions {
  onStateChange?: (state: KokoroPlaybackState) => void;
}

export class KokoroPlaybackQueue {
  private context: AudioContext;
  private queue: PlaybackQueueItem[] = [];
  private state: KokoroPlaybackState = 'buffering';
  private sourceNode: AudioBufferSourceNode | null = null;
  private scheduledTimeout: number | null = null;

  constructor(options: KokoroPlaybackQueueOptions = {}) {
    this.context = new AudioContext();
    this.onStateChange = options.onStateChange;
  }

  public onStateChange: ((state: KokoroPlaybackState) => void) | undefined;

  enqueue(item: PlaybackQueueItem): void {
    this.queue.push(item);
    if (this.state === 'buffering' || this.state === 'complete') {
      this.playNext();
    }
  }

  async playNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.updateState('buffering');
      return;
    }

    const next = this.queue.shift();
    if (!next) {
      this.updateState('buffering');
      return;
    }

    this.updateState('playing');
    this.sourceNode?.stop();
    this.sourceNode = this.context.createBufferSource();
    this.sourceNode.buffer = next.buffer;
    this.sourceNode.playbackRate.value = next.playbackRate;
    this.sourceNode.connect(this.context.destination);
    this.sourceNode.onended = () => {
      this.sourceNode = null;
      this.playNext();
    };
    this.sourceNode.start();
  }

  async pause(durationMs: number): Promise<void> {
    this.updateState('intentional-pause');
    this.sourceNode?.stop();
    if (this.scheduledTimeout !== null) {
      window.clearTimeout(this.scheduledTimeout);
    }
    this.scheduledTimeout = window.setTimeout(() => {
      this.scheduledTimeout = null;
      this.playNext();
    }, durationMs);
  }

  replayCurrent(buffer: AudioBuffer, playbackRate: number): void {
    this.updateState('replaying');
    this.sourceNode?.stop();
    this.queue.unshift({ buffer, phraseId: 'replay', playbackRate });
    this.playNext();
  }

  stop(): void {
    this.sourceNode?.stop();
    this.queue = [];
    this.updateState('complete');
  }

  getState(): KokoroPlaybackState {
    return this.state;
  }

  private updateState(state: KokoroPlaybackState): void {
    this.state = state;
    this.onStateChange?.(state);
  }
}
