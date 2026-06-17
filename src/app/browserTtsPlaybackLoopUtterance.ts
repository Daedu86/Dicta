import type { StoredSession, TtsLanguage } from './sessionTypes';
import type { PerfDiagnostics } from '../core/perfDiagnostics';
import type { TtsPacingMode } from '../types/dictation';
import type { BrowserTtsPlaybackPlan } from './browserTtsPlaybackPlan';
import { configureBrowserTtsUtterance } from './browserTtsUtteranceConfiguration';
import { buildBrowserTtsUtterancePerfMetadata } from './browserTtsUtterancePerfMetadata';
import { calibrateBrowserTtsVoiceRate } from './browserTtsVoiceCalibration';

type CreateBrowserTtsPlaybackUtteranceArgs = {
  chunk: BrowserTtsPlaybackPlan['chunk'];
  perfDiagnostics: PerfDiagnostics;
  perfPlayId: number;
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
  perfUtteranceId: number;
} {
  const utterance = new SpeechSynthesisUtterance(chunk.text);
  const voiceCalibration = calibrateBrowserTtsVoiceRate({
    requestedRate: rate,
    voice: browserTtsVoice,
    environment: activeSession?.ttsEnvironment ?? null,
  });
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
      voiceCalibration,
    }),
  );
  configureBrowserTtsUtterance({
    utterance,
    rate: voiceCalibration.effectiveRate,
    language: ttsLanguage,
    voice: browserTtsVoice,
  });

  return { utterance, perfUtteranceId };
}
