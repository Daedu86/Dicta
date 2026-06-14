import type { TtsPacingMode } from '../types/dictation';
import type { TtsLanguage } from './sessionTypes';

export interface BrowserTtsPerfVoiceInfo {
  lang: string;
  name: string;
  voiceURI: string;
}

export interface BrowserTtsUtterancePerfMetadataInput {
  playId: number;
  chunkIndex: number;
  phraseLengthWords: number;
  phraseLengthChars: number;
  language: TtsLanguage;
  pacingMode: TtsPacingMode;
  voice: BrowserTtsPerfVoiceInfo | null;
  sessionVoiceURI: string | null;
  availableVoices: Array<Pick<BrowserTtsPerfVoiceInfo, 'lang'>>;
}

export interface BrowserTtsUtterancePerfMetadata {
  playId: number;
  chunkIndex: number;
  phraseLengthWords: number;
  phraseLengthChars: number;
  language: TtsLanguage;
  pacingMode: TtsPacingMode;
  voiceName?: string;
  voiceURI: string | null;
  voiceLang?: string;
  voiceResolved: boolean;
  availableVoiceCount: number;
  matchingVoiceCount: number;
}

export function buildBrowserTtsUtterancePerfMetadata({
  playId,
  chunkIndex,
  phraseLengthWords,
  phraseLengthChars,
  language,
  pacingMode,
  voice,
  sessionVoiceURI,
  availableVoices,
}: BrowserTtsUtterancePerfMetadataInput): BrowserTtsUtterancePerfMetadata {
  return {
    playId,
    chunkIndex,
    phraseLengthWords,
    phraseLengthChars,
    language,
    pacingMode,
    voiceName: voice?.name,
    voiceURI: voice?.voiceURI ?? sessionVoiceURI,
    voiceLang: voice?.lang,
    voiceResolved: Boolean(voice),
    availableVoiceCount: availableVoices.length,
    matchingVoiceCount: availableVoices.filter((availableVoice) =>
      availableVoice.lang.toLowerCase().startsWith(language),
    ).length,
  };
}
