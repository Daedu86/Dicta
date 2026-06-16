import type { StoredSession, TtsLanguage } from './sessionTypes';
import type { PerfDiagnostics } from '../core/perfDiagnostics';
import type { TtsPacingMode } from '../types/dictation';
import type { BrowserTtsPlaybackPlan } from './browserTtsPlaybackPlan';
import { configureBrowserTtsUtterance } from './browserTtsUtteranceConfiguration';
import { buildBrowserTtsUtterancePerfMetadata } from './browserTtsUtterancePerfMetadata';

type CreateBrowserTtsPlaybackUtteranceArgs = {
  chunk: BrowserTtsPlaybackPlan['chunk'];
  perfDiagnostics: PerfDiagnostics;
  perfPlayId: string;
  chunkIndex: number;
  ttsLanguage: TtsLanguage;
  pacingMode: TtsPacingMode;
  rate: number;
  browserTtsVoice: SpeechSynthesisVoice | null;
  activeSession: StoredSession | null;
  browserTtsVoices: SpeechSynthesisVoice[];
};

export function createBrowserTtsPlaybackUtterance({
  chunk,
  perfDiagnostics,
  perfPlayId,
  chunkIndex,
  ttsLanguage,
  pacingMode,
  rate,
  browserTtsVoice,
  activeSession,
  browserTtsVoices,
}: CreateBrowserTtsPlaybackUtteranceArgs): {
  utterance: SpeechSynthesisUtterance;
  perfUtteranceId: string;
} {
  const utterance = new SpeechSynthesisUtterance(chunk.text);
  const perfUtteranceId = perfDiagnostics.beginTtsUtterance(
    buildBrowserTtsUtterancePerfMetadata({
      playId: perfPlayId,
      chunkIndex,
      phraseLengthWords: chunk.wordCount,
      phraseLengthChars: chunk.text.length,
      language: ttsLanguage,
      pacingMode,
      voice: browserTtsVoice,
      sessionVoiceURI: activeSession?.ttsVoiceURI ?? null,
      availableVoices: browserTtsVoices,
    }),
  );
  configureBrowserTtsUtterance({
    utterance,
    rate,
    language: ttsLanguage,
    voice: browserTtsVoice,
  });

  return { utterance, perfUtteranceId };
}
