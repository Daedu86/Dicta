import { describe, expect, it } from 'vitest';
import {
  buildBrowserTtsPlaybackPlan,
  type BrowserTtsChunkPlanner,
} from '../src/app/browserTtsPlaybackPlan';
import { AdaptiveDictationController } from '../src/core/adaptive/AdaptiveDictationController';
import { resolveBrowserTtsAdaptiveProfile } from '../src/inputs/browserTts/browserTtsAdaptiveProfiles';
import type { PlanBrowserTtsChunkInput } from '../src/inputs/browserTts/ttsDynamicChunkPlanner';
import {
  androidNavigator,
  attempt,
  benchmark,
  chunk,
  decision,
  historyProfile,
  input,
  liveSignal,
  recovery,
} from './helpers/browserTtsPlaybackPlanFixtures';

describe('buildBrowserTtsPlaybackPlan', () => {
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

  it('uses German recovery-safe chunks when strong DE recovery is active', () => {
    const plan = buildBrowserTtsPlaybackPlan(input({
      language: 'de',
      macroWords: 'Wir hoeren den ersten Satz. Danach schreiben wir langsam weiter.'.split(' '),
      liveSignal: liveSignal({ accuracy: 78, lagSec: 3.2, rawLagSec: 3.2, stableLagSec: 3.2 }),
      browserTtsProfile: resolveBrowserTtsAdaptiveProfile('de'),
      browserTtsBenchmark: benchmark('de'),
      browserTtsRecovery: recovery({ active: true, level: 'strong', shortChunkWordCap: 4 }),
      adaptiveController: {
        decide: () => decision({ mode: 'support', reason: 'mode=support, support-needed', nextPhraseSize: 'short' }),
      },
    }));

    expect(plan?.recoverySafeBoundary).toBe(true);
    expect(plan?.chunk.wordCount).toBe(5);
    expect(plan?.chunk.phraseBoundaryType).toBe('sentence');
    expect(plan?.runtimeDecision.reason).toContain('browser-tts-de-recovery-strong');
    expect(plan?.runtimeDecision.pauseAfterPhraseMs).toBeGreaterThanOrEqual(2600);
  });

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

  it('still allows integration with the adaptive controller', () => {
    const controller = new AdaptiveDictationController();
    const plan = buildBrowserTtsPlaybackPlan(input({
      adaptiveController: controller,
      historyProfile: historyProfile({
        recommendedRates: {
          support: 0.75,
          balanced: 0.9,
          flow: 0.98,
        },
      }),
      liveSignal: liveSignal({ accuracy: 96, lagSec: 0.7, rawLagSec: 0.7, stableLagSec: 0.7 }),
      browserTtsBenchmark: benchmark('en', {
        recentAttempts: [attempt({ accuracy: 0.94, wordsPerMinute: 48 })],
      }),
    }));

    expect(plan).not.toBeNull();
    expect(plan?.runtimeDecision.reason).toContain('mode=');
  });
});
