import type { TtsPacingMode } from '../types/dictation';
import type { TtsLanguage } from './sessionTypes';
import type { BrowserTtsVoiceCalibrationResult } from './browserTtsVoiceCalibration';

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
  voiceCalibration?: BrowserTtsVoiceCalibrationResult;
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
  requestedRate?: number;
  effectiveRate?: number;
  estimatedWordsPerMinute?: number;
  voiceCalibrationStatus?: BrowserTtsVoiceCalibrationResult['calibrationStatus'];
  voiceRateLimited?: boolean;
  voiceCalibrationReasonCodes?: string[];
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
  voiceCalibration,
}: BrowserTtsUtterancePerfMetadataInput): BrowserTtsUtterancePerfMetadata {
  return {
    playId,
    chunkIndex,
    phraseLengthWords,
    phraseLengthChars,
    language,
    pacingMode,
    voiceName: voiceCalibration?.voiceName ?? voice?.name,
    voiceURI: voiceCalibration?.voiceURI ?? voice?.voiceURI ?? sessionVoiceURI,
    voiceLang: voiceCalibration?.voiceLang ?? voice?.lang,
    voiceResolved: Boolean(voice),
    availableVoiceCount: availableVoices.length,
    matchingVoiceCount: availableVoices.filter((availableVoice) =>
      availableVoice.lang.toLowerCase().startsWith(language),
    ).length,
    requestedRate: voiceCalibration?.requestedRate,
    effectiveRate: voiceCalibration?.effectiveRate,
    estimatedWordsPerMinute: voiceCalibration?.estimatedWordsPerMinute,
    voiceCalibrationStatus: voiceCalibration?.calibrationStatus,
    voiceRateLimited: voiceCalibration?.rateLimited,
    voiceCalibrationReasonCodes: voiceCalibration?.reasonCodes,
  };
}
