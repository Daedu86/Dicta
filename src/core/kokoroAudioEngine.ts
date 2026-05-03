export type KokoroAudioEngineHandlers = {
  onEnded?: () => void;
  onError?: () => void;
};

export class KokoroAudioEngine {
  private audio = new Audio();
  private handlers: KokoroAudioEngineHandlers;

  constructor(handlers: KokoroAudioEngineHandlers = {}) {
    this.handlers = handlers;
    this.audio.addEventListener('ended', () => this.handlers.onEnded?.());
    this.audio.addEventListener('error', () => this.handlers.onError?.());
  }

  load(url: string, rate: number): void {
    this.audio.src = url;
    this.audio.playbackRate = rate;
  }

  async play(): Promise<void> {
    await this.audio.play();
  }

  pause(): void {
    this.audio.pause();
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  rewind(seconds = 2): void {
    this.audio.currentTime = Math.max(0, this.audio.currentTime - seconds);
  }

  setRate(rate: number): void {
    this.audio.playbackRate = rate;
  }

  getRate(): number {
    return this.audio.playbackRate;
  }

  getCurrentTime(): number {
    return this.audio.currentTime;
  }
}
