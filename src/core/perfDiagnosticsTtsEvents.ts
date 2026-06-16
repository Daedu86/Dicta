import type { PerfTtsUtterance } from './perfDiagnosticsTypes';
import { now } from './perfDiagnosticsUtils';

export type PerfTtsUtteranceArgs = {
  playId: number;
  chunkIndex: number;
  phraseLengthWords: number;
  phraseLengthChars: number;
  language: string;
  pacingMode: string;
  voiceName?: string;
  voiceURI?: string | null;
  voiceLang?: string;
  voiceResolved?: boolean;
  availableVoiceCount?: number;
  matchingVoiceCount?: number;
};

export function buildPerfTtsUtterance(
  id: number,
  args: PerfTtsUtteranceArgs,
  playClickedAt: number,
): PerfTtsUtterance {
  return {
    id,
    playId: args.playId,
    chunkIndex: args.chunkIndex,
    phraseLengthWords: args.phraseLengthWords,
    phraseLengthChars: args.phraseLengthChars,
    language: args.language,
    pacingMode: args.pacingMode,
    voiceName: args.voiceName,
    voiceURI: args.voiceURI,
    voiceLang: args.voiceLang,
    voiceResolved: args.voiceResolved,
    availableVoiceCount: args.availableVoiceCount,
    matchingVoiceCount: args.matchingVoiceCount,
    playClickedAt,
  };
}

export function recordPerfTtsSpeak(utterance: PerfTtsUtterance): void {
  utterance.speakCalledAt = now();
  utterance.playToSpeakMs = utterance.speakCalledAt - utterance.playClickedAt;
}

export function recordPerfTtsStart(utterance: PerfTtsUtterance): void {
  utterance.onstartAt = now();
  utterance.playToStartMs = utterance.onstartAt - utterance.playClickedAt;
}

export function recordPerfTtsEnd(utterance: PerfTtsUtterance): void {
  utterance.onendAt = now();
  if (utterance.onstartAt !== undefined) {
    utterance.startToEndMs = utterance.onendAt - utterance.onstartAt;
  }
}

export function recordPerfTtsError(utterance: PerfTtsUtterance, error: string): void {
  utterance.errorAt = now();
  utterance.error = error;
}
