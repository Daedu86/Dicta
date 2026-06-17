import type { BrowserTtsPlaybackLoopChunkPlanInput } from './browserTtsPlaybackLoopChunkPlan';
import type { BrowserTtsPlaybackPlan } from './browserTtsPlaybackPlanTypes';
import type {
  BrowserTtsPlaybackAdaptiveContext,
  BrowserTtsPlaybackChunkCallbacks,
  BrowserTtsPlaybackCursorSnapshot,
  BrowserTtsPlaybackMacroPhraseContext,
  BrowserTtsPlaybackProgressContext,
  BrowserTtsPlaybackRunContext,
  BrowserTtsPlaybackTelemetryContext,
  BrowserTtsPlaybackUiContext,
} from './browserTtsPlaybackLoopTypes';

export type SpeakBrowserTtsPlaybackLoopChunkInput = {
  playbackRuntime: BrowserTtsPlaybackRunContext;
  runnerState: {
    cursor: BrowserTtsPlaybackCursorSnapshot;
    macroPhrase: BrowserTtsPlaybackMacroPhraseContext;
  };
  planInput: BrowserTtsPlaybackLoopChunkPlanInput;
  progressContext: BrowserTtsPlaybackProgressContext;
  adaptiveContext: BrowserTtsPlaybackAdaptiveContext;
  telemetryContext: BrowserTtsPlaybackTelemetryContext;
  uiContext: BrowserTtsPlaybackUiContext;
  callbacks: BrowserTtsPlaybackChunkCallbacks;
};

export type SpeakBrowserTtsPlaybackLoopChunkResult =
  | {
      ok: true;
      playbackPlan: BrowserTtsPlaybackPlan;
    }
  | {
      ok: false;
      reason: 'no_playback_plan';
    };
