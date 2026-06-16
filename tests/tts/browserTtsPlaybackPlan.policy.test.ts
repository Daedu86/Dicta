import { describe, expect, it } from 'vitest';
import {
  buildBrowserTtsPlaybackPlan,
  type BrowserTtsChunkPlanner,
} from '../../src/app/browserTtsPlaybackPlan';
import {
  androidNavigator,
  chunk,
  decision,
  input,
  liveSignal,
} from '../helpers/browserTtsPlaybackPlanFixtures';

describe('buildBrowserTtsPlaybackPlan runtime policies', () => {
  it('applies the runtime rate floor', () => {
    const plan = buildBrowserTtsPlaybackPlan(input({
      adaptiveController: {
        decide: () => decision({ mode: 'balanced', playbackRate: 0.5, replayRate: 0.5 }),
      },
    }));

    expect(plan?.runtimeDecision.playbackRate).toBe(0.8);
  });

  it('applies the unsafe-boundary conservative policy', () => {
    const unsafeChunk = chunk({
      text: 'we go to',
      wordCount: 3,
      phraseBoundaryType: 'unsafe',
      canPauseAfter: false,
      semanticCompleteness: 0.35,
    });
    const planner: BrowserTtsChunkPlanner = () => unsafeChunk;

    const plan = buildBrowserTtsPlaybackPlan(input({
      ttsSpeechRate: 0.84,
      chunkPlanner: planner,
      adaptiveController: {
        decide: () => decision({ playbackRate: 1, replayRate: 0.95, pauseAfterPhraseMs: 500 }),
      },
    }));

    expect(plan?.unsafeBoundaryApplied).toBe(true);
    expect(plan?.runtimeDecision.playbackRate).toBe(0.84);
    expect(plan?.runtimeDecision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(1200);
    expect(plan?.runtimeDecision.reason).toContain('unsafe-boundary-conservative');
    expect(plan?.chunkTelemetry.unsafeChunkCount).toBe(1);
  });

  it('applies the Android mobile pacing fallback path', () => {
    const plan = buildBrowserTtsPlaybackPlan(input({
      liveSignal: liveSignal({ accuracy: 86, lagSec: 2.1, rawLagSec: 2.1, stableLagSec: 2.1 }),
      navigatorInfo: androidNavigator,
      adaptiveController: {
        decide: () => decision({ playbackRate: 1, replayRate: 0.95, pauseAfterPhraseMs: 750 }),
      },
    }));

    expect(plan?.mobileFallbackApplied).toBe(true);
    expect(plan?.runtimeDecision.nextPhraseSize).toBe('short');
    expect(plan?.runtimeDecision.shouldPauseNow).toBe(true);
    expect(plan?.runtimeDecision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(1600);
  });
});
