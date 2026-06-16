import {
  buildBrowserTtsPlaybackStartPlan,
  type BrowserTtsPlaybackStartPlan,
} from './browserTtsPlaybackStartPlan';
import type { BrowserTtsPlaybackLoopOptions } from './browserTtsPlaybackLoopTypes';

type SuccessfulBrowserTtsPlaybackStartPlan = Extract<BrowserTtsPlaybackStartPlan, { ok: true }>;

type BrowserTtsPlaybackLoopStartContextInput = Pick<
  BrowserTtsPlaybackLoopOptions,
  | 'activeSession'
  | 'ttsText'
  | 'ttsLanguage'
  | 'ttsPacingMode'
  | 'buildSemanticPhrasesForCurrentSession'
  | 'resolveActiveBrowserTtsVoice'
  | 'collectBrowserTtsEnvironmentForSession'
> & {
  startWordIndex: number;
};

type BrowserTtsPlaybackLoopStartContext =
  | {
      ok: false;
      error: string;
    }
  | {
      ok: true;
      playbackStartPlan: SuccessfulBrowserTtsPlaybackStartPlan;
      browserTtsVoice: SpeechSynthesisVoice | null;
      browserTtsEnvironment: ReturnType<BrowserTtsPlaybackLoopOptions['collectBrowserTtsEnvironmentForSession']>;
    };

export function createBrowserTtsPlaybackLoopStartContext({
  activeSession,
  ttsText,
  ttsLanguage,
  ttsPacingMode,
  startWordIndex,
  buildSemanticPhrasesForCurrentSession,
  resolveActiveBrowserTtsVoice,
  collectBrowserTtsEnvironmentForSession,
}: BrowserTtsPlaybackLoopStartContextInput): BrowserTtsPlaybackLoopStartContext {
  const playbackStartPlan = buildBrowserTtsPlaybackStartPlan({
    ttsText,
    ttsLanguage,
    ttsPacingMode,
    startWordIndex,
    buildSemanticPhrasesForCurrentSession,
  });

  if (!playbackStartPlan.ok) {
    return {
      ok: false,
      error: 'Paste TTS text before playing.',
    };
  }

  const browserTtsVoice = resolveActiveBrowserTtsVoice();
  const browserTtsEnvironment = collectBrowserTtsEnvironmentForSession(
    activeSession,
    browserTtsVoice,
    browserTtsVoice?.voiceURI ?? activeSession?.ttsVoiceURI ?? null,
  );

  return {
    ok: true,
    playbackStartPlan,
    browserTtsVoice,
    browserTtsEnvironment,
  };
}
