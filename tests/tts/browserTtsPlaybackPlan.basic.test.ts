import { describe, expect, it } from 'vitest';
import {
  buildBrowserTtsPlaybackPlan,
  type BrowserTtsChunkPlanner,
} from '../../src/app/browserTtsPlaybackPlan';
import type { PlanBrowserTtsChunkInput } from '../../src/inputs/browserTts/ttsDynamicChunkPlanner';
import { chunk, input } from '../helpers/browserTtsPlaybackPlanFixtures';

describe('buildBrowserTtsPlaybackPlan basic planning', () => {
  it('builds a normal chunk plan from word 0', () => {
    const plan = buildBrowserTtsPlaybackPlan(input());

    expect(plan).not.toBeNull();
    expect(plan?.chunk.startWordIndex).toBe(0);
    expect(plan?.chunk.wordCount).toBeGreaterThan(0);
    expect(plan?.runtimeDecision.playbackRate).toBe(0.95);
    expect(plan?.pacingMode).toBe('balanced');
    expect(plan?.browserTelemetry.phraseId).toBe('tts-0');
    expect(plan?.chunkTelemetry.phraseId).toBe('tts-0-chunk');
  });

  it('falls back to a short phrase candidate when the primary candidate is null', () => {
    const calls: PlanBrowserTtsChunkInput[] = [];
    const fallbackChunk = chunk({ text: 'Short fallback.', wordCount: 2 });
    const planner: BrowserTtsChunkPlanner = (plannerInput) => {
      calls.push(plannerInput);
      if (calls.length === 1) return null;
      if (calls.length === 2) return fallbackChunk;
      return null;
    };

    const plan = buildBrowserTtsPlaybackPlan(input({ chunkPlanner: planner }));

    expect(plan?.candidateChunk).toBe(fallbackChunk);
    expect(plan?.chunk).toBe(fallbackChunk);
    expect(calls[0].nextPhraseSize).toBe('medium');
    expect(calls[1].nextPhraseSize).toBe('short');
    expect(calls[1].boundaryStrictness).toBe('phrase');
  });
});
