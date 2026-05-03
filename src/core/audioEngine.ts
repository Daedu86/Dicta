export class AudioEngine {
  private readonly audio: HTMLAudioElement;

  constructor(audio: HTMLAudioElement) {
    this.audio = audio;
  }

  load(url: string): void {
    this.audio.src = url;
    this.audio.load();
  }

  play(): Promise<void> {
    return this.audio.play();
  }

  pause(): void {
    this.audio.pause();
  }

  reset(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio.playbackRate = 1;
  }

  seek(timeSec: number): void {
    this.audio.currentTime = Math.max(0, timeSec);
  }

  getCurrentTime(): number {
    return this.audio.currentTime;
  }

  getDuration(): number {
    return Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
  }

  setRate(rate: number): void {
    this.audio.playbackRate = rate;
  }

  getRate(): number {
    return this.audio.playbackRate;
  }

  isPaused(): boolean {
    return this.audio.paused;
  }
}
