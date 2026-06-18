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
    expect(plan?.pauseBeforeNextChunkMs).toBe(0);
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

  it('schedules the larger controller pause when V3 boundary buckets would be shorter', () => {
    const boundaryChunk = chunk({
      phraseBoundaryType: 'clause',
      canPauseAfter: true,
      v3Prosody: {
        boundaryStrength: 'clause',
        pauseClass: 'boundary',
        semanticCompletenessClass: 'stable-clause',
        syntacticRisk: 'low',
        edgeWordFlag: false,
        replayStrategy: 'repeat-short',
        breathGroup: {
          startWordIndex: 0,
          endWordIndex: 2,
          wordCount: 3,
          isComplete: true,
        },
      },
    });
    const planner: BrowserTtsChunkPlanner = () => boundaryChunk;

    const plan = buildBrowserTtsPlaybackPlan(input({
      chunkPlanner: planner,
      adaptiveController: {
        decide: () => decision({
          mode: 'support',
          shouldPauseNow: true,
          playbackRate: 0.9,
          replayRate: 0.84,
          pauseAfterPhraseMs: 3200,
        }),
      },
    }));

    expect(plan?.effectivePauseNow).toBe(true);
    expect(plan?.pauseResolution.pauseMs).toBe(3200);
    expect(plan?.pauseBeforeNextChunkMs).toBe(3200);
  });
});
