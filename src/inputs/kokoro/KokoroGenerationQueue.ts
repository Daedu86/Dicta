import type { KokoroPhraseChunk } from './kokoPhraseChunking';

export type KokoroQueueState = 'idle' | 'warming-up' | 'ready' | 'generating' | 'depleted' | 'error';

export interface KokoroGenerationRequest {
  chunk: KokoroPhraseChunk;
  voice: string;
  language: string;
  modelVersion?: string;
}

export interface KokoroGenerationResult {
  request: KokoroGenerationRequest;
  audioUrl: string;
  cacheKey: string;
}

export type KokoroGenerator = (request: KokoroGenerationRequest) => Promise<KokoroGenerationResult>;

export class KokoroGenerationQueue {
  private queue: KokoroGenerationRequest[] = [];
  private pending = 0;
  private state: KokoroQueueState = 'idle';
  private generator: KokoroGenerator;
  private minWarmup: number;
  private maxQueue: number;

  constructor(generator: KokoroGenerator, minWarmup = 3, maxQueue = 5) {
    this.generator = generator;
    this.minWarmup = minWarmup;
    this.maxQueue = maxQueue;
  }

  enqueue(request: KokoroGenerationRequest): void {
    if (this.queue.length >= this.maxQueue) {
      return;
    }
    this.queue.push(request);
    this.warmup();
  }

  getState(): KokoroQueueState {
    return this.state;
  }

  getNext(): KokoroGenerationRequest | undefined {
    return this.queue[0];
  }

  async warmup(): Promise<void> {
    if (this.pending > 0) {
      return;
    }

    if (this.queue.length >= this.minWarmup) {
      this.state = 'ready';
    }

    if (this.queue.length === 0) {
      this.state = 'idle';
      return;
    }

    this.state = 'generating';
    const request = this.queue.shift();
    if (!request) {
      this.state = this.queue.length > 0 ? 'ready' : 'idle';
      return;
    }

    this.pending += 1;
    try {
      await this.generator(request);
      this.state = this.queue.length >= this.minWarmup ? 'ready' : 'warming-up';
    } catch {
      this.state = 'error';
    } finally {
      this.pending -= 1;
    }
  }

  dequeue(): KokoroGenerationRequest | undefined {
    const next = this.queue.shift();
    if (!next) {
      this.state = this.queue.length === 0 ? 'depleted' : this.state;
    }
    return next;
  }
}
